import { db } from "./firebase";
import { collection, addDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";

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
}): Promise<void> {
  await addDoc(collection(db, "student_posts"), {
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
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
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
