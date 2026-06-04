import { NextResponse } from "next/server";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebaseAdmin";
import { appendRedisChatMessage, listRedisChatMessages } from "@/lib/upstashChat";

export const runtime = "nodejs";

type ConversationDoc = {
  type?: "direct" | "match" | "club";
  participants?: string[];
  relatedId?: string;
};

type FirestoreValue = {
  stringValue?: string;
  booleanValue?: boolean;
  arrayValue?: { values?: FirestoreValue[] };
};

function firebaseProjectId() {
  return process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
}

function firestoreDocUrl(collectionName: string, docId: string) {
  const projectId = firebaseProjectId();
  if (!projectId) throw new Error("Missing NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionName}/${encodeURIComponent(docId)}`;
}

function fromFirestoreDoc<T extends Record<string, unknown>>(doc: { fields?: Record<string, FirestoreValue> }): T {
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(doc.fields ?? {})) {
    if ("stringValue" in value) output[key] = value.stringValue ?? "";
    if ("booleanValue" in value) output[key] = value.booleanValue ?? false;
    if ("arrayValue" in value) {
      output[key] = (value.arrayValue?.values ?? []).map((item) => item.stringValue ?? "");
    }
  }
  return output as T;
}

async function fetchFirestoreDoc<T extends Record<string, unknown>>(
  collectionName: string,
  docId: string,
  idToken: string,
): Promise<T | null> {
  const response = await fetch(firestoreDocUrl(collectionName, docId), {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Firestore REST read failed: ${response.status}`);
  return fromFirestoreDoc<T>((await response.json()) as { fields?: Record<string, FirestoreValue> });
}

async function findAcceptedApplication(matchId: string, uid: string, idToken: string) {
  const projectId = firebaseProjectId();
  if (!projectId) throw new Error("Missing NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: "match_applications" }],
          where: {
            compositeFilter: {
              op: "AND",
              filters: [
                { fieldFilter: { field: { fieldPath: "matchId" }, op: "EQUAL", value: { stringValue: matchId } } },
                { fieldFilter: { field: { fieldPath: "applicantUid" }, op: "EQUAL", value: { stringValue: uid } } },
                { fieldFilter: { field: { fieldPath: "status" }, op: "EQUAL", value: { stringValue: "accepted" } } },
                { fieldFilter: { field: { fieldPath: "isDeleted" }, op: "EQUAL", value: { booleanValue: false } } },
              ],
            },
          },
          limit: 1,
        },
      }),
    },
  );
  if (!response.ok) throw new Error(`Firestore REST query failed: ${response.status}`);
  const rows = (await response.json()) as Array<{ document?: { fields?: Record<string, FirestoreValue> } }>;
  return rows.some((row) => Boolean(row.document));
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
    return { ok: true as const, uid: decoded.uid, token };
  } catch (adminError) {
    try {
      const uid = await verifyFirebaseTokenWithRest(token);
      return { ok: true as const, uid, token };
    } catch {
      console.warn("[chat] token verification failed:", adminError instanceof Error ? adminError.message : adminError);
      return { ok: false as const, status: 401, error: "Invalid token" };
    }
  }
}

async function canReadMatchConversation(matchId: string, uid: string, idToken: string) {
  try {
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
    return appSnap.docs.some((doc) => doc.data().status === "accepted");
  } catch {
    const match = await fetchFirestoreDoc<{ ownerUid?: string }>("matches", matchId, idToken);
    if (match?.ownerUid === uid) return true;
    return findAcceptedApplication(matchId, uid, idToken);
  }
}

async function resolveConversation(convId: string, idToken: string) {
  try {
    const firestore = getAdminFirestore();
    const snap = await firestore.collection("conversations").doc(convId).get();
    if (snap.exists) return snap.data() as ConversationDoc;
  } catch {
    const conv = await fetchFirestoreDoc<ConversationDoc>("conversations", convId, idToken).catch(() => null);
    if (conv) return conv;
  }

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

  const conv = await resolveConversation(convId, auth.token);
  if (!conv) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

  const matchId = conv.type === "match" ? conv.relatedId ?? convId.replace(/^match_/, "") : "";
  const canRead =
    conv.type === "match"
      ? Boolean(matchId && (await canReadMatchConversation(matchId, auth.uid, auth.token)))
      : canReadConversation(conv, auth.uid);
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

  const conv = await resolveConversation(convId, auth.token);
  if (!conv) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  const matchId = conv.type === "match" ? conv.relatedId ?? convId.replace(/^match_/, "") : "";
  const canSend =
    conv.type === "match"
      ? Boolean(matchId && (await canReadMatchConversation(matchId, auth.uid, auth.token)))
      : canSendConversation(conv, auth.uid);
  if (!canSend) {
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
