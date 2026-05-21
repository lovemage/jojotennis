import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
};

export function isFirebaseConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.authDomain &&
      firebaseConfig.projectId &&
      firebaseConfig.appId,
  );
}

let app: FirebaseApp | undefined;

function getFirebaseApp(): FirebaseApp {
  if (typeof window === "undefined") {
    throw new Error("Firebase client SDK only runs in the browser");
  }
  if (!isFirebaseConfigured()) {
    throw new Error(
      "Firebase 環境變數未設定。請在 Netlify 設定 NEXT_PUBLIC_FIREBASE_* 後重新 deploy。",
    );
  }
  if (!app) {
    app = getApps().length > 0 ? getApps()[0]! : initializeApp(firebaseConfig);
  }
  return app;
}

function getClientAuth(): Auth {
  return getAuth(getFirebaseApp());
}

function getClientDb(): Firestore {
  return getFirestore(getFirebaseApp());
}

let storageInstance: FirebaseStorage | undefined;

/** Storage 延遲初始化（避免 SSR / 未啟用 Storage 時整站 JS 崩潰） */
export function getClientStorage(): FirebaseStorage {
  if (!storageInstance) {
    storageInstance = getStorage(getFirebaseApp());
  }
  return storageInstance;
}

/** 相容舊 import：僅在瀏覽器內實際取用 Firebase 實例 */
export const auth = new Proxy({} as Auth, {
  get(_target, prop) {
    const instance = getClientAuth();
    const value = (instance as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

export const db = new Proxy({} as Firestore, {
  get(_target, prop) {
    const instance = getClientDb();
    const value = (instance as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

export const googleProvider = new GoogleAuthProvider();

export default getFirebaseApp;
