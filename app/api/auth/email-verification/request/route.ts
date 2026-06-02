import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/emailClient";
import { createEmailVerificationToken } from "@/lib/emailVerification";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebaseAdmin";
import { getSupabaseServiceClient, hasSupabaseConfig } from "@/lib/supabase";
import EmailVerificationEmail from "@/emails/EmailVerification";

export const runtime = "nodejs";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function verifyCaller(request: Request) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;
  try {
    return await getAdminAuth().verifyIdToken(token);
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const decoded = await verifyCaller(request);
  if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as { email?: string; provider?: "google" | "line" | "password" };
  const email = (body.email ?? "").trim().toLowerCase();
  if (!isValidEmail(email)) return NextResponse.json({ error: "Invalid email" }, { status: 400 });

  const uid = decoded.uid;
  const userRecord = await getAdminAuth().getUser(uid);
  const provider =
    body.provider ??
    (decoded.provider as "google" | "line" | "password" | undefined) ??
    (uid.startsWith("line_") ? "line" : "google");
  const nickname = userRecord.displayName || "新球友";
  const now = new Date();

  await getAdminAuth().updateUser(uid, { email, emailVerified: false });
  await getAdminFirestore().collection("users").doc(uid).set(
    {
      uid,
      email,
      provider,
      emailVerified: false,
      emailVerificationSentAt: now,
      updatedAt: now,
    },
    { merge: true },
  );

  if (hasSupabaseConfig() && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    await getSupabaseServiceClient()
      .from("users")
      .update({
        email,
        provider,
        email_verified: false,
        email_verification_sent_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq("uid", uid);
  }

  const token = createEmailVerificationToken(uid, email);
  const verifyUrl = new URL("/api/auth/email-verification/confirm", process.env.APP_BASE_URL ?? request.url);
  verifyUrl.searchParams.set("token", token);

  await sendEmail({
    to: email,
    toUid: uid,
    subject: "請驗證你的 JoJo Tennis Email",
    template: "email_verification",
    react: EmailVerificationEmail({ nickname, verifyUrl: verifyUrl.toString() }),
    meta: { provider },
  });

  return NextResponse.json({ ok: true });
}
