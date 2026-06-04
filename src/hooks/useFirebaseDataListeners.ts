import { useEffect, type MutableRefObject } from "react";
import { subscribeToConversations } from "@/lib/messageService";
import { SUPER_ADMIN_EMAILS, USE_SUPABASE } from "@/lib/config";
import { getSupabaseBrowserClient, hasSupabaseConfig } from "@/lib/supabase";
import type {
  Match as SchemaMatch,
  MatchApplication,
  Conversation as SchemaConversation,
} from "@/lib/schema";
import type {
  User,
  Message,
  NewsArticle,
  StudentNeedRecord,
  CourtReport,
  Conversation,
} from "@/lib/uiTypes";

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

function messageFromRow(row: Record<string, unknown>): Message {
  return {
    id: String(row.id ?? ""),
    type: (row.type as Message["type"]) ?? "system",
    fromUid: String(row.from_uid ?? "system"),
    fromNickname: String(row.from_nickname ?? "揪揪網球"),
    toUid: String(row.to_uid ?? ""),
    content: String(row.content ?? ""),
    timestamp: Number(row.timestamp_ms ?? 0),
    isRead: Boolean(row.is_read),
    relatedId: row.related_id ? String(row.related_id) : undefined,
    isHandled: Boolean(row.is_handled),
    handledStatus: row.handled_status as Message["handledStatus"],
    handledAt: row.handled_at_ms ? Number(row.handled_at_ms) : undefined,
  };
}

/** Legacy Firestore listeners are disabled; data is now loaded by Supabase/Redis services. */
export function useFirebaseCoreListeners(
  enabled: boolean,
  _userUid: string | undefined,
  setters: CoreListenerSetters,
) {
  useEffect(() => {
    if (!enabled) return;
    setters.setAdminEmails([...SUPER_ADMIN_EMAILS]);
  }, [enabled, setters]);
}

/** 使用者 inbox（Supabase messages table） */
export function useFirebaseInboxListener(
  enabled: boolean,
  userUid: string | undefined,
  setMessages: (v: Message[]) => void,
) {
  useEffect(() => {
    if (!enabled || !userUid || !USE_SUPABASE || !hasSupabaseConfig()) return;
    const supabase = getSupabaseBrowserClient();
    let active = true;
    const load = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("to_uid", userUid)
        .order("timestamp_ms", { ascending: false });
      if (error) throw error;
      if (active) setMessages((data ?? []).map((row) => messageFromRow(row as Record<string, unknown>)));
    };
    load().catch(() => {
      if (active) setMessages([]);
    });
    const channel = supabase
      .channel(`public:messages:${userUid}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        void load().catch(() => {});
      })
      .subscribe();
    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [enabled, userUid, setMessages]);
}

/** Chat metadata and message bodies are loaded from Upstash Redis through chat APIs. */
export function useFirebaseConversationListeners(
  enabled: boolean,
  userUid: string | undefined,
  _isAdmin: boolean,
  _messageUnsubs: MutableRefObject<Record<string, () => void>>,
  setConvMeta: (fn: (prev: ConvMeta) => ConvMeta) => void,
) {
  useEffect(() => {
    if (!enabled) return;

    let unsubConversations = () => {};
    if (userUid) {
      unsubConversations = subscribeToConversations(userUid, (items) => {
        const nextMeta: ConvMeta = {};
        for (const item of items) nextMeta[item.convId] = { ...item };
        setConvMeta(() => nextMeta);
      });
    }

    return () => {
      unsubConversations();
    };
  }, [enabled, userUid, setConvMeta]);
}
