import { db } from "./firebase";
import { doc, getDoc, setDoc, updateDoc, increment, serverTimestamp } from "firebase/firestore";

export async function giveHeart(
  matchId: string,
  fromUid: string,
  toUid: string,
): Promise<{ ok: boolean; msg: string }> {
  if (fromUid === toUid) return { ok: false, msg: "不能給自己愛心" };

  const mSnap = await getDoc(doc(db, "matches", matchId));
  if (!mSnap.exists()) return { ok: false, msg: "球局不存在" };
  const m = mSnap.data();
  if (m.isDeleted) return { ok: false, msg: "球局已刪除" };
  if (!["closed", "cancelled"].includes(m.status)) return { ok: false, msg: "球局尚未結束" };

  const heartId = `${matchId}_${fromUid}_${toUid}`;
  const heartRef = doc(db, "heart_records", heartId);
  if ((await getDoc(heartRef)).exists()) return { ok: false, msg: "已給過愛心" };

  await setDoc(heartRef, {
    id: heartId,
    matchId,
    fromUid,
    toUid,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, "users", toUid), {
    heartsReceived: increment(1),
    updatedAt: serverTimestamp(),
  });
  return { ok: true, msg: "已給予愛心！" };
}
