import { db } from "./firebase";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import type { Coach } from "./schema";

export type UiCoach = {
  id: string;
  name: string;
  city: string;
  levelRange: string;
  price: number;
  rating: number;
  tagline: string;
  bio: string;
  uid: string;
};

function toUiCoach(id: string, data: Coach): UiCoach {
  return {
    id: data.coachId || id,
    uid: data.uid,
    name: data.nickname,
    city: data.city,
    levelRange: data.ntrpRange,
    price: data.pricePerHour,
    rating: data.rating,
    tagline: data.bio.slice(0, 40),
    bio: data.bio,
  };
}

export type AdminCoach = UiCoach & { isVerified: boolean };

function toAdminCoach(id: string, data: Coach): AdminCoach {
  return { ...toUiCoach(id, data), isVerified: Boolean(data.isVerified) };
}

export function subscribeToCoaches(cb: (coaches: UiCoach[]) => void) {
  return onSnapshot(
    collection(db, "coaches"),
    (snap) => {
      const coaches = snap.docs
        .filter((d) => (d.data() as Coach).isDeleted !== true)
        .map((d) => toUiCoach(d.id, { coachId: d.id, ...d.data() } as Coach));
      cb(coaches);
    },
    (err) => console.error("[coaches] 監聽失敗：", err.code, err.message),
  );
}

export function subscribeToCoachesAdmin(cb: (coaches: AdminCoach[]) => void) {
  return onSnapshot(
    query(collection(db, "coaches"), orderBy("createdAt", "desc")),
    (snap) =>
      cb(
        snap.docs
          .filter((d) => !(d.data() as Coach).isDeleted)
          .map((d) => toAdminCoach(d.id, { coachId: d.id, ...d.data() } as Coach)),
      ),
    () => cb([]),
  );
}

export async function setCoachVerified(coachId: string, isVerified: boolean) {
  await updateDoc(doc(db, "coaches", coachId), {
    isVerified,
    updatedAt: serverTimestamp(),
  });
}
