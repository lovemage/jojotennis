import {
  createClubConversation,
  addUserToConversation,
  removeUserFromConversation,
  sendSystemMessage,
} from "./messageService";
import { USE_SUPABASE } from "./config";
import { getSupabaseBrowserClient, hasSupabaseConfig } from "./supabase";
import type { Club } from "./schema";

function toClub(row: Record<string, unknown>): Club {
  return {
    clubId: String(row.id ?? ""),
    ownerUid: String(row.owner_uid ?? ""),
    ownerNickname: String(row.owner_nickname ?? ""),
    name: String(row.name ?? ""),
    types: Array.isArray(row.types) ? row.types.map(String) : [],
    city: String(row.city ?? ""),
    ntrpLevels: Array.isArray(row.ntrp_levels) ? row.ntrp_levels.map(String) : [],
    venue: String(row.venue ?? ""),
    schedule: String(row.schedule ?? ""),
    description: String(row.description ?? ""),
    memberCount: Number(row.member_count ?? 0),
    contactLine: String(row.contact_line ?? ""),
    createdAt: row.created_at ? new Date(String(row.created_at)) : new Date(),
    updatedAt: row.updated_at ? new Date(String(row.updated_at)) : new Date(),
    isDeleted: row.is_deleted === true,
    deletedAt: row.deleted_at ? new Date(String(row.deleted_at)) : null,
  };
}

export async function createClub(data: {
  ownerUid: string;
  ownerNickname: string;
  name: string;
  types: string[];
  city: string;
  ntrpLevels: string[];
  venue: string;
  schedule: string;
  description: string;
  contactLine: string;
}): Promise<string> {
  if (!USE_SUPABASE || !hasSupabaseConfig()) throw new Error("社團功能需要 Supabase 設定");
  const supabase = getSupabaseBrowserClient();
  const clubId = crypto.randomUUID();
  const { error } = await supabase.from("clubs").insert({
    id: clubId,
    owner_uid: data.ownerUid,
    owner_nickname: data.ownerNickname,
    name: data.name,
    types: data.types,
    city: data.city,
    ntrp_levels: data.ntrpLevels,
    venue: data.venue,
    schedule: data.schedule,
    description: data.description,
    contact_line: data.contactLine,
    member_count: 1,
    is_deleted: false,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
  const { error: memberError } = await supabase.from("club_members").insert({
    club_id: clubId,
    uid: data.ownerUid,
    nickname: data.ownerNickname,
    role: "owner",
    is_active: true,
  });
  if (memberError) throw memberError;
  await createClubConversation(clubId, data.name, data.ownerUid);
  return clubId;
}

export async function joinClub(clubId: string, uid: string, nickname: string): Promise<void> {
  if (!USE_SUPABASE || !hasSupabaseConfig()) throw new Error("社團功能需要 Supabase 設定");
  const supabase = getSupabaseBrowserClient();
  const { data: dup, error: dupError } = await supabase
    .from("club_members")
    .select("id")
    .eq("club_id", clubId)
    .eq("uid", uid)
    .eq("is_active", true)
    .maybeSingle();
  if (dupError) throw dupError;
  if (dup) throw new Error("已加入此社團");

  const { error } = await supabase.from("club_members").insert({
    club_id: clubId,
    uid,
    nickname,
    role: "member",
    is_active: true,
  });
  if (error) throw error;
  const { data: club } = await supabase.from("clubs").select("member_count").eq("id", clubId).maybeSingle();
  await supabase
    .from("clubs")
    .update({ member_count: Number((club as Record<string, unknown> | null)?.member_count ?? 0) + 1, updated_at: new Date().toISOString() })
    .eq("id", clubId);
  await addUserToConversation(`club_${clubId}`, uid);
  await sendSystemMessage(`club_${clubId}`, `${nickname} 加入了社團！`);
}

export async function leaveClub(clubId: string, uid: string, nickname: string): Promise<void> {
  if (!USE_SUPABASE || !hasSupabaseConfig()) throw new Error("社團功能需要 Supabase 設定");
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("club_members")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("club_id", clubId)
    .eq("uid", uid)
    .eq("is_active", true);
  if (error) throw error;
  const { data: club } = await supabase.from("clubs").select("member_count").eq("id", clubId).maybeSingle();
  await supabase
    .from("clubs")
    .update({ member_count: Math.max(0, Number((club as Record<string, unknown> | null)?.member_count ?? 1) - 1), updated_at: new Date().toISOString() })
    .eq("id", clubId);
  await removeUserFromConversation(`club_${clubId}`, uid);
  void nickname;
}

export function subscribeToClubs(cb: (clubs: Club[]) => void, cityFilter?: string) {
  if (!USE_SUPABASE || !hasSupabaseConfig()) {
    cb([]);
    return () => {};
  }
  const supabase = getSupabaseBrowserClient();
  let active = true;
  const load = async () => {
    let request = supabase
      .from("clubs")
      .select("*")
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });
    if (cityFilter) request = request.eq("city", cityFilter);
    const { data, error } = await request;
    if (error) throw error;
    if (active) cb((data ?? []).map((row) => toClub(row as Record<string, unknown>)));
  };
  load().catch(() => {
    if (active) cb([]);
  });
  const channel = supabase
    .channel("public:clubs")
    .on("postgres_changes", { event: "*", schema: "public", table: "clubs" }, () => {
      void load().catch(() => {});
    })
    .subscribe();
  return () => {
    active = false;
    void supabase.removeChannel(channel);
  };
}

export async function softDeleteClub(clubId: string): Promise<void> {
  if (!USE_SUPABASE || !hasSupabaseConfig()) throw new Error("社團刪除需要 Supabase 設定");
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("clubs")
    .update({ is_deleted: true, deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", clubId);
  if (error) throw error;
}
