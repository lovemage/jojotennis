import "server-only";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function getFirebaseAdminApp() {
  const existing = getApps()[0];
  if (existing) return existing;

  const raw = process.env.FIREBASE_ADMIN_SA_JSON;
  if (!raw) {
    throw new Error("Missing FIREBASE_ADMIN_SA_JSON");
  }

  return initializeApp({
    credential: cert(JSON.parse(raw)),
  });
}

export function getAdminAuth() {
  return getAuth(getFirebaseAdminApp());
}
