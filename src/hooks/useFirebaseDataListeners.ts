import { useEffect, type MutableRefObject } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { subscribeToConversations, subscribeToMessages } from "@/lib/messageService";
import { subscribeToNews } from "@/lib/newsService";
import { SUPER_ADMIN_EMAILS } from "@/lib/config";
import { toMillis, toUiUser, toChatMessage } from "@/lib/mappers";
import type {
  Match as SchemaMatch,
  MatchApplication,
  User as SchemaUser,
  Conversation as SchemaConversation,
} from "@/lib/schema";
import type {
  User,
  Message,
  NewsArticle,
  StudentNeedRecord,
  CourtReport,
  ChatMessage,
  Conversation,
} from "@/lib/uiTypes";
import { newsArticles as seedNewsArticles } from "@/data/news";

type ConvMeta = Record<string, SchemaConversation & Partial<Conversation>>;

type CoreListenerSetters = {
  setRawSchemaMatches: (v: (SchemaMatch & { matchId?: string })[]) => void;
  setApplications: (v: MatchApplication[]) => void;
  setUsers: (v: User[]) => void;
  setNewsArticles: (v: NewsArticle[]) => void;
  setStudentNeeds: (v: StudentNeedRecord[]) => void;
  setCourtReports: (v: CourtReport[]) => void;
  setAdminEmails: (v: string[]) => void;
};

/** Firestore 核心集合即時監聽（matches / users / news / pending_courts 等） */
export function useFirebaseCoreListeners(enabled: boolean, setters: CoreListenerSetters) {
  useEffect(() => {
    if (!enabled) return;

    const unsubMatches = onSnapshot(
      query(collection(db, "matches"), where("isDeleted", "==", false), orderBy("createdAt", "desc")),
      (snap) => {
        setters.setRawSchemaMatches(
          snap.docs.map((d) => ({ matchId: d.id, ...d.data() }) as SchemaMatch & { matchId: string }),
        );
      },
    );

    const unsubApps = onSnapshot(
      query(collection(db, "match_applications"), where("isDeleted", "==", false)),
      (snap) => {
        setters.setApplications(
          snap.docs.map((d) => ({ appId: d.id, ...d.data() }) as MatchApplication),
        );
      },
    );

    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      setters.setUsers(
        snap.docs.map((d) => toUiUser(d.id, (d.data() as SchemaUser).email, d.data() as SchemaUser)),
      );
    });

    const unsubNews = subscribeToNews((items) => {
      setters.setNewsArticles(items.length > 0 ? items : seedNewsArticles);
    });

    const unsubStudent = onSnapshot(
      query(collection(db, "student_posts"), where("isDeleted", "==", false), orderBy("createdAt", "desc")),
      (snap) => {
        setters.setStudentNeeds(
          snap.docs.map((d) => {
            const data = d.data() as Record<string, unknown>;
            return {
              id: d.id,
              ownerUid: String(data.uid ?? ""),
              ownerNickname: String(data.nickname ?? "學員"),
              title: String(data.title ?? "學員找教練"),
              city: String(data.city ?? ""),
              district: String(data.district ?? ""),
              targetLevel: String(data.targetNtrp ?? data.targetLevel ?? ""),
              preferredTime: Array.isArray(data.preferTimes)
                ? (data.preferTimes as string[]).join("、")
                : String(data.preferredTime ?? ""),
              budget: String(data.budget ?? ""),
              intro: String(data.description ?? data.intro ?? ""),
              createdAt: toMillis(data.createdAt),
              status: data.status === "closed" ? "closed" : "active",
            } satisfies StudentNeedRecord;
          }),
        );
      },
    );

    const unsubCourts = onSnapshot(
      query(collection(db, "pending_courts"), orderBy("createdAt", "desc")),
      (snap) => {
        setters.setCourtReports(
          snap.docs.map((d) => {
            const data = d.data() as Record<string, unknown>;
            return {
              id: d.id,
              reporterUid: String(data.reportedByUid ?? ""),
              reporterNickname: String(data.reportedByName ?? "會員"),
              name: String(data.name ?? ""),
              city: String(data.city ?? ""),
              district: String(data.district ?? ""),
              address: String(data.address ?? ""),
              courtCount: String(data.courtCount ?? ""),
              bookingMethod: String(data.bookingMethod ?? ""),
              note: String(data.description ?? data.note ?? ""),
              status: (data.status as CourtReport["status"]) ?? "pending",
              createdAt: toMillis(data.createdAt),
              reviewedAt: data.reviewedAt ? toMillis(data.reviewedAt) : undefined,
            } satisfies CourtReport;
          }),
        );
      },
    );

    const unsubAdmins = onSnapshot(collection(db, "adminUsers"), (snap) => {
      const emails = snap.docs
        .map((d) => String((d.data() as { email?: string }).email ?? d.id))
        .filter(Boolean);
      setters.setAdminEmails(Array.from(new Set([...SUPER_ADMIN_EMAILS, ...emails])));
    });

    return () => {
      unsubMatches();
      unsubApps();
      unsubUsers();
      unsubNews();
      unsubStudent();
      unsubCourts();
      unsubAdmins();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Firestore setState 穩定
  }, [enabled]);
}

