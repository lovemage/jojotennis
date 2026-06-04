import type { User as SchemaUser } from "./schema";
import { USE_SUPABASE } from "./config";
import { getSupabaseBrowserClient, hasSupabaseConfig } from "./supabase";

export type AdminUserRow = {
  uid: string;
  email: string;
  nickname: string;
  ntrp: string;
  region: string;
  yearsPlaying: number;
  avatarInitial: string;
  role: SchemaUser["role"];
  isActive: boolean;
  createdAt: number;
  nicknameChangesUsed: number;
};

function toAdminUserRowFromSupabase(row: Record<string, unknown>): AdminUserRow {
  const nickname = String(row.nickname ?? "新球友");
  return {
    uid: String(row.uid ?? ""),
    email: String(row.email ?? ""),
    nickname,
    ntrp: String(row.ntrp ?? "2.0"),
    region: String(row.region ?? "台北市"),
    yearsPlaying: Number(row.years_playing ?? 0),
    avatarInitial: nickname[0] || "?",
    role: (row.role as SchemaUser["role"]) ?? "user",
    isActive: row.is_active !== false,
    createdAt: row.created_at ? new Date(String(row.created_at)).getTime() : Date.now(),
    nicknameChangesUsed: Number(row.nickname_changes_used ?? 0),
  };
}

export async function fetchUsersPage(
  pageSize = 20,
  cursor?: string | null,
): Promise<{ users: AdminUserRow[]; lastDoc: string | null }> {
  if (USE_SUPABASE && hasSupabaseConfig()) {
    const supabase = getSupabaseBrowserClient();
    let request = supabase
      .from("users")
      .select("*")
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(pageSize);
    if (cursor) request = request.lt("created_at", cursor);

    const { data, error } = await request;
    if (!error) {
      const rows = data ?? [];
      return {
        users: rows.map((row) => toAdminUserRowFromSupabase(row as Record<string, unknown>)),
        lastDoc: rows.length > 0 ? String((rows[rows.length - 1] as Record<string, unknown>).created_at ?? "") : null,
      };
    }
    throw error;
  }

  throw new Error("會員管理需要 Supabase 設定");
}

export async function updateUserAdminFields(
  uid: string,
  fields: Partial<Pick<SchemaUser, "nickname" | "ntrp" | "region" | "yearsPlaying" | "role" | "isActive">>,
): Promise<void> {
  if (USE_SUPABASE && hasSupabaseConfig()) {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase
      .from("users")
      .update({
        nickname: fields.nickname,
        ntrp: fields.ntrp,
        region: fields.region,
        years_playing: fields.yearsPlaying,
        role: fields.role,
        is_active: fields.isActive,
        updated_at: new Date().toISOString(),
      })
      .eq("uid", uid);

    if (!error) return;
    throw error;
  }

  throw new Error("會員管理需要 Supabase 設定");
}

export const NICKNAME_CHANGE_LIMIT = 3;

export async function updateUserProfile(
  uid: string,
  fields: Partial<
    Pick<SchemaUser, "nickname" | "ntrp" | "region" | "yearsPlaying" | "bio" | "avatarUrl">
  >,
): Promise<void> {
  if (USE_SUPABASE && hasSupabaseConfig()) {
    const supabase = getSupabaseBrowserClient();
    const { data: current, error: readError } = await supabase
      .from("users")
      .select("nickname,nickname_changes_used")
      .eq("uid", uid)
      .maybeSingle();
    if (readError) throw readError;

    const currentNickname = String((current as Record<string, unknown> | null)?.nickname ?? "");
    const used = Number((current as Record<string, unknown> | null)?.nickname_changes_used ?? 0);
    const nextNickname = fields.nickname?.trim();
    const isNicknameChange = Boolean(nextNickname && nextNickname !== currentNickname);
    if (isNicknameChange && used >= NICKNAME_CHANGE_LIMIT) {
      throw new Error("已用完三次暱稱更改機會，請聯繫管理員");
    }

    const { error } = await supabase
      .from("users")
      .update({
        nickname: fields.nickname,
        ntrp: fields.ntrp,
        region: fields.region,
        years_playing: fields.yearsPlaying,
        bio: fields.bio,
        avatar_url: fields.avatarUrl,
        nickname_changes_used: isNicknameChange ? used + 1 : used,
        updated_at: new Date().toISOString(),
      })
      .eq("uid", uid);

    if (!error) return;
    throw error;
  }

  throw new Error("會員資料更新需要 Supabase 設定");
}

export async function adminResetNicknameChanges(uid: string): Promise<void> {
  if (USE_SUPABASE && hasSupabaseConfig()) {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase
      .from("users")
      .update({
        nickname_changes_used: 0,
        updated_at: new Date().toISOString(),
      })
      .eq("uid", uid);
    if (!error) return;
    throw error;
  }

  throw new Error("會員管理需要 Supabase 設定");
}

export async function adminSetUserActive(uid: string, isActive: boolean): Promise<void> {
  if (USE_SUPABASE && hasSupabaseConfig()) {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase
      .from("users")
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq("uid", uid);
    if (error) throw error;
    return;
  }

  throw new Error("會員管理需要 Supabase 設定");
}

export { getUserProfile } from "./authService";
