import { saveCourt } from "./courtService";
import { USE_SUPABASE } from "./config";
import { getSupabaseBrowserClient, hasSupabaseConfig } from "./supabase";

export type AdminDashboardCounts = {
  users: number;
  openMatches: number;
  clubs: number;
  pendingCourts: number;
  news: number;
  coaches: number;
  studentPosts: number;
};

type CountResult = {
  count: number | null;
  error: { code?: string; message?: string } | null;
};

async function readCount(request: PromiseLike<CountResult>): Promise<number> {
  const { count, error } = await request;
  if (!error) return count ?? 0;
  if (
    error.code === "PGRST205" ||
    /Could not find the table 'public\.[^']+'|relation .* does not exist/i.test(error.message ?? "")
  ) {
    return 0;
  }
  throw error;
}

/** 後台儀表板用 Supabase 聚合計數。 */
export async function fetchAdminDashboardCounts(): Promise<AdminDashboardCounts> {
  if (!USE_SUPABASE || !hasSupabaseConfig()) {
    throw new Error("管理後台統計需要 Supabase 設定");
  }
  const supabase = getSupabaseBrowserClient();

  const [
    users,
    openMatches,
    clubs,
    pendingCourts,
    news,
    coaches,
    studentPosts,
  ] = await Promise.all([
    readCount(
      supabase.from("users").select("*", { count: "exact", head: true }).eq("is_deleted", false).eq("is_active", true),
    ),
    readCount(
      supabase.from("matches").select("*", { count: "exact", head: true }).eq("is_deleted", false).eq("status", "open"),
    ),
    readCount(supabase.from("clubs").select("*", { count: "exact", head: true }).eq("is_deleted", false)),
    readCount(supabase.from("pending_courts").select("*", { count: "exact", head: true }).eq("status", "pending")),
    readCount(supabase.from("news").select("*", { count: "exact", head: true }).eq("is_deleted", false)),
    readCount(supabase.from("coaches").select("*", { count: "exact", head: true }).eq("is_deleted", false)),
    readCount(supabase.from("student_posts").select("*", { count: "exact", head: true }).eq("is_deleted", false)),
  ]);

  return {
    users,
    openMatches,
    clubs,
    pendingCourts,
    news,
    coaches,
    studentPosts,
  };
}

/** 核准待審球場：寫入 courts，並標記 pending_courts */
export async function approvePendingCourt(pendingId: string): Promise<string> {
  if (!USE_SUPABASE || !hasSupabaseConfig()) {
    throw new Error("球場審核需要 Supabase 設定");
  }

  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("pending_courts")
    .select("*")
    .eq("id", pendingId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("待審件不存在");

  const row = data as Record<string, unknown>;
  if (String(row.status ?? "pending") !== "pending") throw new Error("此筆已處理");

  const courtId = `court-${Date.now()}`;
  const district = String(row.district ?? "");
  const bookingMethod = String(row.booking_method ?? "");
  const isUrl = /^https?:\/\//i.test(bookingMethod.trim());
  const desc = String(row.description ?? "");

  await saveCourt(courtId, {
    name: String(row.name ?? "未命名球場"),
    city: String(row.city ?? ""),
    district,
    address: String(row.address ?? ""),
    lat: 0,
    lng: 0,
    surfaceType: "hard",
    indoor: "outdoor",
    totalCourts: Math.max(1, Number.parseInt(String(row.court_count ?? "1"), 10) || 1),
    hasNightLight: false,
    phone: "",
    bookingMethod: isUrl ? "" : bookingMethod.trim(),
    bookingUrl: isUrl ? bookingMethod.trim() : "",
    notes: desc,
    openHours: isUrl ? desc : [bookingMethod, desc].filter(Boolean).join("；") || "",
    status: "active",
  });
  const { error: updateError } = await supabase.from("pending_courts").update({
    status: "approved",
    reviewed_at: new Date().toISOString(),
    approved_court_id: courtId,
  }).eq("id", pendingId);
  if (updateError) throw updateError;
  return courtId;
}

export async function rejectPendingCourt(pendingId: string): Promise<void> {
  if (!USE_SUPABASE || !hasSupabaseConfig()) {
    throw new Error("球場審核需要 Supabase 設定");
  }

  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("pending_courts").update({
    status: "rejected",
    reviewed_at: new Date().toISOString(),
  }).eq("id", pendingId);
  if (error) throw error;
}

export async function grantAdminEmail(email: string): Promise<void> {
  if (!USE_SUPABASE || !hasSupabaseConfig()) {
    throw new Error("管理者授權需要 Supabase 設定");
  }

  const normalized = email.trim().toLowerCase();
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("users")
    .update({ role: "admin", updated_at: new Date().toISOString() })
    .eq("email", normalized)
    .select("uid");

  if (error) throw error;
  if (!data?.length) throw new Error("找不到此 Email 對應的會員");
}
