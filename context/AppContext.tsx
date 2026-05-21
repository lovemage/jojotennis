"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { User as FBUser } from "firebase/auth";
import { newsArticles as seedNewsArticles } from "@/data/news";
import {
  onAuthChange,
  getUserProfile,
  registerWithEmail,
  loginWithEmail,
  loginWithGoogle as loginWithGoogleService,
  logout as logoutService,
} from "@/lib/authService";
import {
  createMatch as createMatchService,
  applyToMatch,
  respondToApplication,
  closeMatch as closeMatchService,
  undoApplicationToPending,
  adminUpdateMatchStatus,
  adminSoftDeleteMatch,
} from "@/lib/matchService";
import {
  getOrCreateDirectConversation,
  sendMessage as sendChatMessageService,
  sendSystemMessage,
  createMatchConversation,
  markConversationMessagesRead,
  upsertConversationSnapshot,
  deleteConversationById,
  deleteConversationMessageById,
} from "@/lib/messageService";
import { saveInboxMessage } from "@/lib/inboxService";
import { createStudentPost, updateStudentPostStatus } from "@/lib/studentService";
import { submitPendingCourtReport } from "@/lib/courtService";
import { grantAdminEmail } from "@/lib/adminService";
import {
  saveNewsArticle as saveNewsArticleService,
  deleteNewsArticle as deleteNewsArticleService,
} from "@/lib/newsService";
import type {
  Match as SchemaMatch,
  MatchApplication,
  Conversation as SchemaConversation,
} from "@/lib/schema";
import { useAuthStore } from "@/stores/useAuthStore";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { USE_FIREBASE, SUPER_ADMIN_EMAILS } from "@/lib/config";
import {
  toMillis,
  toUiUser,
  toUiMatch,
  toChatMessage,
  toUiConversation,
} from "@/lib/mappers";
import {
  useFirebaseCoreListeners,
  useFirebaseInboxListener,
  useFirebaseConversationListeners,
} from "@/hooks/useFirebaseDataListeners";
import { updateUserProfile as updateUserProfileService, updateUserAdminFields } from "@/lib/userService";
import { syncAuthCookies } from "@/lib/authCookies";
import type {
  User,
  Message,
  Match,
  ChatMessage,
  Conversation,
  StudentNeedRecord,
  CourtReport,
  NewsArticle,
} from "@/lib/uiTypes";

export type {
  User,
  Message,
  Match,
  ChatMessage,
  Conversation,
  StudentNeedRecord,
  CourtReport,
  NewsArticle,
};

// ── Mock auth accounts (local mode) ─────────────────────────────────────────

type MockAccount = User & { password: string };

const MOCK_ACCOUNTS: MockAccount[] = [
  {
    uid: "u001",
    email: "test@jojo.tw",
    password: "test1234",
    nickname: "Sabrina",
    ntrp: "3.5",
    region: "台北市",
    yearsPlaying: 4,
    avatarInitial: "S",
  },
  {
    uid: "u002",
    email: "coach@jojo.tw",
    password: "coach1234",
    nickname: "王教練",
    ntrp: "5.0",
    region: "台北市",
    yearsPlaying: 15,
    avatarInitial: "王",
  },
  {
    uid: "u003",
    email: "beginner@jojo.tw",
    password: "begin1234",
    nickname: "小明",
    ntrp: "1.5",
    region: "新北市",
    yearsPlaying: 1,
    avatarInitial: "明",
  },
];

const INITIAL_MATCHES: Match[] = [
  {
    id: "m001",
    title: "下班後穩定對拉",
    ownerUid: "u002",
    ownerNickname: "王教練",
    city: "台北市",
    district: "大安區",
    venue: "大安森林公園網球場",
    date: "2026/05/20",
    weekday: "週三",
    startTime: "19:00",
    endTime: "21:00",
    ntrpRequired: ["3"],
    totalSlots: 4,
    filledSlots: 2,
    note: "以多拍穩定和基本發球練習為主，新手友善。",
    status: "open",
    applicants: [],
  },
  {
    id: "m002",
    title: "週末室內場單打",
    ownerUid: "u003",
    ownerNickname: "小明",
    city: "台北市",
    district: "信義區",
    venue: "台北室內網球場",
    date: "2026/05/22",
    weekday: "週六",
    startTime: "10:00",
    endTime: "12:00",
    ntrpRequired: ["1", "2"],
    totalSlots: 2,
    filledSlots: 0,
    note: "初學互練，歡迎新手。",
    status: "open",
    applicants: [],
  },
];

function omitPassword(account: MockAccount): User {
  const { password: _password, ...userData } = account;
  return userData;
}

function getStoredAccounts(): MockAccount[] {
  if (typeof window === "undefined") return MOCK_ACCOUNTS;
  const extra = JSON.parse(window.localStorage.getItem("jojo_mock_accounts") ?? "[]") as MockAccount[];
  return [...MOCK_ACCOUNTS, ...extra];
}

// ── Context ─────────────────────────────────────────────────────────────────

