import { USE_SUPABASE } from "./config";
import { getSupabaseBrowserClient, hasSupabaseConfig } from "./supabase";

function toSnakeTableName(name: string) {
  return name.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`);
}

export async function softDelete(col: string, id: string): Promise<void> {
  if (!USE_SUPABASE || !hasSupabaseConfig()) throw new Error("刪除功能需要 Supabase 設定");
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from(toSnakeTableName(col))
    .update({ is_deleted: true, deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function softDeleteMatchCascade(matchId: string): Promise<void> {
  if (!USE_SUPABASE || !hasSupabaseConfig()) throw new Error("刪除球局需要 Supabase 設定");
  const supabase = getSupabaseBrowserClient();
  const now = new Date().toISOString();
  const { error: matchError } = await supabase
    .from("matches")
    .update({ is_deleted: true, deleted_at: now, status: "cancelled", updated_at: now })
    .eq("id", matchId);
  if (matchError) throw matchError;
  const { error: appError } = await supabase
    .from("match_applications")
    .update({ is_deleted: true, deleted_at: now, updated_at: now })
    .eq("match_id", matchId)
    .eq("is_deleted", false);
  if (appError) throw appError;
}
