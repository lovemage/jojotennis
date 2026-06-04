import { Realtime } from "ably";
import { auth } from "./firebase";
import type { Conversation, Message } from "./schema";

const MESSAGE_POLL_MS = 8000;
const MESSAGE_HIDDEN_POLL_MS = 60000;
const MESSAGE_FETCH_LIMIT = 30;
const MESSAGE_RATE_LIMIT_BACKOFF_MS = 120000;
const CHAT_SERVICE_ERROR_PAUSE_MS = 30 * 1000;
const CONVERSATION_POLL_MS = 120000;
const ADMIN_CONVERSATION_POLL_MS = 120000;
const CONVERSATION_HIDDEN_POLL_MS = 120000;
const MAX_ERROR_BACKOFF_MS = 300000;
const CHAT_REALTIME_PROVIDER = process.env.NEXT_PUBLIC_CHAT_REALTIME_PROVIDER ?? "ably";
const ABLY_CHANNEL_PREFIX = process.env.NEXT_PUBLIC_ABLY_CHANNEL_PREFIX ?? "chat";
const CHAT_ENABLE_POLLING_FALLBACK = process.env.NEXT_PUBLIC_CHAT_ENABLE_POLLING_FALLBACK === "true";
const CHAT_LOCAL_STORAGE_PREFIX = "jojo-chat";
const CHAT_LOCAL_STORAGE_MAX_MESSAGES = 300;

let chatServiceUnavailableUntil = 0;
let chatServiceUnavailableMessage = "聊天室服務已暫時停用，請稍後再試。";

let ablyRealtimeClient: { channels: { get: (name: string) => AblyChannel } } | null = null;

function isRateLimitError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return (
    message.includes("max requests limit exceeded") ||
    message.includes("HTTP 429") ||
    message.includes("Too Many Requests")
  );
}

function isRateLimitErrorMessage(message: string) {
  return (
    message.includes("max requests limit exceeded") ||
    message.includes("HTTP 429") ||
    message.includes("Too Many Requests")
  );
}

function isChatServicePaused() {
  return chatServiceUnavailableUntil > Date.now();
}

function disableChatService(message: string) {
  chatServiceUnavailableMessage = message || "聊天室服務暫時忙碌，請稍後再試。";
  chatServiceUnavailableUntil = Date.now() + CHAT_SERVICE_ERROR_PAUSE_MS;
}

function recoverChatService() {
  chatServiceUnavailableUntil = 0;
  chatServiceUnavailableMessage = "聊天室服務已暫時停用，請稍後再試。";
}

export function isChatServiceUnavailable() {
  return isChatServicePaused();
}

export function getChatServiceUnavailableMessage() {
  return isChatServicePaused() ? chatServiceUnavailableMessage : "";
}

function checkChatServiceHealth() {
  if (isChatServicePaused()) {
    throw new Error(chatServiceUnavailableMessage);
  }
}

