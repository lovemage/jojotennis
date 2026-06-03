import { NextResponse } from "next/server";
import { getLineLoginUrl } from "@/lib/lineAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const state = crypto.randomUUID();
    const nonce = crypto.randomUUID();
    const response = NextResponse.redirect(getLineLoginUrl(state, nonce, request.url));
    response.cookies.set("line_oauth_state", state, { httpOnly: true, sameSite: "lax", maxAge: 600, path: "/" });
    return response;
  } catch (error) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("error", error instanceof Error ? error.message : "LINE login failed");
    return NextResponse.redirect(redirectUrl);
  }
}
