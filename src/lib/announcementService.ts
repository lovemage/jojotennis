import { USE_SUPABASE } from "./config";
import { getSupabaseBrowserClient, hasSupabaseConfig } from "./supabase";

export interface Announcement {
  id: string;
  message: string;
  isActive: boolean;
  priority: number;
  startsAt?: number;
  endsAt?: number;
  updatedAt?: number;
}

export interface AnnouncementInput {
  id?: string;
  message: string;
  isActive: boolean;
  priority: number;
  startsAt?: number | null;
  endsAt?: number | null;
}

function toMillis(value: unknown): number | undefined {
  if (!value) return undefined;
  const ms = new Date(String(value)).getTime();
  return Number.isFinite(ms) ? ms : undefined;
}

function toIso(value: number | null | undefined) {
  if (typeof value !== "number") return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function toAnnouncement(row: Record<string, unknown>): Announcement {
  return {
    id: String(row.id ?? ""),
    message: String(row.message ?? ""),
    isActive: row.is_active !== false,
    priority: Number(row.priority ?? 0),
    startsAt: toMillis(row.starts_at),
    endsAt: toMillis(row.ends_at),
    updatedAt: toMillis(row.updated_at),
  };
}

async function fetchAnnouncements() {
  if (!USE_SUPABASE || !hasSupabaseConfig()) return [];
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .eq("is_deleted", false)
    .order("priority", { ascending: false })
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => toAnnouncement(row as Record<string, unknown>));
}

export const subscribeAnnouncements = (cb: (items: Announcement[]) => void) => {
  if (!USE_SUPABASE || !hasSupabaseConfig()) {
    cb([]);
    return () => {};
  }

  const supabase = getSupabaseBrowserClient();
  let active = true;
  const load = () => fetchAnnouncements().then((items) => {
    if (active) cb(items);
  });
  load().catch((err) => console.error("[announcements] Supabase 讀取失敗：", err.message));
  const channel = supabase
    .channel("public:announcements")
    .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, () => {
      void load().catch((err) => console.error("[announcements] Supabase realtime 失敗：", err.message));
    })
    .subscribe();

  return () => {
    active = false;
    void supabase.removeChannel(channel);
  };
};

export async function saveAnnouncement(data: AnnouncementInput): Promise<string> {
  if (!USE_SUPABASE || !hasSupabaseConfig()) throw new Error("公告管理需要 Supabase 設定");
  const supabase = getSupabaseBrowserClient();
  const id = data.id || crypto.randomUUID();
  const { error } = await supabase.from("announcements").upsert({
    id,
    message: data.message,
    is_active: data.isActive,
    priority: data.priority ?? 0,
    starts_at: toIso(data.startsAt),
    ends_at: toIso(data.endsAt),
    is_deleted: false,
    deleted_at: null,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
  return id;
}

export async function deleteAnnouncement(id: string) {
  if (!USE_SUPABASE || !hasSupabaseConfig()) throw new Error("公告刪除需要 Supabase 設定");
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("announcements")
    .update({ is_deleted: true, deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function toggleAnnouncementActive(id: string, active: boolean) {
  if (!USE_SUPABASE || !hasSupabaseConfig()) throw new Error("公告管理需要 Supabase 設定");
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("announcements")
    .update({ is_active: active, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
