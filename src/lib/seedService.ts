import { db } from "./firebase";
import {
  collection,
  doc,
  getCountFromServer,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { courts as seedCourts } from "@/data/courts";
import { clubs as seedClubs } from "@/data/clubs";
import { coaches as seedCoaches } from "@/data/coaches";

const SEED_OWNER = "seed-system";

export type SeedResult = {
  courts: number;
  clubs: number;
  coaches: number;
  skipped: boolean;
};

/** 僅在集合為空時寫入種子資料（供管理員手動觸發） */
export async function seedFirestoreIfEmpty(): Promise<SeedResult> {
  const [courtsCount, clubsCount, coachesCount] = await Promise.all([
    getCountFromServer(collection(db, "courts")),
    getCountFromServer(collection(db, "clubs")),
    getCountFromServer(collection(db, "coaches")),
  ]);

  const empty =
    courtsCount.data().count === 0 &&
    clubsCount.data().count === 0 &&
    coachesCount.data().count === 0;

  if (!empty) {
    return { courts: 0, clubs: 0, coaches: 0, skipped: true };
  }

  const batch = writeBatch(db);
  const now = serverTimestamp();

  for (const court of seedCourts) {
    const ref = doc(db, "courts", court.id);
    batch.set(ref, {
      courtId: court.id,
      name: court.name,
      city: court.city,
      district: court.district,
      address: court.address,
      lat: court.latitude ?? 0,
      lng: court.longitude ?? 0,
      surfaceType: court.surface === "紅土" ? "clay" : court.surface === "草地" ? "grass" : "hard",
      indoor: court.environment === "室內" ? "indoor" : "outdoor",
      totalCourts: court.courtCount ?? 1,
      hasNightLight: court.hasLighting ?? false,
      phone: court.phone ?? "",
      bookingUrl: court.bookingUrl ?? "",
      openHours: court.weekdayHours || court.weekendHours || "—",
      status: "active",
      isDeleted: false,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  for (const club of seedClubs) {
    const ref = doc(db, "clubs", club.id);
    batch.set(ref, {
      ownerUid: SEED_OWNER,
      ownerNickname: "JoJo 種子",
      name: club.name,
      types: club.tags,
      city: club.city,
      ntrpLevels: [club.levelRange],
      venue: club.baseCourt,
      schedule: club.schedule,
      description: club.description,
      memberCount: club.memberCount,
      contactLine: "",
      isDeleted: false,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  for (const coach of seedCoaches) {
    const ref = doc(db, "coaches", coach.id);
    batch.set(ref, {
      coachId: coach.id,
      uid: SEED_OWNER,
      nickname: coach.name,
      city: coach.city,
      ntrpRange: coach.levelRange,
      pricePerHour: coach.price,
      rating: coach.rating,
      bio: coach.bio,
      isVerified: true,
      isDeleted: false,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  await batch.commit();

  return {
    courts: seedCourts.length,
    clubs: seedClubs.length,
    coaches: seedCoaches.length,
    skipped: false,
  };
}
