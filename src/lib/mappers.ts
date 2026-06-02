import type {
  Match as SchemaMatch,
  MatchApplication,
  User as SchemaUser,
  Message as SchemaChatMessage,
  Conversation as SchemaConversation,
} from "@/lib/schema";
import type {
  User,
  Match,
  ChatMessage,
  Conversation,
} from "@/lib/uiTypes";

export function toMillis(value: unknown): number {
  if (!value) return Date.now();
  if (typeof value === "number") return value;
  if (value instanceof Date) return value.getTime();
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().getTime();
  }
  return Date.now();
}

export function toUiUser(
  uid: string,
  email: string | null | undefined,
  data: Partial<SchemaUser> = {},
): User {
  const nickname = data.nickname || "新球友";
  return {
    uid,
    email: data.email || email || "",
    nickname,
    ntrp: data.ntrp || "2.0",
    region: data.region || "台北市",
    yearsPlaying: data.yearsPlaying ?? 0,
    avatarInitial: nickname[0] || "?",
    avatarUrl: data.avatarUrl || "",
    role: data.role ?? "user",
    isActive: data.isActive !== false,
    createdAt: data.createdAt ? toMillis(data.createdAt) : undefined,
    nicknameChangesUsed: typeof data.nicknameChangesUsed === "number" ? data.nicknameChangesUsed : 0,
  };
}

export function mapApplicantStatus(
  status: MatchApplication["status"],
): Match["applicants"][number]["status"] {
  if (status === "accepted") return "accepted";
  if (status === "pending") return "pending";
  if (status === "removed") return "removed";
  return "declined";
}

export function toUiMatch(
  raw: SchemaMatch & { matchId?: string },
  id: string,
  applications: MatchApplication[],
): Match {
  const applicants = applications
    .filter((app) => app.matchId === id && !app.isDeleted)
    .map((app) => ({
      uid: app.applicantUid,
      nickname: app.applicantNickname,
      status: mapApplicantStatus(app.status),
    }));

  const status = raw.status === "cancelled" ? "closed" : raw.status === "closed" ? "closed" : "open";

  return {
    id,
    title: raw.title,
    ownerUid: raw.ownerUid,
    ownerNickname: raw.ownerNickname,
    city: raw.city,
    district: raw.district,
    venue: raw.venue,
    date: raw.date,
    weekday: raw.weekday,
    startTime: raw.startTime,
    endTime: raw.endTime,
    ntrpRequired: raw.ntrpRequired ?? [],
    totalSlots: raw.totalSlots,
    filledSlots: raw.filledSlots ?? 0,
    note: raw.note ?? "",
    status,
    joinMode: raw.joinMode ?? "approval",
    joinCode: raw.joinCode,
    isDeleted: raw.isDeleted ?? false,
    applicants,
  };
}

export function toChatMessage(raw: SchemaChatMessage & { msgId?: string }): ChatMessage {
  const id = raw.msgId ?? `msg-${Date.now()}`;
  return {
    id,
    senderUid: raw.senderUid,
    senderNickname: raw.senderNickname,
    content: raw.content,
    timestamp: toMillis(raw.createdAt),
    type: raw.msgType === "system" ? "system" : "text",
    readBy: raw.readBy ?? [],
  };
}

export function toUiConversation(
  id: string,
  raw: SchemaConversation & Partial<Conversation> & { unreadByUid?: Record<string, number> },
  messages: ChatMessage[],
  currentUid?: string,
): Conversation {
  const last = messages.at(-1);
  const perUserUnread = currentUid ? raw.unreadByUid?.[currentUid] : undefined;
  const unreadFromOthers = messages.filter(
    (m) =>
      m.senderUid !== currentUid &&
      m.senderUid !== "system" &&
      !(m.readBy ?? []).includes(currentUid ?? ""),
  ).length;

  return {
    id,
    type: raw.type,
    participants: raw.participants ?? [],
    name: raw.name,
    relatedId: raw.relatedId,
    messages,
    lastMessage: raw.lastMessage ?? last?.content,
    lastMessageTime: raw.lastMessageTime ?? (last ? last.timestamp : toMillis(raw.updatedAt)),
    unreadCount: perUserUnread ?? raw.unreadCount ?? unreadFromOthers,
    status: raw.status,
    ownerUid: raw.ownerUid,
  };
}
