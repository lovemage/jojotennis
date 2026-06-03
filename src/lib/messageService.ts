import { auth, db } from "./firebase";
import {
  collection,
  doc,
  updateDoc,
  setDoc,
  getDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  deleteDoc,
  increment,
} from "firebase/firestore";
import type { Conversation, Message } from "./schema";

async function getAuthHeader() {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("需要登入");
  return { Authorization: `Bearer ${token}` };
}

async function fetchChatMessages(convId: string): Promise<Message[]> {
  const headers = await getAuthHeader();
  const response = await fetch(`/api/chat/messages?conversationId=${encodeURIComponent(convId)}`, {
    headers,
  });
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.error || "讀取訊息失敗");
  const data = (await response.json()) as { messages?: Message[] };
  return data.messages ?? [];
}

export async function getOrCreateDirectConversation(
  userBUid: string,
  userBNickname: string,
  userAUid?: string,
): Promise<string> {
  const resolvedAUid = userAUid ?? auth.currentUser?.uid;
  if (!resolvedAUid) throw new Error("需要登入");
  const convId = [resolvedAUid, userBUid].sort().join("_");
  const ref = doc(db, "conversations", convId);
  if (!(await getDoc(ref)).exists()) {
    await setDoc(ref, {
      convId,
      type: "direct",
      participants: [resolvedAUid, userBUid],
      name: userBNickname,
      lastMessage: "",
      lastSenderNickname: "",
      updatedAt: serverTimestamp(),
    });
  }
  return convId;
}

export async function createMatchConversation(
  matchId: string,
  matchTitle: string,
  ownerUid: string,
): Promise<void> {
  await setDoc(doc(db, "conversations", `match_${matchId}`), {
    convId: `match_${matchId}`,
    type: "match",
    relatedId: matchId,
    participants: [ownerUid],
    name: matchTitle,
    lastMessage: "",
    lastSenderNickname: "",
    updatedAt: serverTimestamp(),
  });
}

export async function createClubConversation(
  clubId: string,
  clubName: string,
  ownerUid: string,
): Promise<void> {
  await setDoc(doc(db, "conversations", `club_${clubId}`), {
    convId: `club_${clubId}`,
    type: "club",
    relatedId: clubId,
    participants: [ownerUid],
    name: clubName,
    lastMessage: "",
    lastSenderNickname: "",
    updatedAt: serverTimestamp(),
  });
}

export const addUserToConversation = (convId: string, uid: string) =>
  updateDoc(doc(db, "conversations", convId), { participants: arrayUnion(uid) });

export const removeUserFromConversation = (convId: string, uid: string) =>
  updateDoc(doc(db, "conversations", convId), { participants: arrayRemove(uid) });

export async function sendMessage(
  convId: string,
  senderUid: string,
  senderNickname: string,
  content: string,
): Promise<void> {
  const t = content.trim();
  if (!t) throw new Error("訊息不可為空");
  if (t.length > 500) throw new Error("訊息不可超過 500 字");

  const headers = await getAuthHeader();
  const response = await fetch("/api/chat/messages", {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      conversationId: convId,
      senderUid,
      senderNickname,
      content: t,
      type: senderUid === "system" ? "system" : "text",
    }),
  });
  if (!response.ok) {
    throw new Error((await response.json().catch(() => null))?.error || "訊息送出失敗");
  }

  const convRef = doc(db, "conversations", convId);
  const convSnap = await getDoc(convRef);
  const participants = (convSnap.data()?.participants as string[] | undefined) ?? [];
  await updateDoc(convRef, {
    lastMessage: t.slice(0, 50),
    lastSenderNickname: senderNickname,
    lastMessageTime: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...Object.fromEntries(
      participants
        .filter((uid) => uid && uid !== senderUid)
        .map((uid) => [`unreadByUid.${uid}`, increment(1)]),
    ),
  }).catch(() => undefined);

  void (async () => {
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) return;
      await fetch("/api/notify/message-to-coach", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ convId, senderUid }),
      });
    } catch (err) {
      console.warn("[message-to-coach] 通知失敗：", err);
    }
  })();
}

export async function sendSystemMessage(convId: string, content: string): Promise<void> {
  try {
    await sendMessage(convId, "system", "揪揪網球", content);
  } catch {
    // ignore
  }
}

export const subscribeToMessages = (convId: string, cb: (m: Message[]) => void) => {
  let stopped = false;

  async function load() {
    try {
      const messages = await fetchChatMessages(convId);
      if (!stopped) cb(messages);
    } catch (err) {
      console.error("[messages] 讀取失敗：", err);
    }
  }

  void load();
  const timer = window.setInterval(() => void load(), 3000);
  return () => {
    stopped = true;
    window.clearInterval(timer);
  };
};

export const subscribeToConversations = (uid: string, cb: (c: Conversation[]) => void) =>
  onSnapshot(
    query(
      collection(db, "conversations"),
      where("participants", "array-contains", uid),
      orderBy("updatedAt", "desc"),
    ),
    (snap) => cb(snap.docs.map((d) => ({ convId: d.id, ...d.data() } as Conversation))),
    (err) => console.error("[conversations] 監聽失敗：", err.code, err.message),
  );

/** 將聊天室中他人訊息標記為已讀 */
export async function markConversationMessagesRead(convId: string, uid: string): Promise<void> {
  await updateDoc(doc(db, "conversations", convId), {
    [`unreadByUid.${uid}`]: 0,
  }).catch(() => undefined);
}

export async function upsertConversationSnapshot(data: {
  id: string;
  type: "direct" | "match" | "club";
  participants: string[];
  name: string;
  relatedId?: string;
  lastMessage?: string;
  unreadCount?: number;
  status?: string;
  ownerUid?: string;
}): Promise<void> {
  await setDoc(
    doc(db, "conversations", data.id),
    {
      convId: data.id,
      type: data.type,
      participants: data.participants,
      name: data.name,
      relatedId: data.relatedId,
      lastMessage: data.lastMessage ?? "",
      lastSenderNickname: "",
      updatedAt: serverTimestamp(),
      unreadCount: data.unreadCount ?? 0,
      status: data.status,
      ownerUid: data.ownerUid,
    },
    { merge: true },
  );
}

export async function deleteConversationById(conversationId: string): Promise<void> {
  await deleteDoc(doc(db, "conversations", conversationId));
}

export async function deleteConversationMessageById(
  _conversationId: string,
  _messageId: string,
): Promise<void> {
  // Chat message bodies are stored in Upstash Redis, not Firestore.
  // Keep this as a no-op so admin UI can optimistically remove a message locally
  // without touching the old Firestore messages subcollection.
  void _conversationId;
  void _messageId;
}
