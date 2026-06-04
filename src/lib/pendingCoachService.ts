import { deleteStorageObject } from "./storageUploads";
import { USE_SUPABASE } from "./config";
import { getSupabaseBrowserClient, hasSupabaseConfig } from "./supabase";
import type { PendingCoachStatus } from "./schema";

const COLLECTION = "pending_coaches";

export interface PendingCoachInput {
  uid: string;
  email: string;
  realName: string;
  city: string;
  phone: string;
  birthday: string;
  nickname: string;
  ntrpRange: string;
  pricePerHour: number;
  bio: string;
  idFrontUrl: string;
  idFrontPath: string;
  idBackUrl: string;
  idBackPath: string;
}

export interface PendingCoachRecord extends PendingCoachInput {
  status: PendingCoachStatus;
  rejectionReason?: string;
  linkedCoachId?: string;
  submittedAt?: number;
  reviewedAt?: number;
  reviewedBy?: string;
}

function toMillis(value: unknown): number | undefined {
  if (!value) return undefined;
  const ms = new Date(String(value)).getTime();
  return Number.isFinite(ms) ? ms : undefined;
}

function fromRow(row: Record<string, unknown>): PendingCoachRecord {
  return {
    uid: String(row.uid ?? ""),
    email: String(row.email ?? ""),
    realName: String(row.real_name ?? ""),
    city: String(row.city ?? ""),
    phone: String(row.phone ?? ""),
    birthday: String(row.birthday ?? ""),
    nickname: String(row.nickname ?? ""),
    ntrpRange: String(row.ntrp_range ?? ""),
    pricePerHour: Number(row.price_per_hour ?? 0),
    bio: String(row.bio ?? ""),
    idFrontUrl: row.id_front_url ? String(row.id_front_url) : "",
    idFrontPath: row.id_front_path ? String(row.id_front_path) : "",
    idBackUrl: row.id_back_url ? String(row.id_back_url) : "",
    idBackPath: row.id_back_path ? String(row.id_back_path) : "",
    status: (row.status as PendingCoachStatus) ?? "pending",
    rejectionReason: row.rejection_reason ? String(row.rejection_reason) : undefined,
    linkedCoachId: row.linked_coach_id ? String(row.linked_coach_id) : undefined,
    submittedAt: toMillis(row.submitted_at),
    reviewedAt: toMillis(row.reviewed_at),
    reviewedBy: row.reviewed_by ? String(row.reviewed_by) : undefined,
  };
}

export async function fetchPendingCoach(uid: string): Promise<PendingCoachRecord | null> {
  if (!USE_SUPABASE || !hasSupabaseConfig()) return null;
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from(COLLECTION)
    .select("*")
    .eq("uid", uid)
    .maybeSingle();
  if (error) throw error;
  return data ? fromRow(data as Record<string, unknown>) : null;
}

export function subscribePendingCoach(
  uid: string,
  cb: (record: PendingCoachRecord | null) => void,
) {
  if (!USE_SUPABASE || !hasSupabaseConfig()) {
    cb(null);
    return () => {};
  }
  const supabase = getSupabaseBrowserClient();
  let active = true;
  const load = () => fetchPendingCoach(uid).then((record) => {
    if (active) cb(record);
  });
  load().catch((err) => console.error(`[pending_coaches/${uid}] Supabase 讀取失敗：`, err.message));
  const channel = supabase
    .channel(`public:pending_coaches:${uid}`)
    .on("postgres_changes", { event: "*", schema: "public", table: COLLECTION }, () => {
      void load().catch(() => {});
    })
    .subscribe();
  return () => {
    active = false;
    void supabase.removeChannel(channel);
  };
}

export function subscribePendingCoaches(
  cb: (records: PendingCoachRecord[]) => void,
) {
  if (!USE_SUPABASE || !hasSupabaseConfig()) {
    cb([]);
    return () => {};
  }
  const supabase = getSupabaseBrowserClient();
  let active = true;
  const load = async () => {
    const { data, error } = await supabase
      .from(COLLECTION)
      .select("*")
      .order("submitted_at", { ascending: false });
    if (error) throw error;
    if (active) cb((data ?? []).map((row) => fromRow(row as Record<string, unknown>)));
  };
  load().catch(() => {
    if (active) cb([]);
  });
  const channel = supabase
    .channel("admin:pending_coaches")
    .on("postgres_changes", { event: "*", schema: "public", table: COLLECTION }, () => {
      void load().catch(() => {});
    })
    .subscribe();
  return () => {
    active = false;
    void supabase.removeChannel(channel);
  };
}

export async function submitPendingCoach(input: PendingCoachInput): Promise<void> {
  if (!USE_SUPABASE || !hasSupabaseConfig()) throw new Error("教練申請需要 Supabase 設定");
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from(COLLECTION).upsert({
    uid: input.uid,
    email: input.email,
    real_name: input.realName,
    city: input.city,
    phone: input.phone,
    birthday: input.birthday,
    nickname: input.nickname,
    ntrp_range: input.ntrpRange,
    price_per_hour: input.pricePerHour,
    bio: input.bio,
    id_front_url: input.idFrontUrl,
    id_front_path: input.idFrontPath,
    id_back_url: input.idBackUrl,
    id_back_path: input.idBackPath,
    status: "pending",
    rejection_reason: null,
    submitted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function approvePendingCoach(
  record: PendingCoachRecord,
  reviewerEmail: string,
): Promise<string> {
  if (!USE_SUPABASE || !hasSupabaseConfig()) throw new Error("教練審核需要 Supabase 設定");
  const supabase = getSupabaseBrowserClient();
  const coachId = crypto.randomUUID();
  const { error: coachError } = await supabase.from("coaches").insert({
    id: coachId,
    uid: record.uid,
    nickname: record.nickname || record.realName,
    city: record.city,
    ntrp_range: record.ntrpRange,
    price_per_hour: record.pricePerHour,
    bio: record.bio,
    rating: 0,
    is_verified: true,
    is_published: true,
    is_deleted: false,
    updated_at: new Date().toISOString(),
  });
  if (coachError) throw coachError;

  const { error } = await supabase
    .from(COLLECTION)
    .update({
      status: "approved",
      linked_coach_id: coachId,
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewerEmail,
      rejection_reason: null,
      id_front_url: null,
      id_front_path: null,
      id_back_url: null,
      id_back_path: null,
      updated_at: new Date().toISOString(),
    })
    .eq("uid", record.uid);
  if (error) throw error;

  if (record.idFrontPath) await deleteStorageObject(record.idFrontPath);
  if (record.idBackPath) await deleteStorageObject(record.idBackPath);
  return coachId;
}

export async function rejectPendingCoach(
  record: PendingCoachRecord,
  reviewerEmail: string,
  reason: string,
): Promise<void> {
  if (!USE_SUPABASE || !hasSupabaseConfig()) throw new Error("教練審核需要 Supabase 設定");
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from(COLLECTION)
    .update({
      status: "rejected",
      rejection_reason: reason,
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewerEmail,
      id_front_url: null,
      id_front_path: null,
      id_back_url: null,
      id_back_path: null,
      updated_at: new Date().toISOString(),
    })
    .eq("uid", record.uid);
  if (error) throw error;

  if (record.idFrontPath) await deleteStorageObject(record.idFrontPath);
  if (record.idBackPath) await deleteStorageObject(record.idBackPath);
}
