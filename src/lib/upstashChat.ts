import "server-only";

import { Redis } from "@upstash/redis";
import type { Message } from "@/lib/schema";

type RedisChatMessage = Omit<Message, "createdAt"> & { createdAt: number };
export type RedisConversation = {
  convId: string;
  type: "direct" | "match" | "club";
  participants: string[];
  relatedId?: string;
  name: string;
  lastMessage: string;
  lastSenderNickname: string;
  lastMessageTime?: number;
  updatedAt: number;
  unreadByUid?: Record<string, number>;
  unreadCount?: number;
  status?: string;
  ownerUid?: string;
};

const DEFAULT_TTL_DAYS = 7;
const MAX_MESSAGES_PER_CONVERSATION = 500;

let redisClient: Redis | null = null;

function getRedis() {
  if (redisClient) return redisClient;
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    throw new Error("Missing Upstash Redis env vars");
  }
  redisClient = new Redis({ url, token });
  return redisClient;
}

function messageKey(conversationId: string) {
  return `chat:${conversationId}:messages`;
}

function conversationKey(conversationId: string) {
  return `chat:${conversationId}:meta`;
}

function userConversationsKey(uid: string) {
  return `chat:user:${uid}:conversations`;
}

function allConversationsKey() {
  return "chat:conversations";
}

function ttlSeconds() {
  const configuredDays = Number(process.env.CHAT_MESSAGE_TTL_DAYS ?? DEFAULT_TTL_DAYS);
  const days = Number.isFinite(configuredDays) && configuredDays > 0 ? configuredDays : DEFAULT_TTL_DAYS;
  return Math.floor(days * 24 * 60 * 60);
}

export async function appendRedisChatMessage(
  conversationId: string,
  message: Omit<RedisChatMessage, "convId">,
): Promise<RedisChatMessage> {
  const redis = getRedis();
  const key = messageKey(conversationId);
  const stored: RedisChatMessage = {
    ...message,
    convId: conversationId,
  };

  await redis.rpush(key, JSON.stringify(stored));
  await redis.ltrim(key, -MAX_MESSAGES_PER_CONVERSATION, -1);
  await redis.expire(key, ttlSeconds());
  return stored;
}

export async function listRedisChatMessages(conversationId: string): Promise<RedisChatMessage[]> {
  const redis = getRedis();
  const rows = await redis.lrange<string>(messageKey(conversationId), 0, -1);
  return rows
    .map((row) => {
      try {
        return JSON.parse(row) as RedisChatMessage;
      } catch {
        return null;
      }
    })
    .filter((message): message is RedisChatMessage => Boolean(message));
}

async function writeConversation(redis: Redis, conversation: RedisConversation) {
  await redis.set(conversationKey(conversation.convId), JSON.stringify(conversation));
  await redis.sadd(allConversationsKey(), conversation.convId);
  if (conversation.participants.length > 0) {
    await Promise.all(
      conversation.participants.map((uid) =>
        redis.sadd(userConversationsKey(uid), conversation.convId),
      ),
    );
  }
}

export async function getRedisConversation(conversationId: string): Promise<RedisConversation | null> {
  const redis = getRedis();
  const row = await redis.get<string>(conversationKey(conversationId));
  if (!row) return null;
  try {
    return typeof row === "string" ? JSON.parse(row) as RedisConversation : row as RedisConversation;
  } catch {
    return null;
  }
}

