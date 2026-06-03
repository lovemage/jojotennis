import "server-only";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebaseAdmin";
import { exchangeLineCodeForToken, getLineEmailFromIdToken, getLineProfile } from "@/lib/lineAuth";
import { getSupabaseServiceClient, hasSupabaseConfig } from "@/lib/supabase";

const LINE_STATE_COOKIE = "line_oauth_state";

function getAuthRedirectUrl(request: Request) {
  return new URL("/login", process.env.APP_BASE_URL ?? request.url);
}

export async function handleLineCallback(request: Request) {
  const redirectUrl = getAuthRedirectUrl(request);

  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const expectedState = cookies().get(LINE_STATE_COOKIE)?.value;

    if (!code) throw new Error("Missing LINE code");
    if (!state || !expectedState || state !== expectedState) {
      throw new Error("Invalid LINE login state");
    }

    const token = await exchangeLineCodeForToken(code, request.url);
    const profile = await getLineProfile(token.access_token);
    const uid = `line_${profile.userId}`;
    const email = getLineEmailFromIdToken(token.id_token);
    const customToken = await getAdminAuth().createCustomToken(uid, { provider: "line" });

    await getAdminFirestore()
      .collection("users")
      .doc(uid)
      .set(
        {
          uid,
          email,
          nickname: profile.displayName,
          avatarUrl: profile.pictureUrl ?? "",
          provider: "line",
          emailVerified: Boolean(email),
          ntrp: "2.0",
          region: "台北市",
          yearsPlaying: 0,
          role: "user",
          isActive: true,
          heartsReceived: 0,
          bio: "",
          isDeleted: false,
          deletedAt: null,
          updatedAt: new Date(),
          createdAt: new Date(),
        },
        { merge: true },
      );

    if (hasSupabaseConfig() && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = getSupabaseServiceClient();
      await supabase.from("users").upsert({
        uid,
        email,
        nickname: profile.displayName,
        avatar_url: profile.pictureUrl ?? "",
        provider: "line",
        email_verified: Boolean(email),
        role: "user",
        is_active: true,
        updated_at: new Date().toISOString(),
      });
    }

    redirectUrl.searchParams.set("lineToken", customToken);
    if (!email) redirectUrl.searchParams.set("requiresEmail", "1");
  } catch (error) {
    redirectUrl.searchParams.set("error", error instanceof Error ? error.message : "LINE login failed");
  }

  const response = NextResponse.redirect(redirectUrl);
  response.cookies.delete(LINE_STATE_COOKIE);
  return response;
}
