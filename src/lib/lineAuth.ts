import "server-only";

const LINE_AUTH_URL = "https://access.line.me/oauth2/v2.1/authorize";
const LINE_TOKEN_URL = "https://api.line.me/oauth2/v2.1/token";
const LINE_PROFILE_URL = "https://api.line.me/v2/profile";
const LINE_CALLBACK_PATH = "/callback";

function getLineRedirectUri(baseUrl: string) {
  const configuredRedirectUri = process.env.LINE_LOGIN_REDIRECT_URI?.trim();
  if (configuredRedirectUri) return configuredRedirectUri;
  return new URL(LINE_CALLBACK_PATH, baseUrl).toString();
}

function getLineBaseUrl(fallbackUrl?: string) {
  const baseUrl = process.env.APP_BASE_URL?.trim() || fallbackUrl;
  if (!baseUrl) throw new Error("Missing APP_BASE_URL");
  return new URL(baseUrl).origin;
}

export function getLineLoginUrl(state: string, nonce: string, fallbackUrl?: string) {
  const channelId = process.env.LINE_LOGIN_CHANNEL_ID;
  const baseUrl = getLineBaseUrl(fallbackUrl);
  if (!channelId) throw new Error("Missing LINE_LOGIN_CHANNEL_ID");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: channelId,
    redirect_uri: getLineRedirectUri(baseUrl),
    state,
    scope: "profile openid email",
    nonce,
  });
  return `${LINE_AUTH_URL}?${params.toString()}`;
}

export async function exchangeLineCodeForToken(code: string, fallbackUrl?: string) {
  const channelId = process.env.LINE_LOGIN_CHANNEL_ID;
  const channelSecret = process.env.LINE_LOGIN_CHANNEL_SECRET;
  const baseUrl = getLineBaseUrl(fallbackUrl);
  if (!channelId || !channelSecret) throw new Error("Missing LINE env vars");

  const response = await fetch(LINE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: getLineRedirectUri(baseUrl),
      client_id: channelId,
      client_secret: channelSecret,
    }),
  });
  if (!response.ok) throw new Error("LINE token exchange failed");
  return (await response.json()) as { access_token: string; id_token?: string };
}

export function getLineEmailFromIdToken(idToken?: string) {
  if (!idToken) return "";
  const payload = idToken.split(".")[1];
  if (!payload) return "";

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(Buffer.from(normalized, "base64").toString("utf8")) as {
      email?: string;
    };
    return typeof decoded.email === "string" ? decoded.email : "";
  } catch {
    return "";
  }
}

export async function getLineProfile(accessToken: string) {
  const response = await fetch(LINE_PROFILE_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error("LINE profile fetch failed");
  return (await response.json()) as { userId: string; displayName: string; pictureUrl?: string };
}