export async function upsertRedisConversation(
  data: Omit<RedisConversation, "updatedAt" | "lastMessage" | "lastSenderNickname"> &
    Partial<Pick<RedisConversation, "updatedAt" | "lastMessage" | "lastSenderNickname" | "lastMessageTime">>,
): Promise<RedisConversation> {
  const redis = getRedis();
  const existing = await getRedisConversation(data.convId);
  const participants = Array.from(new Set([...(existing?.participants ?? []), ...(data.participants ?? [])].filter(Boolean)));
  const conversation: RedisConversation = {
    convId: data.convId,
    type: data.type,
    participants,
    relatedId: data.relatedId ?? existing?.relatedId,
    name: data.name || existing?.name || "未命名對話",
    lastMessage: data.lastMessage ?? existing?.lastMessage ?? "",
    lastSenderNickname: data.lastSenderNickname ?? existing?.lastSenderNickname ?? "",
    lastMessageTime: data.lastMessageTime ?? existing?.lastMessageTime,
    updatedAt: data.updatedAt ?? Date.now(),
    unreadByUid: existing?.unreadByUid ?? data.unreadByUid ?? {},
    unreadCount: data.unreadCount ?? existing?.unreadCount ?? 0,
    status: data.status ?? existing?.status,
    ownerUid: data.ownerUid ?? existing?.ownerUid,
  };
  await writeConversation(redis, conversation);
  return conversation;
}

export async function addRedisConversationParticipant(conversationId: string, uid: string): Promise<void> {
  const existing = await getRedisConversation(conversationId);
  if (!existing) return;
  await upsertRedisConversation({
    ...existing,
    participants: Array.from(new Set([...existing.participants, uid])),
    updatedAt: Date.now(),
  });
}

export async function removeRedisConversationParticipant(conversationId: string, uid: string): Promise<void> {
  const redis = getRedis();
  const existing = await getRedisConversation(conversationId);
  if (!existing) return;
  await redis.srem(userConversationsKey(uid), conversationId);
  await upsertRedisConversation({
    ...existing,
    participants: existing.participants.filter((participant) => participant !== uid),
    updatedAt: Date.now(),
  });
}

export async function listRedisConversationsForUser(uid: string): Promise<RedisConversation[]> {
  const redis = getRedis();
  const ids = await redis.smembers<string[]>(userConversationsKey(uid));
  const conversations = await Promise.all(ids.map((id) => getRedisConversation(id)));
  return conversations
    .filter((conversation): conversation is RedisConversation => Boolean(conversation))
    .sort((a, b) => (b.lastMessageTime ?? b.updatedAt) - (a.lastMessageTime ?? a.updatedAt));
}

export async function listAllRedisConversations(): Promise<RedisConversation[]> {
  const redis = getRedis();
  const ids = await redis.smembers<string[]>(allConversationsKey());
  const conversations = await Promise.all(ids.map((id) => getRedisConversation(id)));
  return conversations
    .filter((conversation): conversation is RedisConversation => Boolean(conversation))
    .sort((a, b) => (b.lastMessageTime ?? b.updatedAt) - (a.lastMessageTime ?? a.updatedAt));
}

export async function markRedisConversationRead(conversationId: string, uid: string): Promise<void> {
  const existing = await getRedisConversation(conversationId);
  if (!existing) return;
  await upsertRedisConversation({
    ...existing,
    unreadByUid: { ...(existing.unreadByUid ?? {}), [uid]: 0 },
    updatedAt: Date.now(),
  });
}

export async function updateRedisConversationAfterMessage(
  conversationId: string,
  senderUid: string,
  senderNickname: string,
  content: string,
): Promise<void> {
  const existing = await getRedisConversation(conversationId);
  if (!existing) return;
  const unreadByUid = { ...(existing.unreadByUid ?? {}) };
  for (const uid of existing.participants) {
    if (uid && uid !== senderUid) unreadByUid[uid] = (unreadByUid[uid] ?? 0) + 1;
  }
  await upsertRedisConversation({
    ...existing,
    lastMessage: content.slice(0, 50),
    lastSenderNickname: senderNickname,
    lastMessageTime: Date.now(),
    updatedAt: Date.now(),
    unreadByUid,
  });
}

export async function deleteRedisConversation(conversationId: string): Promise<void> {
  const redis = getRedis();
  const existing = await getRedisConversation(conversationId);
  if (existing) {
    await Promise.all(existing.participants.map((uid) => redis.srem(userConversationsKey(uid), conversationId)));
  }
  await redis.srem(allConversationsKey(), conversationId);
  await redis.del(conversationKey(conversationId));
  await redis.del(messageKey(conversationId));
}
