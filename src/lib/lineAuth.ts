import "server-only";

const LINE_AUTH_URL = "https://access.line.me/oauth2/v2.1/authorize";
const LINE_TOKEN_URL = "https://api.line.me/oauth2/v2.1/token";
const LINE_PROFILE_URL = "https://api.line.me/v2/profile";

export function getLineLoginUrl(state: string, nonce: string) {
  const channelId = process.env.LINE_LOGIN_CHANNEL_ID;
  const baseUrl = process.env.APP_BASE_URL;
  if (!channelId || !baseUrl) throw new Error("Missing LINE_LOGIN_CHANNEL_ID or APP_BASE_URL");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: channelId,
    redirect_uri: `${baseUrl}/api/auth/line/callback`,
    state,
    scope: "profile openid email",
    nonce,
  });
  return `${LINE_AUTH_URL}?${params.toString()}`;
}

export async function exchangeLineCodeForToken(code: string) {
  const channelId = process.env.LINE_LOGIN_CHANNEL_ID;
  const channelSecret = process.env.LINE_LOGIN_CHANNEL_SECRET;
  const baseUrl = process.env.APP_BASE_URL;
  if (!channelId || !channelSecret || !baseUrl) throw new Error("Missing LINE env vars");

  const response = await fetch(LINE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: `${baseUrl}/api/auth/line/callback`,
      client_id: channelId,
      client_secret: channelSecret,
    }),
  });
  if (!response.ok) throw new Error("LINE token exchange failed");
  return (await response.json()) as { access_token: string; id_token?: string };
}

export async function getLineProfile(accessToken: string) {
  const response = await fetch(LINE_PROFILE_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error("LINE profile fetch failed");
  return (await response.json()) as { userId: string; displayName: string; pictureUrl?: string };
}
