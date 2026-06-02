import { db } from "./firebase";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { deleteStorageObject } from "./storageUploads";
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

export interface PendingCoachRecord {
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
  idFrontUrl?: string;
  idFrontPath?: string;
  idBackUrl?: string;
  idBackPath?: string;
  status: PendingCoachStatus;
  rejectionReason?: string;
  linkedCoachId?: string;
  submittedAt?: number;
  reviewedAt?: number;
  reviewedBy?: string;
}

function tsToMillis(value: unknown): number | undefined {
  if (!value) return undefined;
  if (value instanceof Timestamp) return value.toMillis();
  if (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { toMillis?: () => number }).toMillis === "function"
  ) {
    try {
      return (value as { toMillis: () => number }).toMillis();
    } catch {
      return undefined;
    }
  }
  if (typeof value === "number") return value;
  return undefined;
}

function fromDoc(uid: string, data: Record<string, unknown>): PendingCoachRecord {
  return {
    uid,
    email: String(data.email ?? ""),
    realName: String(data.realName ?? ""),
    city: String(data.city ?? ""),
    phone: String(data.phone ?? ""),
    birthday: String(data.birthday ?? ""),
    nickname: String(data.nickname ?? ""),
    ntrpRange: String(data.ntrpRange ?? ""),
    pricePerHour: Number(data.pricePerHour ?? 0),
    bio: String(data.bio ?? ""),
    idFrontUrl: data.idFrontUrl ? String(data.idFrontUrl) : undefined,
    idFrontPath: data.idFrontPath ? String(data.idFrontPath) : undefined,
    idBackUrl: data.idBackUrl ? String(data.idBackUrl) : undefined,
    idBackPath: data.idBackPath ? String(data.idBackPath) : undefined,
    status: (data.status as PendingCoachStatus) ?? "pending",
    rejectionReason: data.rejectionReason ? String(data.rejectionReason) : undefined,
    linkedCoachId: data.linkedCoachId ? String(data.linkedCoachId) : undefined,
    submittedAt: tsToMillis(data.submittedAt),
    reviewedAt: tsToMillis(data.reviewedAt),
    reviewedBy: data.reviewedBy ? String(data.reviewedBy) : undefined,
  };
}

export async function fetchPendingCoach(uid: string): Promise<PendingCoachRecord | null> {
  const snap = await getDoc(doc(db, COLLECTION, uid));
  if (!snap.exists()) return null;
  return fromDoc(uid, snap.data() as Record<string, unknown>);
}

export function subscribePendingCoach(
  uid: string,
  cb: (record: PendingCoachRecord | null) => void,
) {
  return onSnapshot(
    doc(db, COLLECTION, uid),
    (snap) => {
      if (!snap.exists()) {
        cb(null);
        return;
      }
      cb(fromDoc(uid, snap.data() as Record<string, unknown>));
    },
    (err) => console.error(`[pending_coaches/${uid}] 監聽失敗：`, err.code, err.message),
  );
}

export function subscribePendingCoaches(
  cb: (records: PendingCoachRecord[]) => void,
) {
  return onSnapshot(
    query(collection(db, COLLECTION), orderBy("submittedAt", "desc")),
    (snap) => {
      cb(
        snap.docs.map((d) =>
          fromDoc(d.id, d.data() as Record<string, unknown>),
        ),
      );
    },
    (err) => console.error("[pending_coaches] 監聽失敗：", err.code, err.message),
  );
}

export async function submitPendingCoach(input: PendingCoachInput): Promise<void> {
  const payload = {
    uid: input.uid,
    email: input.email,
    realName: input.realName,
    city: input.city,
    phone: input.phone,
    birthday: input.birthday,
    nickname: input.nickname,
    ntrpRange: input.ntrpRange,
    pricePerHour: input.pricePerHour,
    bio: input.bio,
    idFrontUrl: input.idFrontUrl,
    idFrontPath: input.idFrontPath,
    idBackUrl: input.idBackUrl,
    idBackPath: input.idBackPath,
    status: "pending" as PendingCoachStatus,
    rejectionReason: null,
    submittedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(doc(db, COLLECTION, input.uid), payload, { merge: true });
}

export async function approvePendingCoach(
  record: PendingCoachRecord,
  reviewerEmail: string,
): Promise<string> {
  const publicCoach = {
    uid: record.uid,
    nickname: record.nickname || record.realName,
    city: record.city,
    ntrpRange: record.ntrpRange,
    pricePerHour: record.pricePerHour,
    bio: record.bio,
    rating: 0,
    isVerified: true,
    isPublished: true,
    isDeleted: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const coachRef = await addDoc(collection(db, "coaches"), publicCoach);

  await updateDoc(doc(db, COLLECTION, record.uid), {
    status: "approved",
    linkedCoachId: coachRef.id,
    reviewedAt: serverTimestamp(),
    reviewedBy: reviewerEmail,
    rejectionReason: null,
    idFrontUrl: null,
    idFrontPath: null,
    idBackUrl: null,
    idBackPath: null,
  });

  if (record.idFrontPath) await deleteStorageObject(record.idFrontPath);
  if (record.idBackPath) await deleteStorageObject(record.idBackPath);

  return coachRef.id;
}

export async function rejectPendingCoach(
  record: PendingCoachRecord,
  reviewerEmail: string,
  reason: string,
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, record.uid), {
    status: "rejected",
    rejectionReason: reason,
    reviewedAt: serverTimestamp(),
    reviewedBy: reviewerEmail,
    idFrontUrl: null,
    idFrontPath: null,
    idBackUrl: null,
    idBackPath: null,
  });

  if (record.idFrontPath) await deleteStorageObject(record.idFrontPath);
  if (record.idBackPath) await deleteStorageObject(record.idBackPath);
}
