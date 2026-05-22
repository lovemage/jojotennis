import { db } from "./firebase";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";

export async function createStudentPost(data: {
  uid: string;
  nickname: string;
  title: string;
  city: string;
  district: string;
  targetLevel: string;
  preferredTime: string;
  budget: string;
  intro: string;
}): Promise<string> {
  try {
    const ref = await addDoc(collection(db, "student_posts"), {
      uid: data.uid,
      nickname: data.nickname,
      title: data.title,
      city: data.city,
      district: data.district,
      targetNtrp: data.targetLevel,
      preferTimes: data.preferredTime.split("、").filter(Boolean),
      budget: data.budget,
      description: data.intro,
      status: "active",
      isDeleted: false,
      deletedAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    console.log("✅ 需求已寫入，ID：", ref.id);
    const check = await getDoc(ref);
    console.log("寫入後讀回：", check.data());
    return ref.id;
  } catch (err) {
    console.error("❌ 寫入失敗：", err);
    throw err;
  }
}

export async function updateStudentPostStatus(
  postId: string,
  status: "active" | "closed",
): Promise<void> {
  await updateDoc(doc(db, "student_posts", postId), {
    status,
    updatedAt: serverTimestamp(),
  });
}
