import { db } from "./firebase";
import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";

export interface Announcement {
  id: string;
  message: string;
  isActive: boolean;
  priority: number;
  startsAt?: number;
  endsAt?: number;
  updatedAt?: number;
}

export interface AnnouncementInput {
  id?: string;
  message: string;
  isActive: boolean;
  priority: number;
  startsAt?: number | null;
  endsAt?: number | null;
}

function tsToMillis(value: unknown): number | undefined {
  if (!value) return undefined;
  if (value instanceof Timestamp) return value.toMillis();
  if (typeof value === "object" && value !== null && "toMillis" in (value as Record<string, unknown>)) {
    try {
      return (value as { toMillis: () => number }).toMillis();
    } catch {
      return undefined;
    }
  }
  if (typeof value === "number") return value;
  return undefined;
}

export const subscribeAnnouncements = (cb: (items: Announcement[]) => void) =>
  onSnapshot(
    query(collection(db, "announcements"), orderBy("priority", "desc")),
    (snap) => {
      const items: Announcement[] = snap.docs.map((d) => {
        const data = d.data() as Record<string, unknown>;
        return {
          id: d.id,
          message: String(data.message ?? ""),
          isActive: data.isActive !== false,
          priority: Number(data.priority ?? 0),
          startsAt: tsToMillis(data.startsAt),
          endsAt: tsToMillis(data.endsAt),
          updatedAt: tsToMillis(data.updatedAt),
        };
      });
      cb(items);
    },
    (err) => console.error("[announcements] 監聽失敗：", err.code, err.message),
  );

export async function saveAnnouncement(data: AnnouncementInput): Promise<string> {
  const payload: Record<string, unknown> = {
    message: data.message,
    isActive: data.isActive,
    priority: data.priority ?? 0,
    updatedAt: serverTimestamp(),
  };
  if (data.startsAt) payload.startsAt = Timestamp.fromMillis(data.startsAt);
  else if (data.startsAt === null) payload.startsAt = null;
  if (data.endsAt) payload.endsAt = Timestamp.fromMillis(data.endsAt);
  else if (data.endsAt === null) payload.endsAt = null;

  if (data.id) {
    await setDoc(doc(db, "announcements", data.id), payload, { merge: true });
    return data.id;
  }
  const ref = await addDoc(collection(db, "announcements"), payload);
  return ref.id;
}

export const deleteAnnouncement = (id: string) =>
  deleteDoc(doc(db, "announcements", id));

export const toggleAnnouncementActive = (id: string, active: boolean) =>
  updateDoc(doc(db, "announcements", id), {
    isActive: active,
    updatedAt: serverTimestamp(),
  });
