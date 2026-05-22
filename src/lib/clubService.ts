import { db } from "./firebase";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  onSnapshot,
  getDocs,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import {
  createClubConversation,
  addUserToConversation,
  removeUserFromConversation,
  sendSystemMessage,
} from "./messageService";
import type { Club } from "./schema";

const BASE = { isDeleted: false, deletedAt: null, updatedAt: serverTimestamp() };

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
  const ref = await addDoc(collection(db, "clubs"), {
    ...data,
    ...BASE,
    memberCount: 1,
    createdAt: serverTimestamp(),
  });
  await addDoc(collection(db, "club_members"), {
    clubId: ref.id,
    uid: data.ownerUid,
    nickname: data.ownerNickname,
    role: "owner",
    joinedAt: serverTimestamp(),
    isActive: true,
  });
  await createClubConversation(ref.id, data.name, data.ownerUid);
  return ref.id;
}

export async function joinClub(clubId: string, uid: string, nickname: string): Promise<void> {
  const dup = await getDocs(
    query(
      collection(db, "club_members"),
      where("clubId", "==", clubId),
      where("uid", "==", uid),
      where("isActive", "==", true),
    ),
  );
  if (!dup.empty) throw new Error("已加入此社團");
  await addDoc(collection(db, "club_members"), {
    clubId,
    uid,
    nickname,
    role: "member",
    joinedAt: serverTimestamp(),
    isActive: true,
  });
  await updateDoc(doc(db, "clubs", clubId), {
    memberCount: increment(1),
    updatedAt: serverTimestamp(),
  });
  await addUserToConversation(`club_${clubId}`, uid);
  await sendSystemMessage(`club_${clubId}`, `${nickname} 加入了社團！`);
}

export async function leaveClub(clubId: string, uid: string, nickname: string): Promise<void> {
  const snap = await getDocs(
    query(
      collection(db, "club_members"),
      where("clubId", "==", clubId),
      where("uid", "==", uid),
      where("isActive", "==", true),
    ),
  );
  if (snap.empty) throw new Error("未加入此社團");
  await updateDoc(snap.docs[0].ref, { isActive: false, updatedAt: serverTimestamp() });
  await updateDoc(doc(db, "clubs", clubId), {
    memberCount: increment(-1),
    updatedAt: serverTimestamp(),
  });
  await removeUserFromConversation(`club_${clubId}`, uid);
  void nickname;
}

export function subscribeToClubs(cb: (clubs: Club[]) => void, cityFilter?: string) {
  return onSnapshot(
    collection(db, "clubs"),
    (snap) => {
      let results = snap.docs.map((d) => ({ clubId: d.id, ...d.data() }) as Club);
      results = results.filter(
        (c) => c.isDeleted !== true && (!cityFilter || c.city === cityFilter),
      );
      results.sort((a, b) => {
        const ta = (a.createdAt as { toMillis?: () => number })?.toMillis?.() ?? 0;
        const tb = (b.createdAt as { toMillis?: () => number })?.toMillis?.() ?? 0;
        return tb - ta;
      });
      cb(results);
    },
    (err) => console.error("clubs 監聽失敗：", err),
  );
}

export async function softDeleteClub(clubId: string): Promise<void> {
  await updateDoc(doc(db, "clubs", clubId), {
    isDeleted: true,
    deletedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