interface AppState {
  fbUser: FBUser | null;
  user: User | null;
  loading: boolean;
  authReady: boolean;
  isAdmin: boolean;
  users: User[];
  messages: Message[];
  matches: Match[];
  conversations: Conversation[];
  newsArticles: NewsArticle[];
  studentNeeds: StudentNeedRecord[];
  courtReports: CourtReport[];
  unreadCount: number;
  unreadTotal: number;
  refreshUser: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<boolean>;
  logout: () => void;
  register: (data: Partial<User> & { email: string; password: string }) => Promise<boolean>;
  updateProfile: (data: Partial<User>) => void;
  updateUserByAdmin: (uid: string, data: Partial<User>) => void;
  sendMessage: (
    msg: Omit<Message, "id" | "timestamp" | "isRead" | "isHandled" | "handledAt">,
  ) => void;
  markAllRead: () => void;
  addMatch: (match: Omit<Match, "id" | "filledSlots" | "applicants" | "status">) => void;
  closeMatch: (matchId: string) => void;
  applyMatch: (matchId: string) => void;
  respondToApplicant: (matchId: string, applicantUid: string, accept: boolean) => void;
  getOrCreateConversation: (
    targetUid: string,
    targetNickname: string,
    options?: {
      type?: Conversation["type"];
      relatedId?: string;
      name?: string;
      systemMessage?: string;
      participants?: string[];
      ownerUid?: string;
    },
  ) => string;
  sendChatMessage: (conversationId: string, content: string) => void;
  markConversationRead: (conversationId: string) => void;
  undoApplicantDecision: (matchId: string, applicantUid: string) => void;
  addStudentNeed: (
    need: Omit<StudentNeedRecord, "id" | "ownerUid" | "ownerNickname" | "createdAt" | "status">,
  ) => void;
  updateStudentNeedStatus: (needId: string, status: StudentNeedRecord["status"]) => void;
  addCourtReport: (
    report: Omit<
      CourtReport,
      "id" | "reporterUid" | "reporterNickname" | "status" | "createdAt" | "reviewedAt"
    >,
  ) => void;
  reviewCourtReport: (reportId: string, status: "approved" | "rejected") => void | Promise<void>;
  addAdminUser: (email: string) => void;
  saveNewsArticle: (article: NewsArticle, coverFile?: File) => Promise<void>;
  deleteNewsArticle: (articleId: string) => void;
  updateMatchStatus: (matchId: string, status: Match["status"]) => void;
  deleteMatch: (matchId: string) => void;
  deleteConversation: (conversationId: string) => void;
  deleteConversationMessage: (conversationId: string, messageId: string) => void;
}

