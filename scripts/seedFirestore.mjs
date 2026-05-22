import "dotenv/config";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  where,
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

const sampleMatches = [
  {
    ownerUid: "seed_001",
    ownerNickname: "王大明",
    title: "週末雙打缺二，歡迎新手",
    city: "台北市",
    district: "大安區",
    venue: "大安森林公園網球場",
    date: "2026/05/31",
    weekday: "週日",
    startTime: "09:00",
    endTime: "11:00",
    ntrpRequired: ["2", "3"],
    totalSlots: 4,
    filledSlots: 2,
    status: "open",
    note: "以多拍穩定為主，新手友善",
    isDeleted: false,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    ownerUid: "seed_002",
    ownerNickname: "Mina",
    title: "下班後穩定對拉",
    city: "台北市",
    district: "信義區",
    venue: "台北市立信義網球場",
    date: "2026/05/28",
    weekday: "週四",
    startTime: "19:00",
    endTime: "21:00",
    ntrpRequired: ["3", "4"],
    totalSlots: 2,
    filledSlots: 0,
    status: "open",
    note: "找穩定對打球友",
    isDeleted: false,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    ownerUid: "seed_003",
    ownerNickname: "小強",
    title: "台中週六早上單打",
    city: "台中市",
    district: "西區",
    venue: "台中市立網球場",
    date: "2026/05/30",
    weekday: "週六",
    startTime: "07:00",
    endTime: "09:00",
    ntrpRequired: ["2", "3", "4"],
    totalSlots: 2,
    filledSlots: 1,
    status: "open",
    note: "單打互練，程度相近即可",
    isDeleted: false,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

async function seed() {
  console.log("開始種入資料...");

  const existing = await getDocs(
    query(collection(db, "matches"), where("ownerUid", "==", "seed_001")),
  );
  if (!existing.empty) {
    console.log("測試資料已存在，跳過");
    process.exit(0);
  }

  for (const m of sampleMatches) {
    const ref = await addDoc(collection(db, "matches"), m);
    console.log("✅ 已寫入：", m.title, "→", ref.id);
  }
  console.log("完成！共", sampleMatches.length, "筆");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ 失敗：", err);
  process.exit(1);
});
