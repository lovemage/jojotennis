import { USE_SUPABASE } from "./config";
import { getSupabaseBrowserClient, hasSupabaseConfig } from "./supabase";

export async function createStudentPost(data: {
  uid: string;
  nickname: string;
  title: string;
  city: string;
  district: string;
  targetLevel: string;
  preferredTime: string;
  budget: string;
  intro: string;
}): Promise<string> {
  if (!USE_SUPABASE || !hasSupabaseConfig()) throw new Error("學員需求需要 Supabase 設定");
  const supabase = getSupabaseBrowserClient();
  const { data: row, error } = await supabase
    .from("student_posts")
    .insert({
      uid: data.uid,
      nickname: data.nickname,
      title: data.title,
      city: data.city,
      district: data.district,
      target_ntrp: data.targetLevel,
      prefer_times: data.preferredTime.split("、").filter(Boolean),
      budget: data.budget,
      description: data.intro,
      status: "active",
      is_deleted: false,
      deleted_at: null,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) throw error;
  return String((row as { id?: string }).id ?? "");
}

export async function updateStudentPostStatus(
  postId: string,
  status: "active" | "closed",
): Promise<void> {
  if (!USE_SUPABASE || !hasSupabaseConfig()) throw new Error("學員需求管理需要 Supabase 設定");
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("student_posts")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", postId);
  if (error) throw error;
}
