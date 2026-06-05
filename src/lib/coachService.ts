import { coaches as seedCoaches } from "@/data/coaches";
import { USE_SUPABASE } from "./config";
import { getSupabaseBrowserClient, hasSupabaseConfig } from "./supabase";

export type UiCoach = {
  id: string;
  name: string;
  city: string;
  levelRange: string;
  price: number;
  rating: number;
  tagline: string;
  bio: string;
  uid: string;
};

export type AdminCoach = UiCoach & { isVerified: boolean };
export type MyCoachState = UiCoach & { isPublished: boolean; isVerified: boolean };

function toUiCoach(row: Record<string, unknown>): UiCoach {
  const bio = String(row.bio ?? "");
  return {
    id: String(row.id ?? ""),
    uid: String(row.uid ?? ""),
    name: String(row.nickname ?? row.name ?? "教練"),
    city: String(row.city ?? ""),
    levelRange: String(row.ntrp_range ?? row.levelRange ?? ""),
    price: Number(row.price_per_hour ?? row.price ?? 0),
    rating: Number(row.rating ?? 0),
    tagline: String(row.tagline ?? bio.slice(0, 40)),
    bio,
  };
}

function seedUiCoaches(): UiCoach[] {
  return seedCoaches.map((coach) => ({
    ...coach,
    uid: "",
  }));
}

async function fetchCoaches(includeUnpublished = false) {
  if (!USE_SUPABASE || !hasSupabaseConfig()) return includeUnpublished ? [] : seedUiCoaches();
  const supabase = getSupabaseBrowserClient();
  let request = supabase
    .from("coaches")
    .select("*")
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });
  if (!includeUnpublished) request = request.eq("is_published", true);
  const { data, error } = await request;
  if (error) throw error;
  const rows = (data ?? []).map((row) => toUiCoach(row as Record<string, unknown>));
  return rows.length > 0 || includeUnpublished ? rows : seedUiCoaches();
}

export function subscribeToCoaches(cb: (coaches: UiCoach[]) => void) {
  if (!USE_SUPABASE || !hasSupabaseConfig()) {
    cb(seedUiCoaches());
    return () => {};
  }
  const supabase = getSupabaseBrowserClient();
  let active = true;
  const load = () => fetchCoaches(false).then((rows) => {
    if (active) cb(rows);
  });
  load().catch((err) => {
    console.error("[coaches] Supabase 讀取失敗：", err.message);
    if (active) cb(seedUiCoaches());
  });
  const channel = supabase
    .channel("public:coaches")
    .on("postgres_changes", { event: "*", schema: "public", table: "coaches" }, () => {
      void load().catch(() => {});
    })
    .subscribe();
  return () => {
    active = false;
    void supabase.removeChannel(channel);
  };
}

export function subscribeToCoachesAdmin(cb: (coaches: AdminCoach[]) => void) {
  if (!USE_SUPABASE || !hasSupabaseConfig()) {
    cb([]);
    return () => {};
  }
  const supabase = getSupabaseBrowserClient();
  let active = true;
  const load = async () => {
    const { data, error } = await supabase
      .from("coaches")
      .select("*")
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });
    if (error) throw error;
    const rows = (data ?? []).map((row) => ({
      ...toUiCoach(row as Record<string, unknown>),
      isVerified: (row as Record<string, unknown>).is_verified === true,
    }));
    if (active) cb(rows);
  };
  load().catch(() => {
    if (active) cb([]);
  });
  const channel = supabase
    .channel("admin:coaches")
    .on("postgres_changes", { event: "*", schema: "public", table: "coaches" }, () => {
      void load().catch(() => {});
    })
    .subscribe();
  return () => {
    active = false;
    void supabase.removeChannel(channel);
  };
}

export async function setCoachVerified(coachId: string, isVerified: boolean) {
  if (!USE_SUPABASE || !hasSupabaseConfig()) throw new Error("教練管理需要 Supabase 設定");
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("coaches")
    .update({ is_verified: isVerified, updated_at: new Date().toISOString() })
    .eq("id", coachId);
  if (error) throw error;
}

export function subscribeMyCoach(
  uid: string,
  cb: (coach: MyCoachState | null) => void,
) {
  if (!USE_SUPABASE || !hasSupabaseConfig()) {
    cb(null);
    return () => {};
  }
  const supabase = getSupabaseBrowserClient();
  let active = true;
  const load = async () => {
    const { data, error } = await supabase
      .from("coaches")
      .select("*")
      .eq("uid", uid)
      .eq("is_deleted", false)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    const row = data as Record<string, unknown> | null;
    if (active)
      cb(
        row
          ? {
              ...toUiCoach(row),
              isPublished: row.is_published !== false,
              isVerified: (row as Record<string, unknown>).is_verified === true,
            }
          : null,
      );
  };
  load().catch(() => {
    if (active) cb(null);
  });
  const channel = supabase
    .channel(`public:coaches:${uid}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "coaches" }, () => {
      void load().catch(() => {});
    })
    .subscribe();
  return () => {
    active = false;
    void supabase.removeChannel(channel);
  };
}

export async function setCoachPublished(coachId: string, isPublished: boolean) {
  if (!USE_SUPABASE || !hasSupabaseConfig()) throw new Error("教練管理需要 Supabase 設定");
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("coaches")
    .update({ is_published: isPublished, updated_at: new Date().toISOString() })
    .eq("id", coachId);
  if (error) throw error;
}
