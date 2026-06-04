import { NextResponse } from "next/server";
import { Rest } from "ably";
import { getAdminAuth } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

type VerifyOkResult = {
  ok: true;
  uid: string;
};

type VerifyFailResult = {
  ok: false;
  status: 401 | 400;
  error: string;
};

async function verifyFirebaseTokenWithRest(token: string) {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) throw new Error("Missing NEXT_PUBLIC_FIREBASE_API_KEY");

  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken: token }),
  });

  if (!response.ok) {
    throw new Error(`Firebase Auth REST failed: ${response.status}`);
  }

  const data = (await response.json()) as {
    users?: Array<{ localId?: string; email?: string }>;
  };

  const user = data.users?.[0];
  if (!user?.localId) {
    throw new Error("Firebase Auth REST returned no user");
  }

  return { uid: user.localId, email: user.email ?? "" };
}

async function verifyUser(request: Request): Promise<VerifyOkResult | VerifyFailResult> {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return { ok: false, status: 401, error: "Missing token" };

  try {
    const verified = await getAdminAuth().verifyIdToken(token);
    return { ok: true, uid: verified.uid };
  } catch (adminError) {
    try {
      const fallback = await verifyFirebaseTokenWithRest(token);
      return { ok: true, uid: fallback.uid };
    } catch {
      console.warn("[chat/ably/token] token verification failed:", adminError);
      return { ok: false, status: 401, error: "Invalid token" };
    }
  }
}

export async function POST(request: Request) {
  const auth = await verifyUser(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const ablyApiKey = process.env.ABLY_API_KEY;
  if (!ablyApiKey) {
    return NextResponse.json({ error: "Missing ABLY_API_KEY" }, { status: 500 });
  }

  const prefix = process.env.NEXT_PUBLIC_ABLY_CHANNEL_PREFIX ?? "chat";
  const ably = new Rest({ key: ablyApiKey });
  const tokenRequest = await ably.auth.createTokenRequest({
    clientId: auth.uid,
    capability: JSON.stringify({
      [`${prefix}:*`]: ["subscribe", "publish"],
    }),
    ttl: 3600 * 1000,
  });

  return NextResponse.json(tokenRequest);
}
