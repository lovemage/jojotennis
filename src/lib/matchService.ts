import { db } from "./firebase";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  getDoc,
  getDocs,
  serverTimestamp,
  increment,
  runTransaction,
} from "firebase/firestore";
import { softDeleteMatchCascade } from "./softDelete";
import {
  sendSystemMessage,
  createMatchConversation,
  addUserToConversation,
  removeUserFromConversation,
  getOrCreateDirectConversation,
} from "./messageService";
import { isTimeRangeValid, weekdayLabel } from "./timeUtils";
import type { Match, MatchApplication } from "./schema";

const BASE = {
  isDeleted: false,
  deletedAt: null,
  updatedAt: serverTimestamp(),
};

export async function createMatch(data: {
  ownerUid: string;
  ownerNickname: string;
  title: string;
  city: string;
  district: string;
  venue: string;
  date: string;
  startTime: string;
  endTime: string;
  ntrpRequired: string[];
  totalSlots: number;
  note: string;
}): Promise<string> {
  if (!isTimeRangeValid(data.startTime, data.endTime))
    throw new Error("結束時間必須晚於開始時間");
  if (data.totalSlots < 1 || data.totalSlots > 8) throw new Error("人數需在 1–8 人之間");
  if (!data.title.trim()) throw new Error("標題不可為空");

  const ref = await addDoc(collection(db, "matches"), {
    ...data,
    ...BASE,
    weekday: weekdayLabel(data.date),
    filledSlots: 0,
    status: "open",
    createdAt: serverTimestamp(),
  });
  await createMatchConversation(ref.id, data.title, data.ownerUid);
  return ref.id;
}

export function subscribeToMatches(cb: (m: Match[]) => void, cityFilter?: string) {
  return onSnapshot(
    collection(db, "matches"),
    (snap) => {
      let results = snap.docs.map((d) => ({ matchId: d.id, ...d.data() }) as Match);
      results = results.filter(
        (m) =>
          m.isDeleted !== true &&
          m.status === "open" &&
          (!cityFilter || m.city === cityFilter),
      );
      results.sort((a, b) => {
        const ta = (a.createdAt as { toMillis?: () => number })?.toMillis?.() ?? 0;
        const tb = (b.createdAt as { toMillis?: () => number })?.toMillis?.() ?? 0;
        return tb - ta;
      });
      console.log("揪球資料更新，筆數：", results.length);
      cb(results);
    },
    (err) => console.error("matches 監聽失敗：", err),
  );
}

/** 後台用：含已取消/已刪除的揪球 */
export function subscribeToAllMatches(cb: (m: Match[]) => void) {
  return onSnapshot(query(collection(db, "matches"), orderBy("createdAt", "desc")), (snap) =>
    cb(snap.docs.map((d) => ({ matchId: d.id, ...d.data() }) as Match)),
  );
}

export function subscribeToMyMatches(
  uid: string,
  cb: (owned: Match[], joined: MatchApplication[]) => void,
) {
  const unsubOwned = onSnapshot(
    query(
      collection(db, "matches"),
      where("ownerUid", "==", uid),
      where("isDeleted", "==", false),
      orderBy("createdAt", "desc"),
    ),
    (snap) => {
      const owned = snap.docs.map((d) => ({ matchId: d.id, ...d.data() }) as Match);
      const unsubJoined = onSnapshot(
        query(
          collection(db, "match_applications"),
          where("applicantUid", "==", uid),
          where("isDeleted", "==", false),
          orderBy("createdAt", "desc"),
        ),
        (snap2) =>
          cb(
            owned,
            snap2.docs.map((d) => ({ appId: d.id, ...d.data() }) as MatchApplication),
          ),
      );
      return unsubJoined;
    },
  );
  return unsubOwned;
}

