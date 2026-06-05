import "server-only";

import crypto from "crypto";

const LINE_SESSION_COOKIE = "jojo_line_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

type LineSessionPayload = {
  uid: string;
  email: string;
  exp: number;
};

function getLineSessionSecret() {
  const secret =
    process.env.LINE_SESSION_SECRET ||
    process.env.EMAIL_VERIFICATION_SECRET ||
    process.env.UNSUBSCRIBE_TOKEN_SECRET ||
    process.env.LINE_LOGIN_CHANNEL_SECRET;
  if (!secret) throw new Error("Missing LINE_SESSION_SECRET");
  return secret;
}

function base64UrlEncode(input: string) {
  return Buffer.from(input, "utf8").toString("base64url");
}

function base64UrlDecode(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function sign(payload: string) {
  return crypto.createHmac("sha256", getLineSessionSecret()).update(payload).digest("base64url");
}

export function createLineSessionToken(uid: string, email: string) {
  const payload = base64UrlEncode(
    JSON.stringify({
      uid,
      email,
      exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
    } satisfies LineSessionPayload),
  );
  return `${payload}.${sign(payload)}`;
}

export function verifyLineSessionToken(token?: string | null): LineSessionPayload | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const decoded = JSON.parse(base64UrlDecode(payload)) as LineSessionPayload;
    if (!decoded.uid?.startsWith("line_")) return null;
    if (typeof decoded.exp !== "number" || decoded.exp < Math.floor(Date.now() / 1000)) return null;
    return { uid: decoded.uid, email: decoded.email || "", exp: decoded.exp };
  } catch {
    return null;
  }
}

export { LINE_SESSION_COOKIE, SESSION_MAX_AGE_SECONDS };
