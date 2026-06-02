import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const samples = [
  {
    message: "歡迎加入揪揪網球，找球友揪球從這裡開始",
    isActive: true,
    priority: 10,
  },
  {
    message: "週末雙打開放報名中，點擊揪球頁查看",
    isActive: true,
    priority: 5,
  },
  {
    message: "新功能：球友列表上線",
    isActive: true,
    priority: 1,
  },
];

async function seed() {
  console.log("開始種入公告...");
  const existing = await getDocs(collection(db, "announcements"));
  if (!existing.empty) {
    console.log("公告已存在，跳過");
    process.exit(0);
  }
  for (const item of samples) {
    const ref = await addDoc(collection(db, "announcements"), {
      ...item,
      updatedAt: serverTimestamp(),
    });
    console.log("✅ 已寫入：", item.message, "→", ref.id);
  }
  console.log("完成！共", samples.length, "筆");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ 失敗：", err);
  process.exit(1);
});