export async function applyToMatch(
  matchId: string,
  applicantUid: string,
  applicantNickname: string,
): Promise<{ ok: boolean; msg: string }> {
  const mSnap = await getDoc(doc(db, "matches", matchId));
  if (!mSnap.exists()) return { ok: false, msg: "球局不存在" };
  const m = mSnap.data() as Match;
  if (m.isDeleted || m.status === "cancelled") return { ok: false, msg: "球局已取消" };
  if (m.status === "closed") return { ok: false, msg: "球局已額滿" };
  if (m.ownerUid === applicantUid) return { ok: false, msg: "主揪不需要申請" };

  const dup = await getDocs(
    query(
      collection(db, "match_applications"),
      where("matchId", "==", matchId),
      where("applicantUid", "==", applicantUid),
      where("isDeleted", "==", false),
    ),
  );
  const existing = dup.docs[0]?.data();
  if (existing && !["declined", "removed"].includes(existing.status))
    return { ok: false, msg: "已申請過此球局" };

  await addDoc(collection(db, "match_applications"), {
    matchId,
    applicantUid,
    applicantNickname,
    status: "pending",
    ...BASE,
    createdAt: serverTimestamp(),
  });
  await sendSystemMessage(`match_${matchId}`, `${applicantNickname} 申請加入，等待主揪確認。`);
  return { ok: true, msg: "申請已送出" };
}

export async function respondToApplication(
  appId: string,
  matchId: string,
  accept: boolean,
  applicantUid: string,
  applicantNickname: string,
): Promise<void> {
  const appRef = doc(db, "match_applications", appId);
  const appSnap = await getDoc(appRef);
  if (!appSnap.exists()) throw new Error("申請不存在");
  if (appSnap.data().status !== "pending") throw new Error("此申請已處理");

  let matchTitle = "";
  await runTransaction(db, async (tx) => {
    const mRef = doc(db, "matches", matchId);
    const mSnap = await tx.get(mRef);
    const m = mSnap.data() as Match;
    matchTitle = m.title;
    tx.update(appRef, { status: accept ? "accepted" : "declined", updatedAt: serverTimestamp() });
    if (accept) {
      const newFilled = m.filledSlots + 1;
      tx.update(mRef, {
        filledSlots: increment(1),
        status: newFilled >= m.totalSlots ? "closed" : "open",
        updatedAt: serverTimestamp(),
      });
    }
  });

  if (accept) {
    await addUserToConversation(`match_${matchId}`, applicantUid);
    await sendSystemMessage(`match_${matchId}`, `${applicantNickname} 已加入球局！`);
    const mSnap2 = await getDoc(doc(db, "matches", matchId));
    if ((mSnap2.data() as Match).status === "closed")
      await sendSystemMessage(
        `match_${matchId}`,
        `「${matchTitle}」招募完成！祝大家打球愉快 🎾`,
      );
  }

  const directId = await getOrCreateDirectConversation(applicantUid, applicantNickname);
  await sendSystemMessage(
    directId,
    accept
      ? `你已被接受加入「${matchTitle}」！請查看球局聊天室確認集合資訊。`
      : `你申請的「${matchTitle}」未被接受，繼續找其他球友吧！`,
  );
}

export async function removeFromMatch(
  matchId: string,
  targetUid: string,
  targetNickname: string,
  matchTitle: string,
): Promise<void> {
  const snap = await getDocs(
    query(
      collection(db, "match_applications"),
      where("matchId", "==", matchId),
      where("applicantUid", "==", targetUid),
      where("status", "==", "accepted"),
    ),
  );
  if (snap.empty) throw new Error("找不到此球友的申請記錄");
  await updateDoc(snap.docs[0].ref, { status: "removed", updatedAt: serverTimestamp() });
  await updateDoc(doc(db, "matches", matchId), {
    filledSlots: increment(-1),
    status: "open",
    updatedAt: serverTimestamp(),
  });
  const convId = await getOrCreateDirectConversation(targetUid, targetNickname);
  await sendSystemMessage(
    convId,
    `您已被主辦人從「${matchTitle}」中移除，如有場地費問題請於此聊天室協調。⚠️ 請勿在平台外轉帳，謹防詐騙。`,
  );
}

