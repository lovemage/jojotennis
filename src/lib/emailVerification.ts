import "server-only";

import crypto from "crypto";

type EmailVerificationPayload = {
  uid: string;
  email: string;
  exp: number;
};

function getSecret() {
  const secret =
    process.env.EMAIL_VERIFICATION_SECRET ||
    process.env.UNSUBSCRIBE_TOKEN_SECRET ||
    process.env.LINE_LOGIN_CHANNEL_SECRET;
  if (!secret) throw new Error("Missing EMAIL_VERIFICATION_SECRET");
  return secret;
}

function base64url(input: string) {
  return Buffer.from(input, "utf8").toString("base64url");
}

function sign(payload: string) {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

export function createEmailVerificationToken(uid: string, email: string) {
  const payload = base64url(
    JSON.stringify({
      uid,
      email,
      exp: Date.now() + 1000 * 60 * 60 * 24,
    } satisfies EmailVerificationPayload),
  );
  return `${payload}.${sign(payload)}`;
}

export function verifyEmailVerificationToken(token: string) {
  const [payload, signature] = token.split(".");
  if (!payload || !signature || sign(payload) !== signature) {
    throw new Error("Invalid verification token");
  }

  const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as EmailVerificationPayload;
  if (!decoded.uid || !decoded.email || decoded.exp < Date.now()) {
    throw new Error("Expired verification token");
  }
  return decoded;
}
