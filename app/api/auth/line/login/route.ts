import { NextResponse } from "next/server";
import { getLineLoginUrl } from "@/lib/lineAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const state = crypto.randomUUID();
  const nonce = crypto.randomUUID();
  const response = NextResponse.redirect(getLineLoginUrl(state, nonce));
  response.cookies.set("line_oauth_state", state, { httpOnly: true, sameSite: "lax", maxAge: 600, path: "/" });
  return response;
}
