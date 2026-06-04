import { USE_SUPABASE } from "./config";
import { getSupabaseBrowserClient, hasSupabaseConfig } from "./supabase";

export async function giveHeart(
  matchId: string,
  fromUid: string,
  toUid: string,
): Promise<{ ok: boolean; msg: string }> {
  if (fromUid === toUid) return { ok: false, msg: "不能給自己愛心" };
  if (!USE_SUPABASE || !hasSupabaseConfig()) return { ok: false, msg: "愛心功能需要 Supabase 設定" };

  const supabase = getSupabaseBrowserClient();
  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("status,is_deleted")
    .eq("id", matchId)
    .maybeSingle();
  if (matchError) throw matchError;
  if (!match) return { ok: false, msg: "球局不存在" };
  const matchRow = match as Record<string, unknown>;
  if (matchRow.is_deleted === true) return { ok: false, msg: "球局已刪除" };
  if (!["closed", "cancelled"].includes(String(matchRow.status))) {
    return { ok: false, msg: "球局尚未結束" };
  }

  const heartId = `${matchId}_${fromUid}_${toUid}`;
  const { error } = await supabase.from("heart_records").insert({
    id: heartId,
    match_id: matchId,
    from_uid: fromUid,
    to_uid: toUid,
  });
  if (error) {
    if (error.code === "23505") return { ok: false, msg: "已給過愛心" };
    throw error;
  }

  const { data: userRow, error: userError } = await supabase
    .from("users")
    .select("hearts_received")
    .eq("uid", toUid)
    .maybeSingle();
  if (userError) throw userError;
  const next = Number((userRow as Record<string, unknown> | null)?.hearts_received ?? 0) + 1;
  const { error: updateError } = await supabase
    .from("users")
    .update({ hearts_received: next, updated_at: new Date().toISOString() })
    .eq("uid", toUid);
  if (updateError) throw updateError;

  return { ok: true, msg: "已給予愛心！" };
}
