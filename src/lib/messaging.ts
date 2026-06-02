import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken, onMessage, type MessagePayload } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function getFirebaseMessaging() {
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  return getMessaging(app);
}

export async function requestNotificationPermission(uid: string) {
  if (typeof window === "undefined" || !("Notification" in window)) {
    throw new Error("此瀏覽器不支援通知");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("尚未允許通知");

  const registration = await navigator.serviceWorker.ready;
  const token = await getToken(getFirebaseMessaging(), {
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: registration,
  });

  await fetch("/api/fcm/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uid, token, device: navigator.userAgent }),
  });

  return token;
}

export function onForegroundMessage(handler: (payload: MessagePayload) => void) {
  return onMessage(getFirebaseMessaging(), handler);
}