function getAblyChannelName(convId: string) {
  return `${ABLY_CHANNEL_PREFIX}:${convId}`;
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
    const parsedDate = Date.parse(value);
    if (!Number.isNaN(parsedDate)) return parsedDate;
  }
  if (
    value &&
    typeof value === "object" &&
    typeof (value as { toDate?: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().getTime();
  }
  return Date.now();
}

type AblyMessage = { data?: unknown };
type AblyChannel = {
  subscribe: (event: string, listener: (message: AblyMessage) => void) => void;
  unsubscribe: (event: string, listener: (message: AblyMessage) => void) => void;
  publish: (eventName: string, data: Message) => Promise<unknown>;
};

type AblyRealtimeClient = {
  channels: {
    get: (name: string) => AblyChannel;
  };
};

function normalizeMessage(raw: unknown): Message | null {
  if (!raw || typeof raw !== "object") return null;
  const message = raw as Partial<Message> & {
    createdAt?: unknown;
    msgType?: unknown;
    readBy?: unknown;
    convId?: unknown;
    msgId?: unknown;
    senderUid?: unknown;
    senderNickname?: unknown;
    content?: unknown;
  };

  const msgId = typeof message.msgId === "string" && message.msgId.trim() ? message.msgId : "";
  const convId = typeof message.convId === "string" && message.convId.trim() ? message.convId : "";
  const senderUid =
    typeof message.senderUid === "string" && message.senderUid.trim() ? message.senderUid : "";
  const senderNickname = typeof message.senderNickname === "string" ? message.senderNickname : "";
  const content = typeof message.content === "string" ? message.content : "";
  if (!msgId || !convId || !senderUid || !content) return null;

  return {
    msgId,
    convId,
    senderUid,
    senderNickname,
    content,
    msgType: message.msgType === "system" ? "system" : "text",
    readBy: Array.isArray(message.readBy) ? message.readBy.filter((item): item is string => typeof item === "string") : [],
    createdAt: new Date(toNumber(message.createdAt)),
  };
}

function getLocalMessageKey(convId: string) {
  return `${CHAT_LOCAL_STORAGE_PREFIX}:${convId}:messages`;
}

function readLocalMessages(convId: string): Message[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(getLocalMessageKey(convId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => normalizeMessage(item))
      .filter((message): message is Message => message !== null);
  } catch {
    return [];
  }
}

function writeLocalMessages(convId: string, messages: Message[]) {
  if (typeof window === "undefined") return;
  try {
    const limited = messages.slice(-CHAT_LOCAL_STORAGE_MAX_MESSAGES);
    window.localStorage.setItem(
      getLocalMessageKey(convId),
      JSON.stringify(
        limited.map((message) => ({
          ...message,
          createdAt: message.createdAt.toISOString(),
        })),
      ),
    );
  } catch {
    // Local browser storage is best-effort.
  }
}

export function clearStoredChatMessages(convId: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(getLocalMessageKey(convId));
  } catch {
    // ignore
  }
}

function mergeMessages(existing: Message[], next: Message[]): Message[] {
  const map = new Map<string, Message>();
  for (const item of existing) {
    const normalized = normalizeMessage(item);
    if (normalized) map.set(normalized.msgId, normalized);
  }
  for (const item of next) {
    const normalized = normalizeMessage(item);
    if (normalized) map.set(normalized.msgId, normalized);
  }
  return Array.from(map.values()).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

function equalMessages(left: Message[], right: Message[]) {
  if (left.length !== right.length) return false;
  return left.every((item, index) => {
    const next = right[index];
    if (!next) return false;
    return (
      item.msgId === next.msgId &&
      item.convId === next.convId &&
      item.senderUid === next.senderUid &&
      item.senderNickname === next.senderNickname &&
      item.content === next.content &&
      item.msgType === next.msgType &&
      toNumber(item.createdAt) === toNumber(next.createdAt) &&
      item.readBy.length === next.readBy.length &&
      item.readBy.every((uid, i) => uid === next.readBy[i])
    );
  });
}

async function getAuthHeader() {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("需要登入");
  return { Authorization: `Bearer ${token}` };
}

function getAblyClient() {
  if (typeof window === "undefined" || CHAT_REALTIME_PROVIDER !== "ably") return null;
  if (ablyRealtimeClient) return ablyRealtimeClient;

  try {
    const client = new Realtime({
      authCallback: async (_params, callback) => {
        try {
          const token = await auth.currentUser?.getIdToken();
          if (!token) throw new Error("需要登入");
          const response = await fetch("/api/chat/ably/token", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          });
          const text = await response.text();
          if (!response.ok) {
            throw new Error(text || `Ably token 失敗 (HTTP ${response.status})`);
          }
          callback(null, JSON.parse(text));
        } catch (error) {
          callback(error as any, undefined as any);
        }
      },
      autoConnect: true,
    });

    ablyRealtimeClient = client as unknown as AblyRealtimeClient;
    return ablyRealtimeClient;
  } catch (error) {
    console.warn("[ably] 初始化失敗：", error);
    return null;
  }
}

