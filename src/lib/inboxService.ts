import { db } from "./firebase";
import { doc, setDoc } from "firebase/firestore";

export type InboxMessage = {
  id: string;
  type: string;
  fromUid: string;
  fromNickname: string;
  toUid: string;
  content: string;
  timestamp: number;
  isRead: boolean;
  relatedId?: string;
  isHandled?: boolean;
  handledStatus?: "accepted" | "declined";
  handledAt?: number;
};

export async function saveInboxMessage(msg: InboxMessage): Promise<void> {
  await setDoc(doc(db, "messages", msg.id), msg);
}
