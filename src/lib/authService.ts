import { auth, db, googleProvider } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendEmailVerification,
  onAuthStateChanged,
  type User as FBUser,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import type { User } from "./schema";

const BASE_USER = (uid: string, email: string, nickname: string, avatarUrl = "") => ({
  uid,
  email,
  nickname,
  ntrp: "2.0",
  region: "台北市",
  yearsPlaying: 0,
  avatarUrl,
  role: "user" as const,
  isActive: true,
  heartsReceived: 0,
  bio: "",
  isDeleted: false,
  deletedAt: null,
  updatedAt: serverTimestamp(),
  createdAt: serverTimestamp(),
});

export async function registerWithEmail(
  email: string,
  password: string,
  nickname: string,
): Promise<FBUser> {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await sendEmailVerification(cred.user);
  await setDoc(doc(db, "users", cred.user.uid), BASE_USER(cred.user.uid, email, nickname));
  return cred.user;
}

export async function loginWithEmail(email: string, password: string): Promise<FBUser> {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function loginWithGoogle(): Promise<FBUser> {
  const cred = await signInWithPopup(auth, googleProvider);
  const ref = doc(db, "users", cred.user.uid);
  if (!(await getDoc(ref)).exists()) {
    await setDoc(
      ref,
      BASE_USER(
        cred.user.uid,
        cred.user.email ?? "",
        cred.user.displayName ?? "網球球友",
        cred.user.photoURL ?? "",
      ),
    );
  }
  return cred.user;
}

export async function getUserProfile(uid: string): Promise<User | null> {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? (snap.data() as User) : null;
}

export const logout = () => signOut(auth);
export const onAuthChange = (cb: (u: FBUser | null) => void) => onAuthStateChanged(auth, cb);