async function publishMessageToRealtime(message: Message) {
  const client = getAblyClient();
  if (!client) return;
  try {
    const channel = client.channels.get(getAblyChannelName(message.convId));
    await channel.publish("chat-message", message);
  } catch (error) {
    console.warn("[ably] 發佈失敗：", error);
  }
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  checkChatServiceHealth();
  const headers = await getAuthHeader();
  const response = await fetch(url, {
    ...init,
    headers: {
      ...headers,
      ...(init?.headers ?? {}),
    },
  });
  const responseText = await response.text();
  const payload = (() => {
    try {
      return responseText ? (JSON.parse(responseText) as { error?: string }) : {};
    } catch {
      return {};
    }
  })() as T & { error?: string };
  if (!response.ok) {
    const errorMessage = payload.error || responseText || "request failed";
    if (isRateLimitErrorMessage(errorMessage)) {
      disableChatService(errorMessage);
    }
    throw new Error(`聊天室 API 失敗 (HTTP ${response.status}): ${errorMessage}`);
  }
  recoverChatService();
  return payload;
}

async function fetchChatMessages(convId: string, limit = MESSAGE_FETCH_LIMIT): Promise<Message[]> {
  checkChatServiceHealth();
  const data = await fetchJson<{ messages?: Message[] }>(
    `/api/chat/messages?conversationId=${encodeURIComponent(convId)}&limit=${limit}`,
  );
  return (data.messages ?? [])
    .map((message) => normalizeMessage(message))
    .filter((message): message is Message => message !== null);
}

