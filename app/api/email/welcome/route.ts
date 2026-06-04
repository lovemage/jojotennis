import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/emailClient";
import WelcomeEmail, { WELCOME_TEMPLATE_DEFAULTS } from "@/emails/Welcome";
import { getAdminAuth } from "@/lib/firebaseAdmin";
import { SUPER_ADMIN_EMAILS } from "@/lib/config";

export const runtime = "nodejs";

async function verifyCaller(request: Request, expectedUid: string) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return { ok: false as const, status: 401, error: "Missing token" };
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    if (decoded.uid === expectedUid) return { ok: true as const, decoded };
    const email = (decoded.email || "").toLowerCase();
    if (email && SUPER_ADMIN_EMAILS.map((e) => e.toLowerCase()).includes(email)) {
      return { ok: true as const, decoded };
    }
    return { ok: false as const, status: 403, error: "Forbidden" };
  } catch {
    return { ok: false as const, status: 401, error: "Invalid token" };
  }
}

export async function POST(request: Request) {
  const body = (await request.json()) as { uid?: string; nickname?: string };
  if (!body.uid)
    return NextResponse.json({ error: "Missing uid" }, { status: 400 });

  const auth = await verifyCaller(request, body.uid);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const targetUid = body.uid;
  const adminAuth = getAdminAuth();
  let targetEmail = "";
  let targetNickname = body.nickname;
  try {
    const userRecord = await adminAuth.getUser(targetUid);
    targetEmail = (userRecord.email || "").trim();
    if (!targetNickname) {
      targetNickname = userRecord.displayName || undefined;
    }
  } catch {
    return NextResponse.json({ error: "Target user not found" }, { status: 404 });
  }
  if (!targetEmail) {
    return NextResponse.json({ error: "Target user has no email" }, { status: 400 });
  }

  const template = { ...WELCOME_TEMPLATE_DEFAULTS };

  await sendEmail({
    to: targetEmail,
    toUid: targetUid,
    subject: template.subject,
    template: "welcome",
    react: WelcomeEmail({
      nickname: targetNickname,
      appUrl: process.env.APP_BASE_URL ?? "https://jojotennis.com",
      subject: template.subject,
      greeting: template.greeting,
      body: template.body,
      ctaLabel: template.ctaLabel,
    }),
    meta: { nickname: targetNickname },
  });
  return NextResponse.json({ ok: true });
}
