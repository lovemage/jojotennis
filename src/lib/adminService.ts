import { db } from "./firebase";
import {
  collection,
  doc,
  getDoc,
  getCountFromServer,
  query,
  where,
  updateDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { saveCourt } from "./courtService";
import type { Court as SchemaCourt } from "./schema";

export type AdminDashboardCounts = {
  users: number;
  openMatches: number;
  clubs: number;
  pendingCourts: number;
  news: number;
  coaches: number;
  studentPosts: number;
};

/** 後台儀表板用聚合計數（需管理員權限通過 Security Rules） */
export async function fetchAdminDashboardCounts(): Promise<AdminDashboardCounts> {
  const [
    usersSnap,
    openMatchesSnap,
    clubsSnap,
    pendingCourtsSnap,
    newsSnap,
    coachesSnap,
    studentSnap,
  ] = await Promise.all([
    getCountFromServer(collection(db, "users")),
    getCountFromServer(
      query(collection(db, "matches"), where("isDeleted", "==", false), where("status", "==", "open")),
    ),
    getCountFromServer(query(collection(db, "clubs"), where("isDeleted", "==", false))),
    getCountFromServer(query(collection(db, "pending_courts"), where("status", "==", "pending"))),
    getCountFromServer(collection(db, "news")),
    getCountFromServer(query(collection(db, "coaches"), where("isDeleted", "==", false))),
    getCountFromServer(query(collection(db, "student_posts"), where("isDeleted", "==", false))),
  ]);

  return {
    users: usersSnap.data().count,
    openMatches: openMatchesSnap.data().count,
    clubs: clubsSnap.data().count,
    pendingCourts: pendingCourtsSnap.data().count,
    news: newsSnap.data().count,
    coaches: coachesSnap.data().count,
    studentPosts: studentSnap.data().count,
  };
}

/** 核准待審球場：寫入 courts，並標記 pending_courts */
export async function approvePendingCourt(pendingId: string): Promise<string> {
  const ref = doc(db, "pending_courts", pendingId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("待審件不存在");
  const data = snap.data() as Record<string, unknown>;
  if (String(data.status ?? "pending") !== "pending") throw new Error("此筆已處理");

  const courtId = doc(collection(db, "courts")).id;
  const district = String(data.district ?? "");
  const bookingMethod = String(data.bookingMethod ?? "");
  const isUrl = /^https?:\/\//i.test(bookingMethod.trim());
  const desc = String(data.description ?? data.note ?? "");

  const newCourt: Omit<SchemaCourt, "createdAt" | "updatedAt"> & { courtId: string } = {
    courtId,
    name: String(data.name ?? "未命名球場"),
    city: String(data.city ?? ""),
    district,
    address: String(data.address ?? ""),
    lat: 0,
    lng: 0,
    surfaceType: "hard",
    indoor: "outdoor",
    totalCourts: Math.max(1, Number.parseInt(String(data.courtCount ?? "1"), 10) || 1),
    hasNightLight: false,
    phone: "",
    bookingUrl: isUrl ? bookingMethod.trim() : "",
    openHours: isUrl ? desc : [bookingMethod, desc].filter(Boolean).join("；") || "—",
    status: "active",
    isDeleted: false,
    deletedAt: null,
  };

  await saveCourt(newCourt);
  await updateDoc(ref, {
    status: "approved",
    reviewedAt: serverTimestamp(),
    approvedCourtId: courtId,
  });
  return courtId;
}

export async function rejectPendingCourt(pendingId: string): Promise<void> {
  await updateDoc(doc(db, "pending_courts", pendingId), {
    status: "rejected",
    reviewedAt: serverTimestamp(),
  });
}

export async function grantAdminEmail(email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  await setDoc(doc(db, "adminUsers", normalized), { email: normalized });
}
