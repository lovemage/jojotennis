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

function noopUnsub() {
  return () => {};
}

function safeSnapshot<T>(
  subscribe: (onNext: (value: T) => void, onError: (err: Error) => void) => () => void,
  onNext: (value: T) => void,
  fallback: T,
): () => void {
  return subscribe(onNext, () => onNext(fallback));
}

/** Firestore 核心集合即時監聽（matches / users / news / pending_courts 等） */
export function useFirebaseCoreListeners(
  enabled: boolean,
  userUid: string | undefined,
  setters: CoreListenerSetters,
) {
  useEffect(() => {
    if (!enabled || !db) return;

    const unsubMatches = safeSnapshot(
      (onNext, onError) =>
        onSnapshot(
          collection(db, "matches"),
          (snap) => {
            let rows = snap.docs.map(
              (d) => ({ matchId: d.id, ...d.data() }) as SchemaMatch & { matchId: string },
            );
            rows = rows.filter((m) => m.isDeleted !== true && m.status === "open");
            rows.sort((a, b) => {
              const ta = (a.createdAt as { toMillis?: () => number })?.toMillis?.() ?? 0;
              const tb = (b.createdAt as { toMillis?: () => number })?.toMillis?.() ?? 0;
              return tb - ta;
            });
            console.log("AppContext matches 更新：", rows.length);
            onNext(rows);
          },
          (err) => {
            console.error("[matches] 監聽失敗：", err.code, err.message);
            onError(err);
          },
        ),
      setters.setRawSchemaMatches,
      [] as (SchemaMatch & { matchId?: string })[],
    );

    const unsubApps = userUid
      ? safeSnapshot(
          (onNext, onError) =>
            onSnapshot(
              query(collection(db, "match_applications"), where("isDeleted", "==", false)),
              (snap) => {
                onNext(
                  snap.docs.map((d) => ({ appId: d.id, ...d.data() }) as MatchApplication),
                );
              },
              onError,
            ),
          setters.setApplications,
          [] as MatchApplication[],
        )
      : noopUnsub();

    const unsubUsers = userUid
      ? safeSnapshot(
          (onNext, onError) =>
            onSnapshot(collection(db, "users"), (snap) => {
              onNext(
                snap.docs.map((d) =>
                  toUiUser(d.id, (d.data() as SchemaUser).email, d.data() as SchemaUser),
                ),
              );
            }, onError),
          setters.setUsers,
          [] as User[],
        )
      : noopUnsub();

    const unsubNews = subscribeToNews((items) => {
      setters.setNewsArticles(items.length > 0 ? items : seedNewsArticles);
    });

    const unsubStudent = safeSnapshot(
      (onNext, onError) =>
        onSnapshot(
          collection(db, "student_posts"),
          (snap) => {
            const rows = snap.docs
              .filter((d) => (d.data() as { isDeleted?: boolean }).isDeleted !== true)
              .map((d) => {
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
              })
              .sort((a, b) => b.createdAt - a.createdAt);
            console.log("學生需求更新，筆數：", rows.length);
            onNext(rows);
          },
          (err) => {
            console.error("[student_posts] 監聽失敗：", err.code, err.message);
            onError(err);
          },
        ),
      setters.setStudentNeeds,
      [] as StudentNeedRecord[],
    );

    const unsubCourts = userUid
      ? safeSnapshot(
          (onNext, onError) =>
            onSnapshot(
              query(collection(db, "pending_courts"), orderBy("createdAt", "desc")),
              (snap) => {
                onNext(
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
              onError,
            ),
          setters.setCourtReports,
          [] as CourtReport[],
        )
      : noopUnsub();

    const unsubAdmins = userUid
      ? safeSnapshot(
          (onNext, onError) =>
            onSnapshot(collection(db, "adminUsers"), (snap) => {
              const emails = snap.docs
                .map((d) => String((d.data() as { email?: string }).email ?? d.id))
                .filter(Boolean);
              onNext(Array.from(new Set([...SUPER_ADMIN_EMAILS, ...emails])));
            }, onError),
          setters.setAdminEmails,
          [...SUPER_ADMIN_EMAILS],
        )
      : noopUnsub();

    if (!userUid) {
      setters.setAdminEmails([...SUPER_ADMIN_EMAILS]);
    }

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
  }, [enabled, userUid]);
}

/** 使用者 inbox（legacy messages 集合） */
export function useFirebaseInboxListener(
  enabled: boolean,
  userUid: string | undefined,
  setMessages: (v: Message[]) => void,
) {
  useEffect(() => {
    if (!enabled || !userUid || !db) return;

    return safeSnapshot(
      (onNext, onError) =>
        onSnapshot(query(collection(db, "messages"), where("toUid", "==", userUid)), (snap) => {
          onNext(
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
        }, onError),
      setMessages,
      [] as Message[],
    );
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
    if (!enabled || !db) return;

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
    if (isAdmin && userUid) {
      adminUnsub = safeSnapshot(
        (onNext, onError) =>
          onSnapshot(query(collection(db, "conversations"), orderBy("updatedAt", "desc")), (snap) => {
            onNext(
              snap.docs.map((docSnap) => {
                const data = docSnap.data() as SchemaConversation;
                return { id: docSnap.id, data: { ...data, convId: docSnap.id } };
              }),
            );
          }, onError),
        (rows) => {
          const nextMeta: ConvMeta = {};
          for (const row of rows) {
            nextMeta[row.id] = row.data;
            if (!messageUnsubs.current[row.id]) {
              messageUnsubs.current[row.id] = subscribeToMessages(row.id, (msgs) => {
                setConvMessages((prev) => ({
                  ...prev,
                  [row.id]: msgs.map((m) => toChatMessage(m)),
                }));
              });
            }
          }
          setConvMeta((prev) => ({ ...prev, ...nextMeta }));
        },
        [] as { id: string; data: SchemaConversation & { convId: string } }[],
      );
    }

    return () => {
      unsubConversations();
      adminUnsub();
    };
  }, [enabled, userUid, isAdmin, messageUnsubs, setConvMeta, setConvMessages]);
}
