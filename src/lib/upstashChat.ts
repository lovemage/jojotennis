import "server-only";

import { Redis } from "@upstash/redis";
import type { Message } from "@/lib/schema";

type RedisChatMessage = Omit<Message, "createdAt"> & { createdAt: number };

const DEFAULT_TTL_DAYS = 30;
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
