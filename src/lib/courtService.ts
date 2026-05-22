import { db } from "./firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import type { Court as SchemaCourt } from "./schema";
import type { Court as UiCourt } from "@/data/courts";

function surfaceLabel(type: SchemaCourt["surfaceType"]): string {
  if (type === "clay") return "紅土";
  if (type === "grass") return "草地";
  return "硬地";
}

function toUiCourt(id: string, data: SchemaCourt): UiCourt {
  const ownership =
    (data as SchemaCourt & { ownership?: string }).ownership?.trim() || "";

  return {
    id: data.courtId || id,
    name: data.name,
    city: data.city,
    district: data.district,
    streetAddress: data.address,
    address: data.address,
    latitude: data.lat ? data.lat : null,
    longitude: data.lng ? data.lng : null,
    phone: data.phone ?? "",
    weekdayHours: data.openHours ?? "",
    weekendHours: data.openHours ?? "",
    courtCount: data.totalCourts ?? null,
    surface: surfaceLabel(data.surfaceType),
    environment: data.indoor === "indoor" ? "室內" : "室外",
    hasLighting: data.hasNightLight ?? false,
    ownership: ownership || "—",
    offPeakRate: null,
    peakRate: null,
    bookingMethod: data.bookingMethod ?? "",
    bookingUrl: data.bookingUrl ?? "",
    bookingStatus: data.bookingUrl?.startsWith("http") ? "bookable" : "unknown",
    notes: data.notes ?? "",
  };
}

export function subscribeToCourts(cb: (courts: UiCourt[]) => void) {
  return onSnapshot(
    collection(db, "courts"),
    (snap) => {
      const data = snap.docs
        .filter((d) => {
          const raw = d.data() as SchemaCourt;
          return raw.isDeleted !== true && raw.status !== "closed";
        })
        .map((d) => toUiCourt(d.id, { courtId: d.id, ...d.data() } as SchemaCourt));
      data.sort((a, b) => a.name.localeCompare(b.name, "zh-TW"));
      cb(data);
    },
    (err) => console.error("[courts] 監聽失敗：", err.code, err.message),
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

export type CourtFormInput = {
  name: string;
  city: string;
  district: string;
  address: string;
  lat: number;
  lng: number;
  indoor: "indoor" | "outdoor";
  surfaceType: "hard" | "clay" | "grass";
  totalCourts: number;
  hasNightLight: boolean;
  openHours: string;
  phone: string;
  bookingMethod: string;
  bookingUrl: string;
  notes: string;
  status?: "active" | "pending" | "closed";
};

export async function saveCourt(courtId: string, input: CourtFormInput) {
  await setDoc(
    doc(db, "courts", courtId),
    {
      courtId,
      name: input.name.trim(),
      city: input.city,
      district: input.district.trim(),
      address: input.address.trim(),
      lat: input.lat,
      lng: input.lng,
      indoor: input.indoor,
      surfaceType: input.surfaceType,
      totalCourts: input.totalCourts,
      hasNightLight: input.hasNightLight,
      openHours: input.openHours.trim(),
      phone: input.phone.trim(),
      bookingMethod: input.bookingMethod.trim(),
      bookingUrl: input.bookingUrl.trim(),
      notes: input.notes.trim(),
      status: input.status ?? "active",
      isDeleted: false,
      deletedAt: null,
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
