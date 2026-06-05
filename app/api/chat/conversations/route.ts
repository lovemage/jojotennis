import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SUPER_ADMIN_EMAILS } from "@/lib/config";
import { getSupabaseServiceClient } from "@/lib/supabase";
import { LINE_SESSION_COOKIE, verifyLineSessionToken } from "@/lib/lineSession";
import {
  addRedisConversationParticipant,
  deleteRedisConversation,
  getRedisConversation,
  listAllRedisConversations,
  listRedisConversationsForUser,
  markRedisConversationRead,
  removeRedisConversationParticipant,
  upsertRedisConversation,
} from "@/lib/upstashChat";

export const runtime = "nodejs";

function isAblyChatMode() {
  return (process.env.NEXT_PUBLIC_CHAT_REALTIME_PROVIDER ?? "ably") === "ably";
}

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

async function verifyUser(request: Request) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) {
    const lineSession = verifyLineSessionToken(cookies().get(LINE_SESSION_COOKIE)?.value);
    if (lineSession) return { ok: true as const, uid: lineSession.uid, email: lineSession.email };
    return { ok: false as const, status: 401, error: "Missing token" };
  }
  try {
    const user = await verifyFirebaseTokenWithRest(token);
    return { ok: true as const, ...user };
  } catch {
    return { ok: false as const, status: 401, error: "Invalid token" };
  }
}

async function isAdminEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  if (SUPER_ADMIN_EMAILS.map((item) => item.toLowerCase()).includes(normalized)) return true;
  const { data } = await getSupabaseServiceClient()
    .from("users")
    .select("role")
    .eq("email", normalized)
    .eq("is_deleted", false)
    .maybeSingle();
  return data?.role === "admin";
}

export async function GET(request: Request) {
  const auth = await verifyUser(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url = new URL(request.url);
  const admin = url.searchParams.get("admin") === "1";
  if (admin && !(await isAdminEmail(auth.email))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (isAblyChatMode()) {
    return NextResponse.json({ conversations: [] });
  }

  try {
    const conversations = admin
      ? await listAllRedisConversations()
      : await listRedisConversationsForUser(auth.uid);
    return NextResponse.json({ conversations });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("max requests limit exceeded")) {
      console.error("[chat/conversations] Upstash rate limit:", message);
      return NextResponse.json({ error: message }, { status: 429 });
    }
    console.error("[chat/conversations] 讀取失敗:", message);
    return NextResponse.json({ error: "聊天室會話清單讀取失敗" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await verifyUser(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = (await request.json().catch(() => ({}))) as {
    action?: "upsert" | "addParticipant" | "removeParticipant" | "markRead";
    convId?: string;
    type?: "direct" | "match" | "club";
    participants?: string[];
    relatedId?: string;
    name?: string;
    status?: string;
    ownerUid?: string;
    uid?: string;
  };

  const convId = body.convId?.trim();
  if (!convId) return NextResponse.json({ error: "Missing convId" }, { status: 400 });

  if (isAblyChatMode()) {
    if (body.action === "upsert" || !body.action) {
      return NextResponse.json({
        conversation: {
          convId,
          type: body.type ?? "match",
          participants: Array.from(new Set([...(body.participants ?? []), auth.uid].filter(Boolean))),
          relatedId: body.relatedId,
          name: body.name ?? "聊天室",
          lastMessage: "",
          lastSenderNickname: "",
          updatedAt: Date.now(),
          unreadCount: 0,
          status: body.status,
          ownerUid: body.ownerUid,
        },
      });
    }
    return NextResponse.json({ ok: true });
  }

  if (body.action === "addParticipant") {
    if (!body.uid) return NextResponse.json({ error: "Missing uid" }, { status: 400 });
    await addRedisConversationParticipant(convId, body.uid);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "removeParticipant") {
    if (!body.uid) return NextResponse.json({ error: "Missing uid" }, { status: 400 });
    await removeRedisConversationParticipant(convId, body.uid);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "markRead") {
    await markRedisConversationRead(convId, auth.uid);
    return NextResponse.json({ ok: true });
  }

  if (!body.type || !body.name) {
    return NextResponse.json({ error: "Missing conversation fields" }, { status: 400 });
  }

  const existing = await getRedisConversation(convId);
  const participants = Array.from(new Set([...(existing?.participants ?? []), ...(body.participants ?? []), auth.uid].filter(Boolean)));
  const conversation = await upsertRedisConversation({
    convId,
    type: body.type,
    participants,
    relatedId: body.relatedId,
    name: body.name,
    status: body.status,
    ownerUid: body.ownerUid,
  });
  return NextResponse.json({ conversation });
}

export async function DELETE(request: Request) {
  const auth = await verifyUser(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!(await isAdminEmail(auth.email))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(request.url);
  const convId = url.searchParams.get("conversationId")?.trim();
  if (!convId) return NextResponse.json({ error: "Missing conversationId" }, { status: 400 });

  if (isAblyChatMode()) return NextResponse.json({ ok: true });

  await deleteRedisConversation(convId);
  return NextResponse.json({ ok: true });
}