export async function transferMatchOwnership(
  matchId: string,
  currentOwnerUid: string,
  newOwnerUid: string,
  newOwnerNickname: string,
): Promise<void> {
  const mSnap = await getDoc(doc(db, "matches", matchId));
  const m = mSnap.data() as Match;
  if (m.ownerUid !== currentOwnerUid) throw new Error("只有主揪可轉移主辦權");

  const check = await getDocs(
    query(
      collection(db, "match_applications"),
      where("matchId", "==", matchId),
      where("applicantUid", "==", newOwnerUid),
      where("status", "==", "accepted"),
      where("isDeleted", "==", false),
    ),
  );
  if (check.empty) throw new Error("新主揪必須是已接受的球友");

  await updateDoc(doc(db, "matches", matchId), {
    ownerUid: newOwnerUid,
    ownerNickname: newOwnerNickname,
    updatedAt: serverTimestamp(),
  });
  await sendSystemMessage(`match_${matchId}`, `系統紀錄：主辦權已移交給 ${newOwnerNickname}。`);
}

export async function leaveFromMatch(
  matchId: string,
  applicantUid: string,
  applicantNickname: string,
  matchTitle: string,
): Promise<void> {
  const snap = await getDocs(
    query(
      collection(db, "match_applications"),
      where("matchId", "==", matchId),
      where("applicantUid", "==", applicantUid),
      where("status", "==", "accepted"),
      where("isDeleted", "==", false),
    ),
  );
  if (snap.empty) throw new Error("你尚未加入此球局");
  await updateDoc(snap.docs[0].ref, { status: "removed", updatedAt: serverTimestamp() });
  await updateDoc(doc(db, "matches", matchId), {
    filledSlots: increment(-1),
    status: "open",
    updatedAt: serverTimestamp(),
  });
  await removeUserFromConversation(`match_${matchId}`, applicantUid);
  const convId = await getOrCreateDirectConversation(applicantUid, applicantNickname);
  await sendSystemMessage(convId, `你已退出「${matchTitle}」。`);
  await sendSystemMessage(`match_${matchId}`, `${applicantNickname} 已退出球局。`);
}

export async function cancelMatch(
  matchId: string,
  ownerUid: string,
  matchTitle: string,
): Promise<void> {
  const mSnap = await getDoc(doc(db, "matches", matchId));
  const m = mSnap.data() as Match;
  if (m.ownerUid !== ownerUid) throw new Error("只有主揪可取消活動");
  if (m.isDeleted) throw new Error("活動已取消");

  await softDeleteMatchCascade(matchId);

  const accepted = await getDocs(
    query(
      collection(db, "match_applications"),
      where("matchId", "==", matchId),
      where("status", "==", "accepted"),
    ),
  );
  for (const app of accepted.docs) {
    const { applicantUid, applicantNickname } = app.data();
    const cId = await getOrCreateDirectConversation(applicantUid, applicantNickname);
    await sendSystemMessage(
      cId,
      `很遺憾，「${matchTitle}」已被主辦人取消。如有問題可在此聊天室聯繫。`,
    );
  }
  await sendSystemMessage(`match_${matchId}`, `「${matchTitle}」已取消。感謝各位參與。`);
}

export async function closeMatch(matchId: string): Promise<void> {
  await updateDoc(doc(db, "matches", matchId), {
    status: "closed",
    updatedAt: serverTimestamp(),
  });
}

export async function undoApplicationToPending(
  matchId: string,
  applicantUid: string,
  filledSlots: number,
): Promise<void> {
  const snap = await getDocs(
    query(
      collection(db, "match_applications"),
      where("matchId", "==", matchId),
      where("applicantUid", "==", applicantUid),
    ),
  );
  if (!snap.empty) {
    await updateDoc(snap.docs[0].ref, { status: "pending", updatedAt: serverTimestamp() });
  }
  await updateDoc(doc(db, "matches", matchId), {
    filledSlots,
    status: "open",
    updatedAt: serverTimestamp(),
  });
}

export async function adminUpdateMatchStatus(
  matchId: string,
  status: Match["status"],
): Promise<void> {
  await updateDoc(doc(db, "matches", matchId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

export async function adminSoftDeleteMatch(matchId: string): Promise<void> {
  await updateDoc(doc(db, "matches", matchId), {
    isDeleted: true,
    deletedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
