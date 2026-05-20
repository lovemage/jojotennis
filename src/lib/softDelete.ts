import { db } from "./firebase";
import {
  doc,
  updateDoc,
  writeBatch,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";

export async function softDelete(col: string, id: string): Promise<void> {
  await updateDoc(doc(db, col, id), {
    isDeleted: true,
    deletedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function softDeleteMatchCascade(matchId: string): Promise<void> {
  const batch = writeBatch(db);
  batch.update(doc(db, "matches", matchId), {
    isDeleted: true,
    deletedAt: serverTimestamp(),
    status: "cancelled",
    updatedAt: serverTimestamp(),
  });
  const appsSnap = await getDocs(
    query(
      collection(db, "match_applications"),
      where("matchId", "==", matchId),
      where("isDeleted", "==", false),
    ),
  );
  appsSnap.forEach((d) =>
    batch.update(d.ref, {
      isDeleted: true,
      deletedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );
  await batch.commit();
}
