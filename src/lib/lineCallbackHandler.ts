import "server-only";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { exchangeLineCodeForToken, getLineEmailFromIdToken, getLineProfile } from "@/lib/lineAuth";
import { LINE_SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, createLineSessionToken } from "@/lib/lineSession";
import { getSupabaseServiceClient, hasSupabaseConfig } from "@/lib/supabase";

const LINE_STATE_COOKIE = "line_oauth_state";

function getAuthRedirectUrl(request: Request) {
  return new URL("/login", process.env.APP_BASE_URL ?? request.url);
}

export async function handleLineCallback(request: Request) {
  const redirectUrl = getAuthRedirectUrl(request);
  let lineSessionToken: string | null = null;

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

    lineSessionToken = createLineSessionToken(uid, email);
    redirectUrl.searchParams.set("lineSession", "1");
    if (!email) redirectUrl.searchParams.set("requiresEmail", "1");
  } catch (error) {
    redirectUrl.searchParams.set("error", error instanceof Error ? error.message : "LINE login failed");
  }

  const response = NextResponse.redirect(redirectUrl);
  if (lineSessionToken && !redirectUrl.searchParams.has("error")) {
    response.cookies.set(LINE_SESSION_COOKIE, lineSessionToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: "/",
    });
  }
  response.cookies.delete(LINE_STATE_COOKIE);
  return response;
}
