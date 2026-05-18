export type MessageType =
  | "match_request"
  | "match_accepted"
  | "match_declined"
  | "club_join"
  | "coach_message"
  | "system";

export type Message = {
  id: string;
  type: MessageType;
  from: string;
  content: string;
  timestamp: string;
  isRead: boolean;
  relatedId?: string;
};

const messagesStorageKey = "jojo_messages";

export function getMessages() {
  if (typeof window === "undefined") {
    return [] as Message[];
  }

  return JSON.parse(
    window.localStorage.getItem(messagesStorageKey) ?? "[]",
  ) as Message[];
}

export function saveMessages(messages: Message[]) {
  window.localStorage.setItem(messagesStorageKey, JSON.stringify(messages));
  window.dispatchEvent(new Event("jojo-messages-change"));
}

export function addMessage(message: Omit<Message, "id" | "timestamp" | "isRead">) {
  const nextMessages: Message[] = [
    {
      ...message,
      id: `message-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toLocaleString("zh-TW", { hour12: false }),
      isRead: false,
    },
    ...getMessages(),
  ];

  saveMessages(nextMessages);
}

export function getUnreadMessageCount() {
  return getMessages().filter((message) => !message.isRead).length;
}

export function markMessageAsRead(messageId: string) {
  saveMessages(
    getMessages().map((message) =>
      message.id === messageId ? { ...message, isRead: true } : message,
    ),
  );
}
