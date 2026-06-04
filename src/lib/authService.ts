import { auth, googleProvider } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithCustomToken,
  signOut,
  sendEmailVerification,
  onAuthStateChanged,
  type User as FBUser,
} from "firebase/auth";
import type { User } from "./schema";
import { USE_SUPABASE } from "./config";
import { getSupabaseBrowserClient, hasSupabaseConfig } from "./supabase";

async function upsertSupabaseUser(
  uid: string,
  email: string,
  nickname: string,
  avatarUrl = "",
  provider: "password" | "google" | "line" = "password",
) {
  if (!USE_SUPABASE || !hasSupabaseConfig()) return;

  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("users").upsert({
    uid,
    email,
    nickname,
    ntrp: "2.0",
    region: "台北市",
    years_playing: 0,
    avatar_url: avatarUrl,
    role: "user",
    provider,
    email_verified: provider === "google",
    email_verification_sent_at: null,
    is_active: true,
    hearts_received: 0,
    bio: "",
    is_deleted: false,
    deleted_at: null,
    updated_at: new Date().toISOString(),
  });

  if (error) console.error("[auth] Supabase user upsert failed:", error.message);
}

function toSchemaUserFromSupabase(row: Record<string, unknown>): User {
  return {
    uid: String(row.uid ?? ""),
    email: String(row.email ?? ""),
    nickname: String(row.nickname ?? "新球友"),
    provider: (row.provider as User["provider"]) ?? "password",
    emailVerified: Boolean(row.email_verified ?? false),
    emailVerificationSentAt: row.email_verification_sent_at
      ? new Date(String(row.email_verification_sent_at))
      : null,
    ntrp: String(row.ntrp ?? "2.0"),
    region: String(row.region ?? "台北市"),
    yearsPlaying: Number(row.years_playing ?? 0),
    avatarUrl: String(row.avatar_url ?? ""),
    role: (row.role as User["role"]) ?? "user",
    isActive: row.is_active !== false,
    heartsReceived: Number(row.hearts_received ?? 0),
    bio: String(row.bio ?? ""),
    isDeleted: Boolean(row.is_deleted ?? false),
    deletedAt: row.deleted_at ? new Date(String(row.deleted_at)) : null,
    createdAt: row.created_at ? new Date(String(row.created_at)) : new Date(),
    updatedAt: row.updated_at ? new Date(String(row.updated_at)) : new Date(),
  };
}

async function sendWelcomeEmail(user: FBUser, nickname: string) {
  try {
    const idToken = await user.getIdToken();
    await fetch("/api/email/welcome", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ uid: user.uid, nickname }),
    });
  } catch (error) {
    console.warn("[auth] welcome email failed:", error);
  }
}

export async function registerWithEmail(
  email: string,
  password: string,
  nickname: string,
): Promise<FBUser> {
  if (!auth) throw new Error("Firebase not initialized");
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await sendEmailVerification(cred.user);
  await upsertSupabaseUser(cred.user.uid, email, nickname, "", "password");
  void sendWelcomeEmail(cred.user, nickname);
  return cred.user;
}

export async function loginWithEmail(email: string, password: string): Promise<FBUser> {
  if (!auth) throw new Error("Firebase not initialized");
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function loginWithGoogle(): Promise<FBUser> {
  if (!auth || !googleProvider) throw new Error("Firebase not initialized");
  const cred = await signInWithPopup(auth, googleProvider);
  await upsertSupabaseUser(
    cred.user.uid,
    cred.user.email ?? "",
    cred.user.displayName ?? "網球球友",
    cred.user.photoURL ?? "",
    "google",
  );
  return cred.user;
}

export async function loginWithLineCustomToken(token: string): Promise<FBUser> {
  if (!auth) throw new Error("Firebase not initialized");
  const cred = await signInWithCustomToken(auth, token);
  await cred.user.getIdToken(true);
  return cred.user;
}

export async function getUserProfile(uid: string): Promise<User | null> {
  if (USE_SUPABASE && hasSupabaseConfig()) {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("uid", uid)
      .maybeSingle();

    if (!error && data) return toSchemaUserFromSupabase(data as Record<string, unknown>);
  }

  return null;
}

export const logout = () => {
  if (!auth) throw new Error("Firebase not initialized");
  return signOut(auth);
};

export const onAuthChange = (cb: (u: FBUser | null) => void) => {
  if (!auth) {
    // If auth is not initialized (SSR), call callback with null and return noop
    cb(null);
    return () => {};
  }
  return onAuthStateChanged(auth, cb);
};
