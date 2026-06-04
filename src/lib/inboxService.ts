import { USE_SUPABASE } from "./config";
import { getSupabaseBrowserClient, hasSupabaseConfig } from "./supabase";

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
  if (!USE_SUPABASE || !hasSupabaseConfig()) return;
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("messages").upsert({
    id: msg.id,
    type: msg.type,
    from_uid: msg.fromUid,
    from_nickname: msg.fromNickname,
    to_uid: msg.toUid,
    content: msg.content,
    timestamp_ms: msg.timestamp,
    is_read: msg.isRead,
    related_id: msg.relatedId ?? null,
    is_handled: msg.isHandled ?? false,
    handled_status: msg.handledStatus ?? null,
    handled_at_ms: msg.handledAt ?? null,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}
