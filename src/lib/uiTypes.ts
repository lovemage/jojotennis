import type { NewsArticle } from "@/data/news";

export type { NewsArticle };

export interface User {
  uid: string;
  email: string;
  provider?: "password" | "google" | "line";
  emailVerified?: boolean;
  emailVerificationSentAt?: number;
  nickname: string;
  ntrp: string;
  region: string;
  yearsPlaying: number;
  avatarInitial: string;
  avatarUrl?: string;
  role?: "user" | "admin" | "coach";
  isActive?: boolean;
  createdAt?: number;
  nicknameChangesUsed?: number;
}

export interface Message {
  id: string;
  type:
    | "match_request"
    | "match_accepted"
    | "match_declined"
    | "club_join"
    | "coach_msg"
    | "system";
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
}

export type MatchJoinMode = "public" | "private" | "approval";

export interface Match {
  id: string;
  title: string;
  ownerUid: string;
  ownerNickname: string;
  city: string;
  district: string;
  venue: string;
  date: string;
  weekday: string;
  startTime: string;
  endTime: string;
  ntrpRequired: string[];
  totalSlots: number;
  filledSlots: number;
  note: string;
  status: "open" | "closed";
  joinMode?: MatchJoinMode;
  joinCode?: string;
  isDeleted?: boolean;
  applicants: {
    uid: string;
    nickname: string;
    status: "pending" | "accepted" | "declined" | "removed";
  }[];
}

export interface ChatMessage {
  id: string;
  senderUid: string;
  senderNickname: string;
  content: string;
  timestamp: number;
  type: "text" | "system";
  readBy?: string[];
}

export interface Conversation {
  id: string;
  type: "direct" | "match" | "club";
  participants: string[];
  name: string;
  relatedId?: string;
  messages: ChatMessage[];
  lastMessage?: string;
  lastMessageTime?: number;
  unreadCount: number;
  status?: "waiting" | "confirmed";
  ownerUid?: string;
}

export interface StudentNeedRecord {
  id: string;
  ownerUid: string;
  ownerNickname: string;
  title: string;
  city: string;
  district: string;
  targetLevel: string;
  preferredTime: string;
  budget: string;
  intro: string;
  createdAt: number;
  status: "active" | "closed";
}

export interface CourtReport {
  id: string;
  reporterUid: string;
  reporterNickname: string;
  name: string;
  city: string;
  district: string;
  address: string;
  courtCount: string;
  bookingMethod: string;
  note: string;
  status: "pending" | "approved" | "rejected";
  createdAt: number;
  reviewedAt?: number;
}