/** 使用者 inbox（legacy messages 集合） */
export function useFirebaseInboxListener(
  enabled: boolean,
  userUid: string | undefined,
  setMessages: (v: Message[]) => void,
) {
  useEffect(() => {
    if (!enabled || !userUid) return;

    return onSnapshot(query(collection(db, "messages"), where("toUid", "==", userUid)), (snap) => {
      setMessages(
        snap.docs
          .map((d) => {
            const data = d.data() as Record<string, unknown>;
            return {
              id: d.id,
              type: (data.type as Message["type"]) ?? "system",
              fromUid: String(data.fromUid ?? "system"),
              fromNickname: String(data.fromNickname ?? "揪揪網球"),
              toUid: String(data.toUid ?? userUid),
              content: String(data.content ?? ""),
              timestamp: toMillis(data.timestamp ?? data.createdAt),
              isRead: Boolean(data.isRead),
              relatedId: data.relatedId ? String(data.relatedId) : undefined,
              isHandled: Boolean(data.isHandled),
              handledStatus: data.handledStatus as Message["handledStatus"],
              handledAt: data.handledAt ? toMillis(data.handledAt) : undefined,
            } satisfies Message;
          })
          .sort((a, b) => b.timestamp - a.timestamp),
      );
    });
  }, [enabled, userUid, setMessages]);
}

/** conversations + subcollection messages */
export function useFirebaseConversationListeners(
  enabled: boolean,
  userUid: string | undefined,
  isAdmin: boolean,
  messageUnsubs: MutableRefObject<Record<string, () => void>>,
  setConvMeta: (fn: (prev: ConvMeta) => ConvMeta) => void,
  setConvMessages: (fn: (prev: Record<string, ChatMessage[]>) => Record<string, ChatMessage[]>) => void,
) {
  useEffect(() => {
    if (!enabled) return;

    let unsubConversations = () => {};

    if (userUid) {
      unsubConversations = subscribeToConversations(userUid, (items) => {
        const nextMeta: ConvMeta = {};
        for (const item of items) {
          nextMeta[item.convId] = { ...item };
        }
        setConvMeta((prev) => ({ ...prev, ...nextMeta }));

        for (const id of Object.keys(nextMeta)) {
          if (messageUnsubs.current[id]) continue;
          messageUnsubs.current[id] = subscribeToMessages(id, (msgs) => {
            setConvMessages((prev) => ({
              ...prev,
              [id]: msgs.map((m) => toChatMessage(m)),
            }));
          });
        }
      });
    }

    let adminUnsub = () => {};
    if (isAdmin) {
      adminUnsub = onSnapshot(query(collection(db, "conversations"), orderBy("updatedAt", "desc")), (snap) => {
        const nextMeta: ConvMeta = {};
        for (const docSnap of snap.docs) {
          const data = docSnap.data() as SchemaConversation;
          nextMeta[docSnap.id] = { ...data, convId: docSnap.id };
          if (!messageUnsubs.current[docSnap.id]) {
            messageUnsubs.current[docSnap.id] = subscribeToMessages(docSnap.id, (msgs) => {
              setConvMessages((prev) => ({
                ...prev,
                [docSnap.id]: msgs.map((m) => toChatMessage(m)),
              }));
            });
          }
        }
        setConvMeta((prev) => ({ ...prev, ...nextMeta }));
      });
    }

    return () => {
      unsubConversations();
      adminUnsub();
    };
  }, [enabled, userUid, isAdmin, messageUnsubs, setConvMeta, setConvMessages]);
}
