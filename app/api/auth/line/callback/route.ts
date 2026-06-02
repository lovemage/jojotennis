import { NextResponse } from "next/server";
import { exchangeLineCodeForToken, getLineProfile } from "@/lib/lineAuth";
import { getAdminAuth } from "@/lib/firebaseAdmin";
import { getSupabaseServiceClient, hasSupabaseConfig } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    if (!code) throw new Error("Missing LINE code");

    const token = await exchangeLineCodeForToken(code);
    const profile = await getLineProfile(token.access_token);
    const uid = `line_${profile.userId}`;
    const customToken = await getAdminAuth().createCustomToken(uid, { provider: "line" });

    if (hasSupabaseConfig() && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = getSupabaseServiceClient();
      await supabase.from("users").upsert({
        uid,
        email: "",
        nickname: profile.displayName,
        avatar_url: profile.pictureUrl ?? "",
        provider: "line",
        role: "user",
        is_active: true,
        updated_at: new Date().toISOString(),
      });
    }

    const redirectUrl = new URL("/auth", process.env.APP_BASE_URL ?? request.url);
    redirectUrl.searchParams.set("lineToken", customToken);
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    const redirectUrl = new URL("/auth", process.env.APP_BASE_URL ?? request.url);
    redirectUrl.searchParams.set("error", error instanceof Error ? error.message : "LINE login failed");
    return NextResponse.redirect(redirectUrl);
  }
}
