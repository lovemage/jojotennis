import { auth, db } from "./firebase";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  setDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  where,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  deleteDoc,
} from "firebase/firestore";
import type { Conversation, Message } from "./schema";

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
  await addDoc(collection(db, "conversations", convId, "messages"), {
    senderUid,
    senderNickname,
    content: t,
    msgType: "text",
    readBy: [senderUid],
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, "conversations", convId), {
    lastMessage: t.slice(0, 50),
    lastSenderNickname: senderNickname,
    updatedAt: serverTimestamp(),
  });
}

export async function sendSystemMessage(convId: string, content: string): Promise<void> {
  try {
    await addDoc(collection(db, "conversations", convId, "messages"), {
      senderUid: "system",
      senderNickname: "揪揪網球",
      content,
      msgType: "system",
      readBy: [],
      createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db, "conversations", convId), {
      lastMessage: content.slice(0, 50),
      lastSenderNickname: "系統",
      updatedAt: serverTimestamp(),
    });
  } catch {
    // ignore
  }
}

export const subscribeToMessages = (convId: string, cb: (m: Message[]) => void) =>
  onSnapshot(
    query(collection(db, "conversations", convId, "messages"), orderBy("createdAt", "asc")),
    (snap) => cb(snap.docs.map((d) => ({ msgId: d.id, ...d.data() } as Message))),
    (err) => console.error("[messages] 監聽失敗：", err.code, err.message),
  );

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
  const snap = await getDocs(collection(db, "conversations", convId, "messages"));
  const updates = snap.docs.filter((d) => {
    const data = d.data();
    const readBy = (data.readBy as string[] | undefined) ?? [];
    return data.senderUid !== uid && data.senderUid !== "system" && !readBy.includes(uid);
  });
  await Promise.all(
    updates.map((d) => updateDoc(d.ref, { readBy: arrayUnion(uid) })),
  );
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
  conversationId: string,
  messageId: string,
): Promise<void> {
  await deleteDoc(doc(db, "conversations", conversationId, "messages", messageId));
}
