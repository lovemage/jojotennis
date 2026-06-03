import { NextResponse } from "next/server";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebaseAdmin";
import { appendRedisChatMessage, listRedisChatMessages } from "@/lib/upstashChat";

export const runtime = "nodejs";

type ConversationDoc = {
  type?: "direct" | "match" | "club";
  participants?: string[];
  relatedId?: string;
};

async function verifyUser(request: Request) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return { ok: false as const, status: 401, error: "Missing token" };
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    return { ok: true as const, uid: decoded.uid };
  } catch {
    return { ok: false as const, status: 401, error: "Invalid token" };
  }
}

async function canReadMatchConversation(matchId: string, uid: string) {
  const firestore = getAdminFirestore();
  const matchSnap = await firestore.collection("matches").doc(matchId).get();
  const match = matchSnap.data() as { ownerUid?: string } | undefined;
  if (match?.ownerUid === uid) return true;

  const appSnap = await firestore
    .collection("match_applications")
    .where("matchId", "==", matchId)
    .where("applicantUid", "==", uid)
    .where("isDeleted", "==", false)
    .limit(1)
    .get();
  return !appSnap.empty;
}

async function resolveConversation(convId: string) {
  const firestore = getAdminFirestore();
  const snap = await firestore.collection("conversations").doc(convId).get();
  if (snap.exists) return snap.data() as ConversationDoc;

  if (convId.startsWith("match_")) {
    return {
      type: "match" as const,
      relatedId: convId.replace(/^match_/, ""),
      participants: [],
    };
  }
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

  const conv = await resolveConversation(convId);
  if (!conv) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

  const matchId = conv.type === "match" ? conv.relatedId ?? convId.replace(/^match_/, "") : "";
  const canRead =
    canReadConversation(conv, auth.uid) ||
    (matchId ? await canReadMatchConversation(matchId, auth.uid) : false);
  if (!canRead) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const messages = await listRedisChatMessages(convId);
    return NextResponse.json({ messages });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Redis unavailable";
    return NextResponse.json({ error: message }, { status: 503 });
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
  if (!canSendConversation(conv, auth.uid)) {
    return NextResponse.json({ error: "主揪核准前無法在此聊天室發送訊息" }, { status: 403 });
  }

  const isSystem = body.type === "system" || body.senderUid === "system";
  try {
    const message = await appendRedisChatMessage(convId, {
      msgId: `msg-${Date.now()}-${crypto.randomUUID()}`,
      senderUid: isSystem ? "system" : auth.uid,
      senderNickname: isSystem ? body.senderNickname || "揪揪網球" : body.senderNickname || "球友",
      content,
      msgType: isSystem ? "system" : "text",
      readBy: isSystem ? [] : [auth.uid],
      createdAt: Date.now(),
    });

    return NextResponse.json({ message });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Redis unavailable";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
