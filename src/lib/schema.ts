export interface BaseDocument {
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
  deletedAt?: Date | null;
}

export interface User extends BaseDocument {
  uid: string;
  email: string;
  nickname: string;
  ntrp: string;
  region: string;
  yearsPlaying: number;
  avatarUrl: string;
  role: "user" | "admin" | "coach";
  isActive: boolean;
  heartsReceived: number;
  bio?: string;
}

export interface HeartRecord {
  id: string;
  matchId: string;
  fromUid: string;
  toUid: string;
  createdAt: Date;
}

export interface Court extends BaseDocument {
  courtId: string;
  name: string;
  city: string;
  district: string;
  address: string;
  lat: number;
  lng: number;
  surfaceType: "hard" | "clay" | "grass";
  indoor: "indoor" | "outdoor";
  totalCourts: number;
  hasNightLight: boolean;
  phone: string;
  bookingUrl: string;
  bookingMethod: string;
  notes: string;
  openHours: string;
  status: "active" | "pending" | "closed";
}

export interface PendingCourt {
  id: string;
  name: string;
  city: string;
  address: string;
  description: string;
  reportedByUid: string;
  reportedByName: string;
  status: "pending" | "approved" | "rejected";
  createdAt: Date;
}

export interface Match extends BaseDocument {
  matchId: string;
  ownerUid: string;
  ownerNickname: string;
  title: string;
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
  status: "open" | "closed" | "cancelled";
  note: string;
}

export interface MatchApplication extends BaseDocument {
  appId: string;
  matchId: string;
  applicantUid: string;
  applicantNickname: string;
  status: "pending" | "accepted" | "declined" | "removed";
}

export interface Club extends BaseDocument {
  clubId: string;
  ownerUid: string;
  ownerNickname: string;
  name: string;
  types: string[];
  city: string;
  ntrpLevels: string[];
  venue: string;
  schedule: string;
  description: string;
  memberCount: number;
  contactLine: string;
}

export interface ClubMember {
  memberId: string;
  clubId: string;
  uid: string;
  nickname: string;
  role: "owner" | "member";
  joinedAt: Date;
  isActive: boolean;
}

export interface Conversation {
  convId: string;
  type: "direct" | "match" | "club";
  participants: string[];
  relatedId?: string;
  name: string;
  lastMessage: string;
  lastSenderNickname: string;
  updatedAt: Date;
}

export interface Message {
  msgId: string;
  convId: string;
  senderUid: string;
  senderNickname: string;
  content: string;
  msgType: "text" | "system";
  readBy: string[];
  createdAt: Date;
}

export interface Coach extends BaseDocument {
  coachId: string;
  uid: string;
  nickname: string;
  city: string;
  ntrpRange: string;
  pricePerHour: number;
  bio: string;
  rating: number;
  isVerified: boolean;
}

export interface StudentPost extends BaseDocument {
  postId: string;
  uid: string;
  nickname: string;
  city: string;
  district: string;
  targetNtrp: string;
  preferTimes: string[];
  budget: string;
  description: string;
}

export interface News extends BaseDocument {
  newsId: string;
  title: string;
  slug: string;
  category: "賽事" | "品牌" | "新品" | "活動" | "教學";
  content: string;
  excerpt: string;
  coverImageUrl: string;
  isPublished: boolean;
  publishedAt: Date;
}
