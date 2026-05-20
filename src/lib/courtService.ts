import { db } from "./firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import type { Court as SchemaCourt } from "./schema";
import type { Court as UiCourt } from "@/data/courts";

function toUiCourt(id: string, data: SchemaCourt): UiCourt {
  return {
    id: data.courtId || id,
    name: data.name,
    city: data.city,
    district: data.district,
    streetAddress: data.address,
    address: data.address,
    latitude: data.lat ?? null,
    longitude: data.lng ?? null,
    phone: data.phone ?? "",
    weekdayHours: data.openHours ?? "",
    weekendHours: data.openHours ?? "",
    courtCount: data.totalCourts ?? null,
    surface:
      data.surfaceType === "clay"
        ? "紅土"
        : data.surfaceType === "grass"
          ? "草地"
          : "硬地",
    environment: data.indoor === "indoor" ? "室內" : "室外",
    hasLighting: data.hasNightLight ?? false,
    ownership: "—",
    offPeakRate: null,
    peakRate: null,
    bookingMethod: data.bookingUrl ? "線上預約" : "電話/現場",
    bookingUrl: data.bookingUrl ?? "",
    bookingStatus: data.bookingUrl ? "bookable" : "unknown",
    notes: "",
  };
}

export function subscribeToCourts(cb: (courts: UiCourt[]) => void) {
  return onSnapshot(
    query(
      collection(db, "courts"),
      where("isDeleted", "==", false),
      orderBy("createdAt", "desc"),
    ),
    (snap) => {
      cb(snap.docs.map((d) => toUiCourt(d.id, { courtId: d.id, ...d.data() } as SchemaCourt)));
    },
    () => cb([]),
  );
}

export async function submitPendingCourtReport(data: {
  name: string;
  city: string;
  district: string;
  address: string;
  note: string;
  courtCount: string;
  bookingMethod: string;
  reportedByUid: string;
  reportedByName: string;
}): Promise<void> {
  await addDoc(collection(db, "pending_courts"), {
    name: data.name,
    city: data.city,
    district: data.district,
    address: data.address,
    description: data.note,
    courtCount: data.courtCount,
    bookingMethod: data.bookingMethod,
    reportedByUid: data.reportedByUid,
    reportedByName: data.reportedByName,
    status: "pending",
    createdAt: serverTimestamp(),
  });
}

export async function saveCourt(
  court: Omit<SchemaCourt, "createdAt" | "updatedAt"> & { courtId: string },
) {
  await setDoc(
    doc(db, "courts", court.courtId),
    {
      ...court,
      isDeleted: false,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function softDeleteCourt(courtId: string) {
  await updateDoc(doc(db, "courts", courtId), {
    isDeleted: true,
    deletedAt: serverTimestamp(),
    status: "closed",
    updatedAt: serverTimestamp(),
  });
}
