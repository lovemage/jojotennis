import { defaultCache } from "@serwist/next/worker";
import { NetworkOnly, Serwist } from "serwist";
import { initializeApp } from "firebase/app";
import { getMessaging, onBackgroundMessage } from "firebase/messaging/sw";

type NotificationClickEventLike = {
  notification: {
    close: () => void;
    data?: { url?: string };
  };
  waitUntil: (promise: Promise<unknown>) => void;
};

declare const self: {
  __SW_MANIFEST: Array<string | { url: string; revision?: string | null }>;
  registration: {
    showNotification: (
      title: string,
      options?: { body?: string; icon?: string; data?: Record<string, string> },
    ) => Promise<void>;
  };
  clients: {
    openWindow: (url: string) => Promise<unknown>;
  };
  addEventListener: (
    type: "notificationclick",
    listener: (event: NotificationClickEventLike) => void,
  ) => void;
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ url }) => url.hostname === "firestore.googleapis.com",
      handler: new NetworkOnly(),
    },
    ...defaultCache,
  ],
});

serwist.addEventListeners();

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

try {
  const app = initializeApp(firebaseConfig);
  const messaging = getMessaging(app);
  onBackgroundMessage(messaging, (payload) => {
    const notification = payload.notification;
    self.registration.showNotification(notification?.title ?? "JoJo Tennis", {
      body: notification?.body,
      icon: "/icons/icon-192.png",
      data: payload.data,
    });
  });
} catch {
  // FCM is unavailable until Firebase env vars are configured.
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data as { url?: string } | undefined;
  event.waitUntil(self.clients.openWindow(data?.url ?? "/"));
});
