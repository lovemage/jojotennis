import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebaseAdmin";
import { getSupabaseServiceClient } from "@/lib/supabase";
import {
  appendRedisChatMessage,
  getRedisConversation,
  listRedisChatMessages,
  updateRedisConversationAfterMessage,
} from "@/lib/upstashChat";

export const runtime = "nodejs";

type ConversationDoc = {
  type?: "direct" | "match" | "club";
  participants?: string[];
  relatedId?: string;
};

async function verifyFirebaseTokenWithRest(token: string) {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) throw new Error("Missing NEXT_PUBLIC_FIREBASE_API_KEY");
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken: token }),
  });
  if (!response.ok) throw new Error(`Firebase Auth REST failed: ${response.status}`);
  const data = (await response.json()) as { users?: Array<{ localId?: string }> };
  const uid = data.users?.[0]?.localId;
  if (!uid) throw new Error("Firebase Auth REST returned no user");
  return uid;
}

async function verifyUser(request: Request) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return { ok: false as const, status: 401, error: "Missing token" };
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    return { ok: true as const, uid: decoded.uid };
  } catch (adminError) {
    try {
      const uid = await verifyFirebaseTokenWithRest(token);
      return { ok: true as const, uid };
    } catch {
      console.warn("[chat] token verification failed:", adminError instanceof Error ? adminError.message : adminError);
      return { ok: false as const, status: 401, error: "Invalid token" };
    }
  }
}

async function getMatchConversationRole(matchId: string, uid: string) {
  const supabase = getSupabaseServiceClient();
  const { data: match } = await supabase
    .from("matches")
    .select("owner_uid")
    .eq("id", matchId)
    .eq("is_deleted", false)
    .maybeSingle();
  if ((match as { owner_uid?: string } | null)?.owner_uid === uid) return "owner";

  const { data: application } = await supabase
    .from("match_applications")
    .select("status")
    .eq("match_id", matchId)
    .eq("applicant_uid", uid)
    .eq("is_deleted", false)
    .in("status", ["pending", "accepted"])
    .limit(1)
    .maybeSingle();
  return ((application as { status?: string } | null)?.status ?? "") as "" | "pending" | "accepted";
}

async function canReadMatchConversation(matchId: string, uid: string) {
  return Boolean(await getMatchConversationRole(matchId, uid));
}

async function canSendMatchConversation(matchId: string, uid: string) {
  const role = await getMatchConversationRole(matchId, uid);
  return role === "owner" || role === "accepted";
}

async function resolveConversation(convId: string) {
  if (convId.startsWith("match_")) {
    return {
      type: "match" as const,
      relatedId: convId.replace(/^match_/, ""),
      participants: [],
    };
  }

  const redisConversation = await getRedisConversation(convId);
  if (redisConversation) return redisConversation as ConversationDoc;

  return null;
}

function canReadConversation(conv: ConversationDoc, uid: string) {
  if (conv.participants?.includes(uid)) return true;
  return false;
}

function canSendConversation(conv: ConversationDoc, uid: string) {
  return conv.participants?.includes(uid) === true;
}

export async function GET(request: Request) {
  const auth = await verifyUser(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url = new URL(request.url);
  const convId = url.searchParams.get("conversationId")?.trim();
  if (!convId) return NextResponse.json({ error: "Missing conversationId" }, { status: 400 });
  const rawLimit = Number(url.searchParams.get("limit") ?? "30");
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), 300) : 30;

  const conv = await resolveConversation(convId);
  if (!conv) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

  const matchId = conv.type === "match" ? conv.relatedId ?? convId.replace(/^match_/, "") : "";
  const canRead =
    conv.type === "match"
      ? Boolean(matchId && (await canReadMatchConversation(matchId, auth.uid)))
      : canReadConversation(conv, auth.uid);
  if (!canRead) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const messages = await listRedisChatMessages(convId, limit);
    return NextResponse.json({ messages });
  } catch (error) {
    console.warn("[chat/messages] cache unavailable:", error instanceof Error ? error.message : error);
    return NextResponse.json({ messages: [] });
  }
}

export async function POST(request: Request) {
  const auth = await verifyUser(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = (await request.json().catch(() => ({}))) as {
    conversationId?: string;
    senderUid?: string;
    senderNickname?: string;
    content?: string;
    type?: "text" | "system";
  };
  const convId = body.conversationId?.trim();
  const content = body.content?.trim();
  if (!convId || !content) return NextResponse.json({ error: "Missing conversationId or content" }, { status: 400 });
  if (content.length > 500) return NextResponse.json({ error: "訊息不可超過 500 字" }, { status: 400 });

  const conv = await resolveConversation(convId);
  if (!conv) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  const matchId = conv.type === "match" ? conv.relatedId ?? convId.replace(/^match_/, "") : "";
  const canSend =
    conv.type === "match"
      ? Boolean(matchId && (await canSendMatchConversation(matchId, auth.uid)))
      : canSendConversation(conv, auth.uid);
  if (!canSend) {
    return NextResponse.json({ error: "主揪核准前無法在此聊天室發送訊息" }, { status: 403 });
  }

  const isSystem = body.type === "system" || body.senderUid === "system";
  const message = {
    msgId: `msg-${Date.now()}-${crypto.randomUUID()}`,
    convId,
    senderUid: isSystem ? "system" : auth.uid,
    senderNickname: isSystem ? body.senderNickname || "揪揪網球" : body.senderNickname || "球友",
    content,
    msgType: (isSystem ? "system" : "text") as "system" | "text",
    readBy: isSystem ? [] : [auth.uid],
    createdAt: Date.now(),
  };

  try {
    await appendRedisChatMessage(convId, message);
    await updateRedisConversationAfterMessage(
      convId,
      isSystem ? "system" : auth.uid,
      isSystem ? body.senderNickname || "揪揪網球" : body.senderNickname || "球友",
      content,
    );

  } catch (error) {
    console.warn("[chat/messages] cache write skipped:", error instanceof Error ? error.message : error);
  }

  return NextResponse.json({ message });
}
