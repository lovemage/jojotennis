import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/emailClient";
import BroadcastEmail from "@/emails/Broadcast";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebaseAdmin";
import { SUPER_ADMIN_EMAILS } from "@/lib/config";

export const runtime = "nodejs";

const CONCURRENCY = 5;

async function isAdminCaller(request: Request) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return false;
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    const email = (decoded.email || "").toLowerCase();
    if (email && SUPER_ADMIN_EMAILS.map((e) => e.toLowerCase()).includes(email)) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

type BroadcastBody = {
  subject?: string;
  body?: string;
  recipient?: "all" | { email: string };
};

async function sendOne(to: string, subject: string, body: string, uid?: string) {
  await sendEmail({
    to,
    toUid: uid,
    subject,
    template: "broadcast",
    react: BroadcastEmail({ subject, body }),
    meta: { broadcast: true },
  });
}

async function listActiveUserEmails(): Promise<Array<{ email: string; uid: string }>> {
  const snap = await getAdminFirestore().collection("users").get();
  const results: Array<{ email: string; uid: string }> = [];
  snap.docs.forEach((doc) => {
    const data = doc.data() as { email?: string; isActive?: boolean };
    if (data.isActive === false) return;
    if (!data.email) return;
    results.push({ email: data.email, uid: doc.id });
  });
  return results;
}

export async function POST(request: Request) {
  if (!(await isAdminCaller(request))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as BroadcastBody;
  const subject = (body.subject ?? "").trim();
  const messageBody = (body.body ?? "").trim();
  if (!subject || !messageBody) {
    return NextResponse.json({ error: "Missing subject or body" }, { status: 400 });
  }

  const errors: string[] = [];
  let sent = 0;
  let failed = 0;

  if (body.recipient && typeof body.recipient === "object" && body.recipient.email) {
    try {
      await sendOne(body.recipient.email, subject, messageBody);
      sent += 1;
    } catch (error) {
      failed += 1;
      errors.push(error instanceof Error ? error.message : String(error));
    }
    return NextResponse.json({ sent, failed, errors });
  }

  if (body.recipient !== "all") {
    return NextResponse.json({ error: "Invalid recipient" }, { status: 400 });
  }

  const recipients = await listActiveUserEmails();
  for (let i = 0; i < recipients.length; i += CONCURRENCY) {
    const batch = recipients.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map((row) => sendOne(row.email, subject, messageBody, row.uid)),
    );
    for (const result of results) {
      if (result.status === "fulfilled") sent += 1;
      else {
        failed += 1;
        errors.push(
          result.reason instanceof Error ? result.reason.message : String(result.reason),
        );
      }
    }
  }

  return NextResponse.json({ sent, failed, errors: errors.slice(0, 20) });
}
