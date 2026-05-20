import { db } from "./firebase";
import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  updateDoc,
  serverTimestamp,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import type { User as SchemaUser } from "./schema";

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
  };
}

export async function fetchUsersPage(
  pageSize = 20,
  cursor?: QueryDocumentSnapshot,
): Promise<{ users: AdminUserRow[]; lastDoc: QueryDocumentSnapshot | null }> {
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
  await updateDoc(doc(db, "users", uid), {
    ...fields,
    updatedAt: serverTimestamp(),
  });
}

export async function updateUserProfile(
  uid: string,
  fields: Partial<
    Pick<SchemaUser, "nickname" | "ntrp" | "region" | "yearsPlaying" | "bio" | "avatarUrl">
  >,
): Promise<void> {
  await updateDoc(doc(db, "users", uid), {
    ...fields,
    updatedAt: serverTimestamp(),
  });
}

export { getUserProfile } from "./authService";
