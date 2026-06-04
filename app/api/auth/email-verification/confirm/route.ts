import { NextResponse } from "next/server";
import { verifyEmailVerificationToken } from "@/lib/emailVerification";
import { getAdminAuth } from "@/lib/firebaseAdmin";
import { getSupabaseServiceClient, hasSupabaseConfig } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const appUrl = process.env.APP_BASE_URL ?? request.url;
  const redirectUrl = new URL("/login", appUrl);

  try {
    const url = new URL(request.url);
    const token = url.searchParams.get("token");
    if (!token) throw new Error("Missing token");

    const { uid, email } = verifyEmailVerificationToken(token);
    await getAdminAuth().updateUser(uid, { email, emailVerified: true });

    const now = new Date();

    if (hasSupabaseConfig() && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      await getSupabaseServiceClient()
        .from("users")
        .update({
          email,
          email_verified: true,
          updated_at: now.toISOString(),
        })
        .eq("uid", uid);
    }

    redirectUrl.searchParams.set("emailVerified", "1");
  } catch (error) {
    redirectUrl.searchParams.set("error", error instanceof Error ? error.message : "Email verification failed");
  }

  return NextResponse.redirect(redirectUrl);
}