function subscribeWithPolling(
  load: () => Promise<void>,
  options: {
    intervalMs: number;
    hiddenIntervalMs?: number;
    onError?: (error: unknown) => void;
  },
) {
  let stopped = false;
  let timer: number | undefined;
  let errorCount = 0;
  let rateLimitUntil = 0;

  const nextDelay = () => {
    const now = Date.now();
    if (isChatServicePaused()) {
      return Math.max(1000, Math.min(chatServiceUnavailableUntil - now, MAX_ERROR_BACKOFF_MS));
    }
    if (rateLimitUntil > now) {
      return Math.max(1000, rateLimitUntil - now);
    }

    const inactive = document.hidden || !document.hasFocus?.();
    const baseDelay = inactive
      ? options.hiddenIntervalMs ?? Math.max(options.intervalMs, MESSAGE_HIDDEN_POLL_MS)
      : options.intervalMs;
    if (errorCount === 0) return baseDelay;
    return Math.min(MAX_ERROR_BACKOFF_MS, baseDelay * 2 ** Math.min(errorCount, 5));
  };

  const schedule = (delay = nextDelay()) => {
    if (stopped) return;
    timer = window.setTimeout(() => void run(), delay);
  };

  async function run() {
    if (stopped) return;
    if (isChatServicePaused()) {
      schedule(nextDelay());
      return;
    }

    try {
      await load();
      if (rateLimitUntil > Date.now()) {
        rateLimitUntil = 0;
      }
      errorCount = 0;
    } catch (error) {
      if (isRateLimitError(error)) {
        rateLimitUntil = Date.now() + MESSAGE_RATE_LIMIT_BACKOFF_MS;
        disableChatService(error instanceof Error ? error.message : String(error ?? ""));
        errorCount = Math.max(errorCount, 1);
      } else {
        errorCount += 1;
      }
      options.onError?.(error);
    } finally {
      schedule();
    }
  }

  const handleVisibilityChange = () => {
    if (stopped) return;
    if (timer) window.clearTimeout(timer);
    if (document.hidden) {
      schedule(nextDelay());
    } else {
      void run();
    }
  };

  document.addEventListener("visibilitychange", handleVisibilityChange);
  void run();

  return () => {
    stopped = true;
    if (timer) window.clearTimeout(timer);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };
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
  checkChatServiceHealth();
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
  const payload = (await response.json().catch(() => null)) as
    | { error?: string; message?: unknown }
    | null;

  if (!response.ok) {
    const message = payload?.error || "訊息送出失敗";
    if (isRateLimitErrorMessage(message)) {
      disableChatService(message);
    }
    throw new Error(message);
  }

  recoverChatService();

  const createdMessage = normalizeMessage(payload?.message);
  if (createdMessage) {
    writeLocalMessages(convId, mergeMessages(readLocalMessages(convId), [createdMessage]));
    void publishMessageToRealtime(createdMessage);
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
  let messages: Message[] = readLocalMessages(convId);
  let stopPolling: (() => void) | null = null;
  let stopRealtime: (() => void) | null = null;

  const applyMessages = (next: Message[]) => {
    const merged = mergeMessages(messages, next);
    if (!equalMessages(messages, merged)) {
      messages = merged;
      writeLocalMessages(convId, messages);
      if (!stopped) cb(messages);
    }
  };

  const load = async () => {
    const list = await fetchChatMessages(convId);
    applyMessages(list);
  };

  const fallback = () => {
    if (!CHAT_ENABLE_POLLING_FALLBACK) return;
    if (stopPolling) return;
    stopPolling = subscribeWithPolling(load, {
      intervalMs: MESSAGE_POLL_MS,
      hiddenIntervalMs: MESSAGE_HIDDEN_POLL_MS,
      onError: (err) => console.error("[messages] 讀取失敗：", err),
    });
  };

  const startRealtime = async () => {
    if (CHAT_REALTIME_PROVIDER !== "ably") return false;
    const client = getAblyClient();
    if (!client) return false;

    const channel = client.channels.get(getAblyChannelName(convId));
    const onMessage = (message: AblyMessage) => {
      const payload = normalizeMessage(message.data);
      if (!payload || payload.convId !== convId) return;
      applyMessages([payload]);
    };

    channel.subscribe("chat-message", onMessage);
    stopRealtime = () => {
      try {
        channel.unsubscribe("chat-message", onMessage);
      } catch {
        // ignore
      }
    };

    return true;
  };

  void (async () => {
    try {
      if (messages.length > 0 && !stopped) cb(messages);
      await load();
      const canUseRealtime = await startRealtime();
      if (!canUseRealtime) fallback();
    } catch (error) {
      console.error("[messages] 讀取失敗：", error);
      fallback();
    }
  })();

  return () => {
    stopped = true;
    if (stopPolling) {
      stopPolling();
      stopPolling = null;
    }
    if (stopRealtime) {
      stopRealtime();
      stopRealtime = null;
    }
  };
};

export const subscribeToConversations = (uid: string, cb: (c: Conversation[]) => void) =>
{
  let stopped = false;

  if (CHAT_REALTIME_PROVIDER === "ably") {
    cb([]);
    void uid;
    return () => {
      stopped = true;
    };
  }

  void (async () => {
    try {
      const data = await fetchJson<{ conversations?: Conversation[] }>("/api/chat/conversations");
      if (!stopped) cb(data.conversations ?? []);
    } catch (err) {
      console.error("[conversations] 讀取失敗：", err);
    }
  })();

  void uid;
  return () => {
    stopped = true;
  };
};

export const subscribeToAllConversations = (cb: (c: Conversation[]) => void) => {
  let stopped = false;

  const unsubscribe = subscribeWithPolling(
    async () => {
      const data = await fetchJson<{ conversations?: Conversation[] }>("/api/chat/conversations?admin=1");
      if (!stopped) cb(data.conversations ?? []);
    },
    {
      intervalMs: ADMIN_CONVERSATION_POLL_MS,
      hiddenIntervalMs: CONVERSATION_HIDDEN_POLL_MS,
      onError: (err) => console.error("[conversations] 管理列表讀取失敗：", err),
    },
  );

  return () => {
    stopped = true;
    unsubscribe();
  };
};

/** 將聊天室中他人訊息標記為已讀 */
export async function markConversationMessagesRead(convId: string, uid: string): Promise<void> {
  if (isChatServicePaused()) return;
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
  if (isChatServicePaused()) return;
  await fetchJson<{ conversation?: Conversation }>("/api/chat/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "upsert",
      convId: data.id,
      type: data.type,
      participants: data.participants,
      relatedId: data.relatedId,
      name: data.name,
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
