import "server-only";

import { cookies } from "next/headers";
import { SUPER_ADMIN_EMAILS } from "@/lib/config";
import { getAdminAuth } from "@/lib/firebaseAdmin";
import { LINE_SESSION_COOKIE, verifyLineSessionToken } from "@/lib/lineSession";
import { getSupabaseServiceClient, hasSupabaseConfig } from "@/lib/supabase";

type AuthOk = {
  ok: true;
  uid: string;
  email: string;
};

type AuthError = {
  ok: false;
  status: number;
  error: string;
};

export type ServerAuthResult = AuthOk | AuthError;

async function verifyFirebaseTokenWithRest(token: string) {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) throw new Error("Missing NEXT_PUBLIC_FIREBASE_API_KEY");

  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken: token }),
  });
  if (!response.ok) throw new Error(`Firebase Auth REST failed: ${response.status}`);

  const data = (await response.json()) as { users?: Array<{ localId?: string; email?: string }> };
  const user = data.users?.[0];
  if (!user?.localId) throw new Error("Firebase Auth REST returned no user");
  return { uid: user.localId, email: user.email ?? "" };
}

export async function requireUser(request: Request): Promise<ServerAuthResult> {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (!token) {
    const lineSession = verifyLineSessionToken(cookies().get(LINE_SESSION_COOKIE)?.value);
    if (lineSession) return { ok: true, uid: lineSession.uid, email: lineSession.email };
    return { ok: false, status: 401, error: "Missing token" };
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    return { ok: true, uid: decoded.uid, email: decoded.email ?? "" };
  } catch {
    try {
      return { ok: true, ...(await verifyFirebaseTokenWithRest(token)) };
    } catch {
      return { ok: false, status: 401, error: "Invalid token" };
    }
  }
}

export async function isAdminUser(uid: string, email: string) {
  const normalized = email.trim().toLowerCase();
  if (SUPER_ADMIN_EMAILS.map((item) => item.toLowerCase()).includes(normalized)) return true;
  if (!hasSupabaseConfig() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return false;

  const { data } = await getSupabaseServiceClient()
    .from("users")
    .select("role")
    .eq("uid", uid)
    .eq("is_deleted", false)
    .maybeSingle();
  return data?.role === "admin";
}

export async function requireAdmin(request: Request): Promise<ServerAuthResult> {
  const auth = await requireUser(request);
  if (!auth.ok) return auth;
  if (!(await isAdminUser(auth.uid, auth.email))) {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  return auth;
}
