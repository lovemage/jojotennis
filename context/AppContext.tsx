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
  joinMatchWithCode,
  respondToApplication,
  updateMatchSettings as updateMatchSettingsService,
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
  subscribeToMessages,
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
import { USE_FIREBASE, USE_SUPABASE, SUPER_ADMIN_EMAILS } from "@/lib/config";
import { hasSupabaseConfig } from "@/lib/supabase";
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

// ── Context ─────────────────────────────────────────────────────────────────

interface AppState {
  fbUser: FBUser | null;
  user: User | null;
  loading: boolean;
  authReady: boolean;
  isAdmin: boolean;
  accountDisabledMessage: string | null;
  clearAccountDisabledMessage: () => void;
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
  addMatch: (match: Omit<Match, "id" | "filledSlots" | "applicants" | "status">) => Promise<string>;
  updateMatchSettings: (
    matchId: string,
    settings: Pick<Match, "city" | "district" | "venue" | "date" | "startTime" | "endTime" | "ntrpRequired" | "totalSlots" | "joinMode">,
  ) => Promise<{ ok: boolean; msg: string }>;
  closeMatch: (matchId: string) => void;
  applyMatch: (matchId: string, joinCode?: string) => Promise<{ ok: boolean; msg: string }>;
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
  subscribeConversationMessages: (conversationId: string) => () => void;
  getConversationMessages: (conversationId: string) => ChatMessage[];
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
  updateMatchStatus: (matchId: string, status: Match["status"]) => Promise<void>;
  deleteMatch: (matchId: string) => Promise<void>;
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
  const [matches, setMatches] = useState<Match[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([]);
  const [studentNeeds, setStudentNeeds] = useState<StudentNeedRecord[]>([]);
  const [courtReports, setCourtReports] = useState<CourtReport[]>([]);
  const [adminEmails, setAdminEmails] = useState<string[]>(SUPER_ADMIN_EMAILS);
  const [rawSchemaMatches, setRawSchemaMatches] = useState<(SchemaMatch & { matchId?: string })[]>([]);
  const [applications, setApplications] = useState<MatchApplication[]>([]);
  const [convMeta, setConvMeta] = useState<Record<string, SchemaConversation & Partial<Conversation>>>({});
  const [convMessages, setConvMessages] = useState<Record<string, ChatMessage[]>>({});
  const messageUnsubs = useRef<Record<string, () => void>>({});
  const [accountDisabledMessage, setAccountDisabledMessage] = useState<string | null>(null);

  const isAdmin = useMemo(
    () => !!user && adminEmails.map((e) => e.toLowerCase()).includes(user.email.toLowerCase()),
    [user, adminEmails],
  );

  const mergedConversations = useMemo(() => {
    return Object.entries(convMeta)
      .map(([id, meta]) => toUiConversation(id, meta, convMessages[id] ?? [], user?.uid))
      .sort((a, b) => (b.lastMessageTime ?? 0) - (a.lastMessageTime ?? 0));
  }, [convMeta, convMessages, user?.uid]);

  const displayConversations = mergedConversations;

  const displayMatches = useMemo(
    () =>
      rawSchemaMatches.map((m) =>
        toUiMatch(m, m.matchId ?? (m as { id?: string }).id ?? "", applications),
      ),
    [rawSchemaMatches, applications],
  );

  useEffect(() => {
    setMatches(displayMatches);
  }, [displayMatches]);

  const unreadCount = useMemo(
    () => displayConversations.reduce((sum, c) => sum + c.unreadCount, 0),
    [displayConversations],
  );

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
            avatarUrl: user.avatarUrl,
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

  // ── Firebase Auth ─────────────────────────────────────────────────────────

  useEffect(() => {
    return onAuthChange(async (firebaseUser) => {
      setFbUser(firebaseUser);
      if (firebaseUser) {
        try {
          const profile = await getUserProfile(firebaseUser.uid);
          if (profile && profile.isActive === false) {
            setAccountDisabledMessage("您的帳號已停用，請聯繫客服");
            await logoutService().catch(() => undefined);
            setUser(null);
            setFbUser(null);
            syncAuthCookies(null, false);
            setLoading(false);
            setAuthReady(true);
            return;
          }
          setUser(
            profile
              ? toUiUser(firebaseUser.uid, firebaseUser.email, profile)
              : toUiUser(firebaseUser.uid, firebaseUser.email),
          );
          setAccountDisabledMessage(null);
        } catch {
          setUser(toUiUser(firebaseUser.uid, firebaseUser.email));
        }
      } else {
        setUser(null);
        setMessages([]);
      }
      setLoading(false);
      setAuthReady(true);
    });
  }, []);

  // ── Firestore 即時監聽 ─────────────────────────────────────────────────────

  useFirebaseCoreListeners(true, user?.uid, {
    setRawSchemaMatches,
    setApplications,
    setUsers,
    setNewsArticles,
    setStudentNeeds,
    setCourtReports,
    setAdminEmails,
  });

  useFirebaseInboxListener(true, user?.uid, setMessages);

  useFirebaseConversationListeners(
    true,
    user?.uid,
    isAdmin,
    messageUnsubs,
    setConvMeta,
  );

  useEffect(() => {
    if (!authReady) return;
    syncAuthCookies(user, isAdmin);
  }, [user, isAdmin, authReady]);

  // ── Auth actions ──────────────────────────────────────────────────────────

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      await loginWithEmail(email, password);
      return true;
    } catch {
      return false;
    }
  }, []);

  const loginWithGoogle = useCallback(async (): Promise<boolean> => {
    try {
      await loginWithGoogleService();
      return true;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    void logoutService();
    setUser(null);
    setFbUser(null);
    syncAuthCookies(null, false);
  }, []);

  const register = useCallback(
    async (data: Partial<User> & { email: string; password: string }): Promise<boolean> => {
      try {
        await registerWithEmail(data.email, data.password, data.nickname || "新球友");
        return true;
      } catch {
        return false;
      }
    },
    [],
  );

  const updateProfile = useCallback(
    (data: Partial<User>) => {
      setUser((prev) => {
        if (!prev) return null;
        const next = { ...prev, ...data };
        if (USE_FIREBASE || (USE_SUPABASE && hasSupabaseConfig())) {
          const patch: Record<string, unknown> = {};
          if ("nickname" in data && data.nickname && data.nickname !== prev.nickname) {
            patch.nickname = data.nickname;
          }
          if ("ntrp" in data && data.ntrp !== prev.ntrp) patch.ntrp = data.ntrp;
          if ("region" in data && data.region !== prev.region) patch.region = data.region;
          if ("yearsPlaying" in data && data.yearsPlaying !== prev.yearsPlaying)
            patch.yearsPlaying = data.yearsPlaying;
          if ("avatarUrl" in data && data.avatarUrl !== prev.avatarUrl)
            patch.avatarUrl = data.avatarUrl;
          if (Object.keys(patch).length > 0) {
            void updateUserProfileService(prev.uid, patch);
          }
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
      if (USE_FIREBASE || (USE_SUPABASE && hasSupabaseConfig())) {
        const { avatarInitial: _a, createdAt: _c, uid: _u, ...payload } = data;
        void updateUserAdminFields(uid, payload);
      }
    },
    [isAdmin, user?.uid],
  );

  const persistInboxMessage = useCallback((msg: Message) => {
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
      if (USE_FIREBASE || (USE_SUPABASE && hasSupabaseConfig())) {
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

      if (USE_FIREBASE || (USE_SUPABASE && hasSupabaseConfig())) {
        void (async () => {
          if (type === "match" && options?.relatedId) {
            const convId = `match_${options.relatedId}`;
            if (options.systemMessage) void sendSystemMessage(convId, options.systemMessage);
            void createMatchConversation(options.relatedId, options.name ?? targetNickname, options.ownerUid ?? user.uid).catch((error) => {
              console.warn("[conversation] match metadata unavailable:", error);
            });
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

  const subscribeConversationMessages = useCallback(
    (conversationId: string) => {
      if (messageUnsubs.current[conversationId]) {
        return () => {
          messageUnsubs.current[conversationId]?.();
          delete messageUnsubs.current[conversationId];
        };
      }
      const unsub = subscribeToMessages(conversationId, (msgs) => {
        setConvMessages((prev) => ({
          ...prev,
          [conversationId]: msgs.map((m) => toChatMessage(m)),
        }));
      });
      messageUnsubs.current[conversationId] = unsub;
      return () => {
        messageUnsubs.current[conversationId]?.();
        delete messageUnsubs.current[conversationId];
      };
    },
    [],
  );

  const getConversationMessages = useCallback(
    (conversationId: string) => convMessages[conversationId] ?? [],
    [convMessages],
  );

  const sendChatMessage = useCallback(
    (conversationId: string, content: string) => {
      if (!user || !content.trim()) return;

      const trimmed = content.trim();
      const isAnnouncement =
        trimmed.startsWith("公告：") &&
        displayConversations.find((c) => c.id === conversationId)?.type === "club";

      if (USE_FIREBASE || (USE_SUPABASE && hasSupabaseConfig())) {
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
    async (match: Omit<Match, "id" | "filledSlots" | "applicants" | "status">) => {
      if (USE_FIREBASE && user) {
        return createMatchService({
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
          joinMode: match.joinMode,
        });
      }
      const newMatch: Match = {
        ...match,
        id: `m${Date.now()}`,
        filledSlots: 0,
        applicants: [],
        status: "open",
        joinMode: match.joinMode ?? "public",
        joinCode:
          match.joinMode === "private"
            ? String(Math.floor(100000 + Math.random() * 900000))
            : undefined,
      };
      setMatches((prev) => [newMatch, ...prev]);
      return newMatch.id;
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

  const updateMatchSettings = useCallback(
    async (
      matchId: string,
      settings: Pick<Match, "city" | "district" | "venue" | "date" | "startTime" | "endTime" | "ntrpRequired" | "totalSlots" | "joinMode">,
    ) => {
      if (!user) return { ok: false, msg: "請先登入" };
      const match = displayMatches.find((m) => m.id === matchId);
      if (!match) return { ok: false, msg: "球局不存在" };
      if (match.ownerUid !== user.uid) return { ok: false, msg: "只有主揪可以更新球局設定" };
      if (settings.totalSlots < match.filledSlots) {
        return { ok: false, msg: `人數不可小於已核准人數 ${match.filledSlots}` };
      }

      if (USE_FIREBASE) {
        try {
          return await updateMatchSettingsService(matchId, user.uid, {
            city: settings.city,
            district: settings.district,
            venue: settings.venue,
            date: settings.date,
            startTime: settings.startTime,
            endTime: settings.endTime,
            ntrpRequired: settings.ntrpRequired,
            totalSlots: settings.totalSlots,
            joinMode: settings.joinMode ?? "approval",
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "";
          if (message.includes("Quota exceeded") || message.includes("resource-exhausted")) {
            return { ok: false, msg: "Firebase 配額已用完，暫時無法更新球局設定。請稍後再試。" };
          }
          return { ok: false, msg: message || "更新球局設定失敗，請稍後再試" };
        }
      }

      setMatches((prev) => prev.map((m) => (m.id === matchId ? { ...m, ...settings } : m)));
      return { ok: true, msg: "球局設定已更新" };
    },
    [displayMatches, user],
  );

  const applyMatch = useCallback(
    async (matchId: string, joinCode?: string) => {
      if (!user) return { ok: false, msg: "請先登入" };
      const match = displayMatches.find((m) => m.id === matchId);
      if (!match || match.status === "closed") return { ok: false, msg: "球局不存在或已結束" };
      if (match.applicants.some((a) => a.uid === user.uid && a.status !== "declined" && a.status !== "removed") || match.ownerUid === user.uid) {
        return { ok: false, msg: "已加入或已申請此球局" };
      }

      const joinMode = match.joinMode ?? "approval";

      if (USE_FIREBASE) {
        try {
          const result =
            joinMode === "private"
              ? await joinMatchWithCode(matchId, joinCode ?? "", user.uid, user.nickname)
              : await applyToMatch(matchId, user.uid, user.nickname);

          if (result.ok && joinMode === "approval") {
            sendMessage({
              type: "match_request",
              fromUid: user.uid,
              fromNickname: user.nickname,
              toUid: match.ownerUid,
              content: `${user.nickname} 申請加入你的「${match.title}」，請確認是否接受。`,
              relatedId: matchId,
            });
          }
          return result;
        } catch (error) {
          const message = error instanceof Error ? error.message : "";
          if (message.includes("Quota exceeded") || message.includes("resource-exhausted")) {
            return { ok: false, msg: "Firebase 配額已用完，暫時無法加入球局。請稍後再試。" };
          }
          return { ok: false, msg: message || "加入球局失敗，請稍後再試" };
        }
      }

      if (joinMode === "private") {
        if (!joinCode?.trim() || joinCode.trim() !== match.joinCode) {
          return { ok: false, msg: "加入碼錯誤" };
        }
      }

      const autoJoin = joinMode === "public" || joinMode === "private";
      const nextMatch: Match = {
        ...match,
        filledSlots: autoJoin ? match.filledSlots + 1 : match.filledSlots,
        status:
          autoJoin && match.filledSlots + 1 >= match.totalSlots ? "closed" : match.status,
        applicants: [
          ...match.applicants,
          {
            uid: user.uid,
            nickname: user.nickname,
            status: autoJoin ? "accepted" : "pending",
          },
        ],
      };
      setMatches((prev) => prev.map((m) => (m.id === matchId ? nextMatch : m)));

      if (!autoJoin) {
        sendMessage({
          type: "match_request",
          fromUid: user.uid,
          fromNickname: user.nickname,
          toUid: match.ownerUid,
          content: `${user.nickname} 申請加入你的「${match.title}」，請確認是否接受。`,
          relatedId: matchId,
        });
        return { ok: true, msg: "申請已送出" };
      }

      return { ok: true, msg: "已成功加入球局" };
    },
    [user, displayMatches, sendMessage],
  );

  const respondToApplicant = useCallback(
    async (matchId: string, applicantUid: string, accept: boolean) => {
      const match = (displayMatches).find((m) => m.id === matchId);
      if (!match) return;
      if (match.ownerUid !== user?.uid) {
        throw new Error("只有主揪可以核准或婉拒球友");
      }
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
      const match = (displayMatches).find((m) => m.id === matchId);
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
    async (matchId: string, status: Match["status"]) => {
      if (!isAdmin) return;
      if (USE_FIREBASE) {
        await adminUpdateMatchStatus(matchId, status);
      } else {
        setMatches((prev) => prev.map((m) => (m.id === matchId ? { ...m, status } : m)));
      }
    },
    [isAdmin],
  );

  const deleteMatch = useCallback(
    async (matchId: string) => {
      if (!isAdmin) return;
      if (USE_FIREBASE) {
        await adminSoftDeleteMatch(matchId);
        const conversationId = `match_${matchId}`;
        await deleteConversationById(conversationId);
        setConvMeta((prev) => {
          const next = { ...prev };
          delete next[conversationId];
          return next;
        });
        messageUnsubs.current[conversationId]?.();
        delete messageUnsubs.current[conversationId];
      } else {
        setMatches((prev) => prev.filter((m) => m.id !== matchId));
        setConversations((prev) => prev.filter((c) => c.id !== `match_${matchId}`));
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

  const clearAccountDisabledMessage = useCallback(() => {
    setAccountDisabledMessage(null);
  }, []);

  const value: AppState = {
    fbUser,
    user,
    loading,
    authReady,
    isAdmin,
    accountDisabledMessage,
    clearAccountDisabledMessage,
    users,
    messages,
    matches: displayMatches,
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
    updateMatchSettings,
    closeMatch,
    applyMatch,
    respondToApplicant,
    getOrCreateConversation,
    sendChatMessage,
    subscribeConversationMessages,
    getConversationMessages,
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