const AppContext = createContext<AppState | null>(null);

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return {
    ...ctx,
    users: ctx.users ?? [],
    messages: ctx.messages ?? [],
    matches: ctx.matches ?? [],
    conversations: ctx.conversations ?? [],
    newsArticles: ctx.newsArticles ?? [],
    studentNeeds: ctx.studentNeeds ?? [],
    courtReports: ctx.courtReports ?? [],
  };
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [fbUser, setFbUser] = useState<FBUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [matches, setMatches] = useState<Match[]>(USE_FIREBASE ? [] : INITIAL_MATCHES);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>(USE_FIREBASE ? [] : seedNewsArticles);
  const [studentNeeds, setStudentNeeds] = useState<StudentNeedRecord[]>([]);
  const [courtReports, setCourtReports] = useState<CourtReport[]>([]);
  const [adminEmails, setAdminEmails] = useState<string[]>(SUPER_ADMIN_EMAILS);
  const [rawSchemaMatches, setRawSchemaMatches] = useState<(SchemaMatch & { matchId?: string })[]>([]);
  const [applications, setApplications] = useState<MatchApplication[]>([]);
  const [convMeta, setConvMeta] = useState<Record<string, SchemaConversation & Partial<Conversation>>>({});
  const [convMessages, setConvMessages] = useState<Record<string, ChatMessage[]>>({});
  const messageUnsubs = useRef<Record<string, () => void>>({});

  const isAdmin = useMemo(
    () => !!user && adminEmails.map((e) => e.toLowerCase()).includes(user.email.toLowerCase()),
    [user, adminEmails],
  );

  const mergedConversations = useMemo(() => {
    return Object.entries(convMeta)
      .map(([id, meta]) => toUiConversation(id, meta, convMessages[id] ?? [], user?.uid))
      .sort((a, b) => (b.lastMessageTime ?? 0) - (a.lastMessageTime ?? 0));
  }, [convMeta, convMessages, user?.uid]);

  const displayConversations = USE_FIREBASE ? mergedConversations : conversations;

  const displayMatches = useMemo(() => {
    if (!USE_FIREBASE) return matches;
    return rawSchemaMatches.map((m) => toUiMatch(m, m.matchId ?? (m as { id?: string }).id ?? "", applications));
  }, [matches, rawSchemaMatches, applications]);

  useEffect(() => {
    if (!USE_FIREBASE) return;
    setMatches(displayMatches);
  }, [displayMatches]);

  const unreadCount = useMemo(() => {
    const chats = displayConversations.reduce((sum, c) => sum + c.unreadCount, 0);
    if (USE_FIREBASE) return chats;
    const inbox = messages.filter((m) => m.toUid === user?.uid && !m.isRead).length;
    return inbox + chats;
  }, [messages, displayConversations, user?.uid]);

  useEffect(() => {
    useAuthStore.getState().setAuth({
      fbUser,
      user: user
        ? {
            uid: user.uid,
            email: user.email,
            nickname: user.nickname,
            ntrp: user.ntrp,
            region: user.region,
          }
        : null,
      loading: !authReady || loading,
    });
  }, [fbUser, user, loading, authReady]);

  useEffect(() => {
    useNotificationStore.getState().setUnreadTotal(unreadCount);
  }, [unreadCount]);

  const refreshUser = useCallback(async () => {
    if (!fbUser) return;
    const profile = await getUserProfile(fbUser.uid);
    if (profile) setUser(toUiUser(fbUser.uid, fbUser.email, profile));
  }, [fbUser]);

  // ── Bootstrap: auth + localStorage ────────────────────────────────────────

  useEffect(() => {
    if (USE_FIREBASE) {
      const unsub = onAuthChange(async (firebaseUser) => {
        setLoading(true);
        setFbUser(firebaseUser);
        if (!firebaseUser) {
          setUser(null);
          setMessages([]);
          setLoading(false);
          setAuthReady(true);
          return;
        }
        try {
          const profile = await getUserProfile(firebaseUser.uid);
          setUser(
            profile
              ? toUiUser(firebaseUser.uid, firebaseUser.email, profile)
              : toUiUser(firebaseUser.uid, firebaseUser.email),
          );
        } catch {
          setUser(toUiUser(firebaseUser.uid, firebaseUser.email));
        }
        setLoading(false);
        setAuthReady(true);
      });
      return unsub;
    }

    const saved = localStorage.getItem("jojo_user");
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<User>;
      if (parsed.uid) setUser(parsed as User);
    }
    const savedMsgs = localStorage.getItem("jojo_messages");
    if (savedMsgs) {
      setMessages(
        (JSON.parse(savedMsgs) as Partial<Message>[]).map((message) => ({
          id: message.id ?? `msg${Date.now()}`,
          type: message.type ?? "system",
          fromUid: message.fromUid ?? "system",
          fromNickname: message.fromNickname ?? "揪揪網球",
          toUid: message.toUid ?? "system",
          content: message.content ?? "",
          timestamp: message.timestamp ?? Date.now(),
          isRead: message.isRead ?? false,
          isHandled: message.isHandled ?? false,
          handledStatus: message.handledStatus,
          handledAt: message.handledAt,
          relatedId: message.relatedId,
        })),
      );
    }
    const savedMatches = localStorage.getItem("jojo_matches");
    if (savedMatches) {
      const parsedMatches = JSON.parse(savedMatches) as Match[];
      if (parsedMatches.length > 0 && "ownerUid" in parsedMatches[0]) {
        setMatches(parsedMatches);
      }
    }
    const savedConversations = localStorage.getItem("jojo_conversations");
    if (savedConversations) setConversations(JSON.parse(savedConversations) as Conversation[]);
    const savedStudentNeeds = localStorage.getItem("jojo_student_needs");
    if (savedStudentNeeds) setStudentNeeds(JSON.parse(savedStudentNeeds) as StudentNeedRecord[]);
    const savedCourtReports = localStorage.getItem("jojo_court_reports");
    if (savedCourtReports) setCourtReports(JSON.parse(savedCourtReports) as CourtReport[]);
    const savedNews = localStorage.getItem("jojo_news_articles");
    if (savedNews) setNewsArticles(JSON.parse(savedNews) as NewsArticle[]);
    const savedAdmins = localStorage.getItem("jojo_admin_emails");
    if (savedAdmins) {
      setAdminEmails(Array.from(new Set([...SUPER_ADMIN_EMAILS, ...JSON.parse(savedAdmins)])));
    }
    setLoading(false);
    setAuthReady(true);
  }, []);

  // ── Firebase listeners（src/hooks/useFirebaseDataListeners） ───────────────

  useFirebaseCoreListeners(USE_FIREBASE, user?.uid, {
    setRawSchemaMatches,
    setApplications,
    setUsers,
    setNewsArticles,
    setStudentNeeds,
    setCourtReports,
    setAdminEmails,
  });

  useFirebaseInboxListener(USE_FIREBASE, user?.uid, setMessages);

  useFirebaseConversationListeners(
    USE_FIREBASE,
    user?.uid,
    isAdmin,
    messageUnsubs,
    setConvMeta,
    setConvMessages,
  );

  // ── Persist local state ───────────────────────────────────────────────────

  useEffect(() => {
    if (USE_FIREBASE) return;
    if (user) localStorage.setItem("jojo_user", JSON.stringify(user));
    else localStorage.removeItem("jojo_user");
  }, [user]);

  useEffect(() => {
    if (USE_FIREBASE) return;
    localStorage.setItem("jojo_messages", JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    if (USE_FIREBASE) return;
    localStorage.setItem("jojo_matches", JSON.stringify(matches));
  }, [matches]);

  useEffect(() => {
    if (USE_FIREBASE) return;
    localStorage.setItem("jojo_conversations", JSON.stringify(conversations));
  }, [conversations]);

  useEffect(() => {
    if (USE_FIREBASE) return;
    localStorage.setItem("jojo_student_needs", JSON.stringify(studentNeeds));
  }, [studentNeeds]);

  useEffect(() => {
    if (USE_FIREBASE) return;
    localStorage.setItem("jojo_court_reports", JSON.stringify(courtReports));
  }, [courtReports]);

  useEffect(() => {
    if (USE_FIREBASE) return;
    try {
      localStorage.setItem("jojo_news_articles", JSON.stringify(newsArticles));
    } catch {
      localStorage.removeItem("jojo_news_articles");
    }
  }, [newsArticles]);

  useEffect(() => {
    if (USE_FIREBASE) return;
    localStorage.setItem("jojo_admin_emails", JSON.stringify(adminEmails));
  }, [adminEmails]);

  useEffect(() => {
    if (!authReady) return;
    syncAuthCookies(user, isAdmin);
  }, [user, isAdmin, authReady]);

  // ── Auth actions ──────────────────────────────────────────────────────────

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    if (USE_FIREBASE) {
      try {
        await loginWithEmail(email, password);
        return true;
      } catch {
        return false;
      }
    }
    const found = getStoredAccounts().find((a) => a.email === email && a.password === password);
    if (!found) return false;
    setUser(omitPassword(found));
    return true;
  }, []);

  const loginWithGoogle = useCallback(async (): Promise<boolean> => {
    if (!USE_FIREBASE) return false;
    try {
      await loginWithGoogleService();
      return true;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    if (USE_FIREBASE) void logoutService();
    setUser(null);
    setFbUser(null);
    syncAuthCookies(null, false);
    if (!USE_FIREBASE) localStorage.removeItem("jojo_user");
  }, []);

  const register = useCallback(
    async (data: Partial<User> & { email: string; password: string }): Promise<boolean> => {
      if (USE_FIREBASE) {
        try {
          await registerWithEmail(data.email, data.password, data.nickname || "新球友");
          return true;
        } catch {
          return false;
        }
      }
      if (getStoredAccounts().some((a) => a.email === data.email)) return false;
      const newUser: User = {
        uid: `u${Date.now()}`,
        email: data.email,
        nickname: data.nickname || "新球友",
        ntrp: data.ntrp || "2.0",
        region: data.region || "台北市",
        yearsPlaying: data.yearsPlaying || 0,
        avatarInitial: (data.nickname || "新")[0],
      };
      const extra = JSON.parse(localStorage.getItem("jojo_mock_accounts") ?? "[]") as MockAccount[];
      localStorage.setItem(
        "jojo_mock_accounts",
        JSON.stringify([...extra, { ...newUser, password: data.password }]),
      );
      setUser(newUser);
      return true;
    },
    [],
  );

  const updateProfile = useCallback(
    (data: Partial<User>) => {
      setUser((prev) => {
        if (!prev) return null;
        const next = { ...prev, ...data };
        if (USE_FIREBASE) {
          void updateUserProfileService(prev.uid, {
            nickname: next.nickname,
            ntrp: next.ntrp,
            region: next.region,
            yearsPlaying: next.yearsPlaying,
          });
        }
        return next;
      });
    },
    [],
  );

  const updateUserByAdmin = useCallback(
    (uid: string, data: Partial<User>) => {
      if (!isAdmin) return;
      setUsers((prev) =>
        prev.map((item) => (item.uid === uid ? { ...item, ...data } : item)),
      );
      if (user?.uid === uid) setUser((prev) => (prev ? { ...prev, ...data } : prev));
      if (USE_FIREBASE) {
        const { avatarInitial: _a, createdAt: _c, uid: _u, ...payload } = data;
        void updateUserAdminFields(uid, payload);
      }
    },
    [isAdmin, user?.uid],
  );

  const persistInboxMessage = useCallback((msg: Message) => {
    if (!USE_FIREBASE) return;
    void saveInboxMessage(msg);
  }, []);

  const sendMessage = useCallback(
    (msg: Omit<Message, "id" | "timestamp" | "isRead" | "isHandled" | "handledAt">) => {
      const newMsg: Message = {
        ...msg,
        id: `msg${Date.now()}`,
        timestamp: Date.now(),
        isRead: false,
        isHandled: false,
      };
      setMessages((prev) => [newMsg, ...prev]);
      persistInboxMessage(newMsg);
    },
    [persistInboxMessage],
  );

  const markAllRead = useCallback(() => {
    setMessages((prev) => {
      const next = prev.map((m) => (m.toUid === user?.uid ? { ...m, isRead: true } : m));
      if (USE_FIREBASE) {
        next.forEach((m) => {
          if (m.toUid === user?.uid) persistInboxMessage(m);
        });
      }
      return next;
    });
    if (USE_FIREBASE) {
      setConvMeta((prev) => {
        const updated = Object.fromEntries(
          Object.entries(prev).map(([id, meta]) => [id, { ...meta, unreadCount: 0 }]),
        );
        return updated;
      });
    } else {
      setConversations((prev) => prev.map((c) => ({ ...c, unreadCount: 0 })));
    }
  }, [persistInboxMessage, user?.uid]);

  const persistConversationLocal = useCallback((conversation: Conversation) => {
    if (USE_FIREBASE) {
      void upsertConversationSnapshot({
        id: conversation.id,
        type: conversation.type,
        participants: conversation.participants,
        name: conversation.name,
        relatedId: conversation.relatedId,
        lastMessage: conversation.lastMessage,
        unreadCount: conversation.unreadCount,
        status: conversation.status,
        ownerUid: conversation.ownerUid,
      });
    }
  }, []);

  const getOrCreateConversation = useCallback(
    (
      targetUid: string,
      targetNickname: string,
      options?: {
        type?: Conversation["type"];
        relatedId?: string;
        name?: string;
        systemMessage?: string;
        participants?: string[];
        ownerUid?: string;
      },
    ): string => {
      if (!user) return "";

      const type = options?.type ?? "direct";
      const participants = Array.from(new Set([user.uid, targetUid, ...(options?.participants ?? [])]));

      const existing = displayConversations.find((c) => {
        if (options?.relatedId) return c.relatedId === options.relatedId && c.type === type;
        return (
          c.type === "direct" &&
          participants.every((uid) => c.participants.includes(uid)) &&
          c.participants.length === participants.length
        );
      });
      if (existing) return existing.id;

      if (USE_FIREBASE) {
        void (async () => {
          if (type === "match" && options?.relatedId) {
            await createMatchConversation(options.relatedId, options.name ?? targetNickname, options.ownerUid ?? user.uid);
            if (options.systemMessage) await sendSystemMessage(`match_${options.relatedId}`, options.systemMessage);
            return;
          }
          if (type === "club" && options?.relatedId) {
            const convId = `club_${options.relatedId}`;
            if (options.systemMessage) await sendSystemMessage(convId, options.systemMessage);
            return;
          }
          const convId = await getOrCreateDirectConversation(targetUid, targetNickname, user.uid);
          if (options?.systemMessage) await sendSystemMessage(convId, options.systemMessage);
        })();
        if (type === "match" && options?.relatedId) return `match_${options.relatedId}`;
        if (type === "club" && options?.relatedId) return `club_${options.relatedId}`;
        return [user.uid, targetUid].sort().join("_");
      }

      const now = Date.now();
      const systemMsgs: ChatMessage[] = options?.systemMessage
        ? [
            {
              id: `chat-${now}`,
              senderUid: "system",
              senderNickname: "揪揪網球",
              content: options.systemMessage,
              timestamp: now,
              type: "system",
            },
          ]
        : [];

      const conversation: Conversation = {
        id: `${type}-${options?.relatedId ?? targetUid}-${now}`,
        type,
        participants,
        name: options?.name ?? targetNickname,
        relatedId: options?.relatedId,
        messages: systemMsgs,
        lastMessage: options?.systemMessage,
        lastMessageTime: now,
        unreadCount: 0,
        status: type === "match" ? "waiting" : undefined,
        ownerUid: options?.ownerUid,
      };

      setConversations((prev) => [conversation, ...prev]);
      return conversation.id;
    },
    [user, displayConversations],
  );

  const sendChatMessage = useCallback(
    (conversationId: string, content: string) => {
      if (!user || !content.trim()) return;

      const trimmed = content.trim();
      const isAnnouncement =
        trimmed.startsWith("公告：") &&
        displayConversations.find((c) => c.id === conversationId)?.type === "club";

      if (USE_FIREBASE) {
        void sendChatMessageService(
          conversationId,
          isAnnouncement ? "system" : user.uid,
          isAnnouncement ? "社團公告" : user.nickname,
          trimmed,
        );
        return;
      }

      const now = Date.now();
      let nextConversation: Conversation | null = null;
      setConversations((prev) =>
        prev.map((conversation) => {
          if (conversation.id !== conversationId) return conversation;
          const chatMsg: ChatMessage = {
            id: `chat-${now}`,
            senderUid: isAnnouncement ? "system" : user.uid,
            senderNickname: isAnnouncement ? "社團公告" : user.nickname,
            content: trimmed,
            timestamp: now,
            type: isAnnouncement ? "system" : "text",
          };
          nextConversation = {
            ...conversation,
            messages: [...conversation.messages, chatMsg],
            lastMessage: trimmed,
            lastMessageTime: now,
          };
          return nextConversation;
        }),
      );
      if (nextConversation) persistConversationLocal(nextConversation);
    },
    [user, displayConversations, persistConversationLocal],
  );

  const markConversationRead = useCallback(
    (conversationId: string) => {
      if (USE_FIREBASE && user?.uid) {
        void markConversationMessagesRead(conversationId, user.uid);
        setConvMeta((prev) => ({
          ...prev,
          [conversationId]: { ...prev[conversationId], unreadCount: 0 },
        }));
        return;
      }
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c)),
      );
    },
    [user?.uid],
  );

  const addSystemChatMessage = useCallback(
    (relatedId: string, content: string, status?: Conversation["status"]) => {
      const now = Date.now();
      if (USE_FIREBASE) {
        void sendSystemMessage(
          relatedId.startsWith("match_") || relatedId.startsWith("club_")
            ? relatedId
            : `match_${relatedId}`,
          content,
        );
        return;
      }
      setConversations((prev) =>
        prev.map((conversation) => {
          if (conversation.relatedId !== relatedId && conversation.id !== relatedId) return conversation;
          const next: Conversation = {
            ...conversation,
            status: status ?? conversation.status,
            messages: [
              ...conversation.messages,
              {
                id: `chat-${now}`,
                senderUid: "system",
                senderNickname: "揪揪網球",
                content,
                timestamp: now,
                type: "system",
              },
            ],
            lastMessage: content,
            lastMessageTime: now,
            unreadCount: conversation.unreadCount + 1,
          };
          persistConversationLocal(next);
          return next;
        }),
      );
    },
    [persistConversationLocal],
  );

  const addMatch = useCallback(
    (match: Omit<Match, "id" | "filledSlots" | "applicants" | "status">) => {
      if (USE_FIREBASE && user) {
        void createMatchService({
          ownerUid: user.uid,
          ownerNickname: user.nickname,
          title: match.title,
          city: match.city,
          district: match.district,
          venue: match.venue,
          date: match.date,
          startTime: match.startTime,
          endTime: match.endTime,
          ntrpRequired: match.ntrpRequired,
          totalSlots: match.totalSlots,
          note: match.note,
        });
        return;
      }
      const newMatch: Match = {
        ...match,
        id: `m${Date.now()}`,
        filledSlots: 0,
        applicants: [],
        status: "open",
      };
      setMatches((prev) => [newMatch, ...prev]);
    },
    [user],
  );

  const closeMatch = useCallback((matchId: string) => {
    if (USE_FIREBASE) {
      void closeMatchService(matchId);
      return;
    }
    setMatches((prev) => prev.map((m) => (m.id === matchId ? { ...m, status: "closed" } : m)));
  }, []);

  const applyMatch = useCallback(
    (matchId: string) => {
      if (!user) return;
      const match = (USE_FIREBASE ? displayMatches : matches).find((m) => m.id === matchId);
      if (!match || match.status === "closed") return;
      if (match.applicants.some((a) => a.uid === user.uid) || match.ownerUid === user.uid) return;

      if (USE_FIREBASE) {
        void applyToMatch(matchId, user.uid, user.nickname);
        sendMessage({
          type: "match_request",
          fromUid: user.uid,
          fromNickname: user.nickname,
          toUid: match.ownerUid,
          content: `${user.nickname} 申請加入你的「${match.title}」，請確認是否接受。`,
          relatedId: matchId,
        });
        return;
      }

      const nextMatch: Match = {
        ...match,
        applicants: [...match.applicants, { uid: user.uid, nickname: user.nickname, status: "pending" }],
      };
      setMatches((prev) => prev.map((m) => (m.id === matchId ? nextMatch : m)));
      sendMessage({
        type: "match_request",
        fromUid: user.uid,
        fromNickname: user.nickname,
        toUid: match.ownerUid,
        content: `${user.nickname} 申請加入你的「${match.title}」，請確認是否接受。`,
        relatedId: matchId,
      });
    },
    [user, matches, displayMatches, sendMessage],
  );

  const respondToApplicant = useCallback(
    async (matchId: string, applicantUid: string, accept: boolean) => {
      const match = (USE_FIREBASE ? displayMatches : matches).find((m) => m.id === matchId);
      if (!match) return;
      const applicant = match.applicants.find((a) => a.uid === applicantUid);
      if (!applicant) return;

      if (USE_FIREBASE) {
        const app = applications.find(
          (a) => a.matchId === matchId && a.applicantUid === applicantUid && a.status === "pending",
        );
        if (app?.appId) {
          await respondToApplication(app.appId, matchId, accept, applicantUid, applicant.nickname);
        }
        setMessages((prev) =>
          prev.map((message) => {
            const isRequest =
              message.type === "match_request" &&
              message.relatedId === matchId &&
              message.fromUid === applicantUid &&
              message.toUid === match.ownerUid;
            if (!isRequest) return message;
            const handled = {
              ...message,
              isHandled: true,
              handledStatus: accept ? ("accepted" as const) : ("declined" as const),
              handledAt: Date.now(),
            };
            persistInboxMessage(handled);
            return handled;
          }),
        );
        addSystemChatMessage(
          matchId,
          accept
            ? `主揪已接受 ${applicant.nickname} 加入「${match.title}」，可以在這裡討論集合地點與細節。`
            : `主揪已婉拒 ${applicant.nickname} 加入「${match.title}」。`,
          accept ? "confirmed" : "waiting",
        );
        return;
      }

      const updatedApplicants = match.applicants.map((a) =>
        a.uid === applicantUid ? { ...a, status: accept ? ("accepted" as const) : ("declined" as const) } : a,
      );
      const newFilledSlots = accept ? match.filledSlots + 1 : match.filledSlots;
      const autoClose = newFilledSlots >= match.totalSlots;
      const nextMatch: Match = {
        ...match,
        applicants: updatedApplicants,
        filledSlots: newFilledSlots,
        status: autoClose ? "closed" : match.status,
      };
      setMatches((prev) => prev.map((m) => (m.id === matchId ? nextMatch : m)));

      setMessages((prev) =>
        prev.map((message) => {
          const isRequest =
            message.type === "match_request" &&
            message.relatedId === matchId &&
            message.fromUid === applicantUid &&
            message.toUid === match.ownerUid;
          return isRequest
            ? {
                ...message,
                isHandled: true,
                handledStatus: accept ? ("accepted" as const) : ("declined" as const),
                handledAt: Date.now(),
              }
            : message;
        }),
      );

      sendMessage({
        type: accept ? "match_accepted" : "match_declined",
        fromUid: match.ownerUid,
        fromNickname: match.ownerNickname,
        toUid: applicantUid,
        content: accept
          ? `✅ 你已被接受加入「${match.title}」！記得準時到場。`
          : `你申請加入「${match.title}」未被接受，繼續找其他約球吧！`,
        relatedId: matchId,
      });

      addSystemChatMessage(
        matchId,
        accept
          ? `主揪已接受 ${applicant.nickname} 加入「${match.title}」`
          : `主揪已婉拒 ${applicant.nickname} 加入「${match.title}」`,
        accept ? "confirmed" : "waiting",
      );

      if (accept && autoClose) {
        sendMessage({
          type: "system",
          fromUid: "system",
          fromNickname: "揪揪網球",
          toUid: match.ownerUid,
          content: `🎉「${match.title}」招募已滿！祝大家打球愉快。`,
          relatedId: matchId,
        });
      }
    },
    [matches, displayMatches, applications, sendMessage, persistInboxMessage, addSystemChatMessage],
  );

  const undoApplicantDecision = useCallback(
    (matchId: string, applicantUid: string) => {
      const match = (USE_FIREBASE ? displayMatches : matches).find((m) => m.id === matchId);
      if (!match || match.ownerUid !== user?.uid) return;

      const nextMatch: Match = {
        ...match,
        applicants: match.applicants.map((a) =>
          a.uid === applicantUid ? { ...a, status: "pending" } : a,
        ),
        filledSlots: Math.max(
          match.applicants.some((a) => a.uid === applicantUid && a.status === "accepted")
            ? match.filledSlots - 1
            : match.filledSlots,
          0,
        ),
        status: "open",
      };

      if (USE_FIREBASE) {
        void undoApplicationToPending(matchId, applicantUid, nextMatch.filledSlots);
      } else {
        setMatches((prev) => prev.map((m) => (m.id === matchId ? nextMatch : m)));
      }
    },
    [user?.uid, matches, displayMatches],
  );

  const addStudentNeed = useCallback(
    (need: Omit<StudentNeedRecord, "id" | "ownerUid" | "ownerNickname" | "createdAt" | "status">) => {
      if (!user) return;
      const record: StudentNeedRecord = {
        ...need,
        id: `need-${Date.now()}`,
        ownerUid: user.uid,
        ownerNickname: user.nickname,
        createdAt: Date.now(),
        status: "active",
      };
      if (USE_FIREBASE) {
        void createStudentPost({
          uid: user.uid,
          nickname: user.nickname,
          title: record.title,
          city: record.city,
          district: record.district,
          targetLevel: record.targetLevel,
          preferredTime: record.preferredTime,
          budget: record.budget,
          intro: record.intro,
        });
        return;
      }
      setStudentNeeds((prev) => [record, ...prev]);
    },
    [user],
  );

  const updateStudentNeedStatus = useCallback(
    (needId: string, status: StudentNeedRecord["status"]) => {
      if (!isAdmin) return;
      setStudentNeeds((prev) => prev.map((n) => (n.id === needId ? { ...n, status } : n)));
      if (USE_FIREBASE) {
        void updateStudentPostStatus(needId, status);
      }
    },
    [isAdmin],
  );

  const addCourtReport = useCallback(
    (
      report: Omit<
        CourtReport,
        "id" | "reporterUid" | "reporterNickname" | "status" | "createdAt" | "reviewedAt"
      >,
    ) => {
      if (!user) return;
      const record: CourtReport = {
        ...report,
        id: `court-${Date.now()}`,
        reporterUid: user.uid,
        reporterNickname: user.nickname,
        status: "pending",
        createdAt: Date.now(),
      };
      if (USE_FIREBASE) {
        void submitPendingCourtReport({
          name: record.name,
          city: record.city,
          district: record.district,
          address: record.address,
          note: record.note,
          courtCount: record.courtCount,
          bookingMethod: record.bookingMethod,
          reportedByUid: user.uid,
          reportedByName: user.nickname,
        });
        return;
      }
      setCourtReports((prev) => [record, ...prev]);
    },
    [user],
  );

  const reviewCourtReport = useCallback(
    async (reportId: string, status: "approved" | "rejected") => {
      if (!isAdmin) return;
      if (USE_FIREBASE) {
        const { approvePendingCourt, rejectPendingCourt } = await import("@/lib/adminService");
        if (status === "approved") {
          await approvePendingCourt(reportId);
        } else {
          await rejectPendingCourt(reportId);
        }
        return;
      }
      setCourtReports((prev) =>
        prev.map((r) =>
          r.id === reportId ? { ...r, status, reviewedAt: Date.now() } : r,
        ),
      );
    },
    [isAdmin],
  );

  const addAdminUser = useCallback(
    (email: string) => {
      if (!isAdmin || !email.includes("@")) return;
      const normalized = email.trim().toLowerCase();
      setAdminEmails((prev) => Array.from(new Set([...prev, normalized])));
      if (USE_FIREBASE) {
        void grantAdminEmail(normalized);
      }
    },
    [isAdmin],
  );

  const saveNewsArticle = useCallback(
    async (article: NewsArticle, coverFile?: File) => {
      if (!isAdmin) return;
      const sortArticles = (list: NewsArticle[]) =>
        [...list].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

      if (USE_FIREBASE) {
        const saved = await saveNewsArticleService(article, coverFile);
        setNewsArticles((prev) => {
          const exists = prev.some((a) => a.id === saved.id);
          const next = exists
            ? prev.map((a) => (a.id === saved.id ? saved : a))
            : [saved, ...prev];
          return sortArticles(next);
        });
        return;
      }

      setNewsArticles((prev) => {
        const exists = prev.some((a) => a.id === article.id);
        const next = exists
          ? prev.map((a) => (a.id === article.id ? article : a))
          : [article, ...prev];
        return sortArticles(next);
      });
    },
    [isAdmin],
  );

  const deleteNewsArticle = useCallback(
    (articleId: string) => {
      if (!isAdmin) return;
      setNewsArticles((prev) => prev.filter((a) => a.id !== articleId));
      if (USE_FIREBASE) {
        void deleteNewsArticleService(articleId);
      }
    },
    [isAdmin],
  );

  const updateMatchStatus = useCallback(
    (matchId: string, status: Match["status"]) => {
      if (!isAdmin) return;
      if (USE_FIREBASE) {
        void adminUpdateMatchStatus(matchId, status);
      } else {
        setMatches((prev) => prev.map((m) => (m.id === matchId ? { ...m, status } : m)));
      }
    },
    [isAdmin],
  );

  const deleteMatch = useCallback(
    (matchId: string) => {
      if (!isAdmin) return;
      if (USE_FIREBASE) {
        void adminSoftDeleteMatch(matchId);
      } else {
        setMatches((prev) => prev.filter((m) => m.id !== matchId));
      }
    },
    [isAdmin],
  );

  const deleteConversation = useCallback(
    (conversationId: string) => {
      if (!isAdmin) return;
      if (USE_FIREBASE) {
        void deleteConversationById(conversationId);
        setConvMeta((prev) => {
          const next = { ...prev };
          delete next[conversationId];
          return next;
        });
        messageUnsubs.current[conversationId]?.();
        delete messageUnsubs.current[conversationId];
      } else {
        setConversations((prev) => prev.filter((c) => c.id !== conversationId));
      }
    },
    [isAdmin],
  );

  const deleteConversationMessage = useCallback(
    (conversationId: string, messageId: string) => {
      if (!isAdmin) return;
      if (USE_FIREBASE) {
        void deleteConversationMessageById(conversationId, messageId);
        setConvMessages((prev) => ({
          ...prev,
          [conversationId]: (prev[conversationId] ?? []).filter((m) => m.id !== messageId),
        }));
      } else {
        setConversations((prev) =>
          prev.map((conversation) => {
            if (conversation.id !== conversationId) return conversation;
            const nextMessages = conversation.messages.filter((m) => m.id !== messageId);
            return {
              ...conversation,
              messages: nextMessages,
              lastMessage: nextMessages.at(-1)?.content ?? "",
              lastMessageTime: nextMessages.at(-1)?.timestamp,
            };
          }),
        );
      }
    },
    [isAdmin],
  );

  const value: AppState = {
    fbUser,
    user,
    loading,
    authReady,
    isAdmin,
    users,
    messages,
    matches: USE_FIREBASE ? displayMatches : matches,
    conversations: displayConversations,
    newsArticles,
    studentNeeds,
    courtReports,
    unreadCount,
    unreadTotal: unreadCount,
    refreshUser,
    login,
    loginWithGoogle,
    logout,
    register,
    updateProfile,
    updateUserByAdmin,
    sendMessage,
    markAllRead,
    addMatch,
    closeMatch,
    applyMatch,
    respondToApplicant,
    getOrCreateConversation,
    sendChatMessage,
    markConversationRead,
    undoApplicantDecision,
    addStudentNeed,
    updateStudentNeedStatus,
    addCourtReport,
    reviewCourtReport,
    addAdminUser,
    saveNewsArticle,
    deleteNewsArticle,
    updateMatchStatus,
    deleteMatch,
    deleteConversation,
    deleteConversationMessage,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
