import { db } from "./firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  runTransaction,
  startAfter,
  updateDoc,
  serverTimestamp,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
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

function toAdminUserRow(
  snap: QueryDocumentSnapshot,
): AdminUserRow {
  const data = snap.data() as Partial<SchemaUser> & Record<string, unknown>;
  const nickname = String(data.nickname ?? "新球友");
  const createdAt =
    data.createdAt && typeof data.createdAt === "object" && "toDate" in data.createdAt
      ? (data.createdAt as { toDate: () => Date }).toDate().getTime()
      : Date.now();

  return {
    uid: snap.id,
    email: String(data.email ?? ""),
    nickname,
    ntrp: String(data.ntrp ?? "2.0"),
    region: String(data.region ?? "台北市"),
    yearsPlaying: Number(data.yearsPlaying ?? 0),
    avatarInitial: nickname[0] || "?",
    role: (data.role as SchemaUser["role"]) ?? "user",
    isActive: data.isActive !== false,
    createdAt,
    nicknameChangesUsed: Number(data.nicknameChangesUsed ?? 0),
  };
}

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

function isMissingSupabaseUsersTable(error: { message?: string; code?: string } | null) {
  if (!error) return false;
  return (
    error.code === "PGRST205" ||
    /Could not find the table 'public\.users'|relation .*users.* does not exist/i.test(
      error.message ?? "",
    )
  );
}

export async function fetchUsersPage(
  pageSize = 20,
  cursor?: QueryDocumentSnapshot,
): Promise<{ users: AdminUserRow[]; lastDoc: QueryDocumentSnapshot | null }> {
  if (USE_SUPABASE && hasSupabaseConfig()) {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(pageSize);

    if (!error) {
      return {
        users: (data ?? []).map((row) => toAdminUserRowFromSupabase(row as Record<string, unknown>)),
        lastDoc: null,
      };
    }

    if (!isMissingSupabaseUsersTable(error)) throw error;
  }

  const q = cursor
    ? query(collection(db, "users"), orderBy("createdAt", "desc"), startAfter(cursor), limit(pageSize))
    : query(collection(db, "users"), orderBy("createdAt", "desc"), limit(pageSize));

  const snap = await getDocs(q);
  const users = snap.docs.map(toAdminUserRow);
  const lastDoc = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
  return { users, lastDoc };
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
    if (!isMissingSupabaseUsersTable(error)) throw error;
  }

  await updateDoc(doc(db, "users", uid), {
    ...fields,
    updatedAt: serverTimestamp(),
  });
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
    const { error } = await supabase
      .from("users")
      .update({
        nickname: fields.nickname,
        ntrp: fields.ntrp,
        region: fields.region,
        years_playing: fields.yearsPlaying,
        bio: fields.bio,
        avatar_url: fields.avatarUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("uid", uid);

    if (!error) return;
    if (!isMissingSupabaseUsersTable(error)) throw error;
  }

  const userRef = doc(db, "users", uid);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(userRef);
    const current = snap.exists() ? (snap.data() as SchemaUser) : null;
    const currentNickname = current?.nickname ?? "";
    const used = Number(current?.nicknameChangesUsed ?? 0);
    let isNicknameChange = false;
    if (typeof fields.nickname === "string") {
      const next = fields.nickname.trim();
      if (next && next !== currentNickname) {
        if (used >= NICKNAME_CHANGE_LIMIT) {
          throw new Error("已用完三次暱稱更改機會，請聯繫管理員");
        }
        isNicknameChange = true;
      }
    }
    const payload: Record<string, unknown> = {
      ...fields,
      updatedAt: serverTimestamp(),
    };
    if (isNicknameChange) {
      payload.nicknameChangesUsed = increment(1);
    }
    tx.update(userRef, payload);
  });
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
    if (!isMissingSupabaseUsersTable(error)) throw error;
  }

  await updateDoc(doc(db, "users", uid), {
    nicknameChangesUsed: 0,
    updatedAt: serverTimestamp(),
  });
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

  await updateDoc(doc(db, "users", uid), {
    isActive,
    updatedAt: serverTimestamp(),
  });
}

export { getUserProfile } from "./authService";
