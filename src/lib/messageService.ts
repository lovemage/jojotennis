import { auth } from "./firebase";
import type { Conversation, Message } from "./schema";

async function getAuthHeader() {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("需要登入");
  return { Authorization: `Bearer ${token}` };
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = await getAuthHeader();
  const response = await fetch(url, {
    ...init,
    headers: {
      ...headers,
      ...(init?.headers ?? {}),
    },
  });
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || "聊天室 API 失敗");
  return payload;
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
  await upsertConversationSnapshot({
    id: convId,
    type: "direct",
    participants: [resolvedAUid, userBUid],
    name: userBNickname,
  });
  return convId;
}

export async function createMatchConversation(
  matchId: string,
  matchTitle: string,
  ownerUid: string,
): Promise<void> {
  await upsertConversationSnapshot({
    id: `match_${matchId}`,
    type: "match",
    relatedId: matchId,
    participants: [ownerUid],
    name: matchTitle,
  });
}

export async function createClubConversation(
  clubId: string,
  clubName: string,
  ownerUid: string,
): Promise<void> {
  await upsertConversationSnapshot({
    id: `club_${clubId}`,
    type: "club",
    relatedId: clubId,
    participants: [ownerUid],
    name: clubName,
  });
}

export const addUserToConversation = (convId: string, uid: string) =>
  fetchJson<{ ok: boolean }>("/api/chat/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "addParticipant", convId, uid }),
  }).then(() => undefined);

export const removeUserFromConversation = (convId: string, uid: string) =>
  fetchJson<{ ok: boolean }>("/api/chat/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "removeParticipant", convId, uid }),
  }).then(() => undefined);

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
{
  let stopped = false;

  async function load() {
    try {
      const data = await fetchJson<{ conversations?: Conversation[] }>("/api/chat/conversations");
      if (!stopped) cb(data.conversations ?? []);
    } catch (err) {
      console.error("[conversations] 讀取失敗：", err);
      if (!stopped) cb([]);
    }
  }

  void uid;
  void load();
  const timer = window.setInterval(() => void load(), 3000);
  return () => {
    stopped = true;
    window.clearInterval(timer);
  };
};

export const subscribeToAllConversations = (cb: (c: Conversation[]) => void) => {
  let stopped = false;

  async function load() {
    try {
      const data = await fetchJson<{ conversations?: Conversation[] }>("/api/chat/conversations?admin=1");
      if (!stopped) cb(data.conversations ?? []);
    } catch (err) {
      console.error("[conversations] 管理列表讀取失敗：", err);
      if (!stopped) cb([]);
    }
  }

  void load();
  const timer = window.setInterval(() => void load(), 3000);
  return () => {
    stopped = true;
    window.clearInterval(timer);
  };
};

/** 將聊天室中他人訊息標記為已讀 */
export async function markConversationMessagesRead(convId: string, uid: string): Promise<void> {
  void uid;
  await fetchJson<{ ok: boolean }>("/api/chat/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "markRead", convId }),
  }).then(() => undefined).catch(() => undefined);
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
  await fetchJson<{ conversation?: Conversation }>("/api/chat/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "upsert",
      convId: data.id,
      type: data.type,
      participants: data.participants,
      name: data.name,
      relatedId: data.relatedId,
      unreadCount: data.unreadCount ?? 0,
      status: data.status,
      ownerUid: data.ownerUid,
    }),
  }).then(() => undefined);
}

export async function deleteConversationById(conversationId: string): Promise<void> {
  await fetchJson<{ ok: boolean }>(`/api/chat/conversations?conversationId=${encodeURIComponent(conversationId)}`, {
    method: "DELETE",
  }).then(() => undefined);
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
