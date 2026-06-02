import { db } from "./firebase";
import {
  collection,
  addDoc,
  getDoc,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { USE_SUPABASE } from "./config";
import { getSupabaseBrowserClient, hasSupabaseConfig } from "./supabase";
import type { Court as SchemaCourt } from "./schema";
import { courts as seedCourts, type Court as UiCourt } from "@/data/courts";
import type { CourtImage } from "./supabase.types";

type SupabaseCourtRow = {
  id: string;
  name: string;
  city: string;
  district: string;
  address: string;
  lat: number | null;
  lng: number | null;
  surface_type: SchemaCourt["surfaceType"];
  indoor: SchemaCourt["indoor"];
  total_courts: number | null;
  has_night_light: boolean | null;
  phone: string | null;
  booking_url: string | null;
  booking_method: string | null;
  notes: string | null;
  open_hours: string | null;
  status: SchemaCourt["status"];
  ownership: string | null;
  images?: CourtImage[] | null;
  is_deleted: boolean | null;
  created_at?: string;
  updated_at?: string;
};

function surfaceLabel(type: SchemaCourt["surfaceType"]): string {
  if (type === "clay") return "紅土";
  if (type === "grass") return "草地";
  return "硬地";
}

function toUiCourt(id: string, data: SchemaCourt): UiCourt {
  const extended = data as SchemaCourt & {
    ownership?: string;
    images?: CourtImage[];
  };
  const ownership = extended.ownership?.trim() || "";

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
    images: Array.isArray(extended.images) ? extended.images : [],
  };
}

function toUiCourtFromSupabase(row: SupabaseCourtRow): UiCourt {
  return toUiCourt(row.id, {
    courtId: row.id,
    name: row.name,
    city: row.city,
    district: row.district,
    address: row.address,
    lat: row.lat ?? 0,
    lng: row.lng ?? 0,
    surfaceType: row.surface_type,
    indoor: row.indoor,
    totalCourts: row.total_courts ?? 0,
    hasNightLight: row.has_night_light ?? false,
    phone: row.phone ?? "",
    bookingUrl: row.booking_url ?? "",
    bookingMethod: row.booking_method ?? "",
    notes: row.notes ?? "",
    openHours: row.open_hours ?? "",
    status: row.status,
    isDeleted: row.is_deleted ?? false,
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
    ownership: row.ownership ?? "",
    images: Array.isArray(row.images) ? row.images : [],
  } as SchemaCourt & { ownership?: string; images?: CourtImage[] });
}

async function fetchSupabaseCourts() {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("courts")
    .select("*")
    .eq("is_deleted", false)
    .neq("status", "closed")
    .order("name", { ascending: true });

  if (error) throw error;
  return ((data ?? []) as SupabaseCourtRow[]).map(toUiCourtFromSupabase);
}

function subscribeToFirestoreCourts(cb: (courts: UiCourt[]) => void) {
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

export function subscribeToCourts(cb: (courts: UiCourt[]) => void) {
  if (USE_SUPABASE && hasSupabaseConfig()) {
    const supabase = getSupabaseBrowserClient();
    let active = true;
    let fallbackUnsub: (() => void) | null = null;

    fetchSupabaseCourts()
      .then((courts) => {
        if (active) cb(courts);
      })
      .catch((err) => {
        console.warn("[courts] Supabase 讀取失敗，改用 Firebase：", err.message);
        if (active) {
          cb([]);
          fallbackUnsub = subscribeToFirestoreCourts(cb);
        }
      });

    const channel = supabase
      .channel("public:courts")
      .on("postgres_changes", { event: "*", schema: "public", table: "courts" }, () => {
        if (fallbackUnsub) return;
        fetchSupabaseCourts()
          .then((courts) => {
            if (active) cb(courts);
          })
          .catch((err) => console.error("[courts] Supabase realtime 更新失敗：", err.message));
      })
      .subscribe();

    return () => {
      active = false;
      fallbackUnsub?.();
      void supabase.removeChannel(channel);
    };
  }

  return subscribeToFirestoreCourts(cb);
}

export async function fetchCourtById(courtId: string): Promise<(UiCourt & { images: CourtImage[] }) | null> {
  if (USE_SUPABASE && hasSupabaseConfig()) {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("courts")
        .select("*")
        .eq("id", courtId)
        .eq("is_deleted", false)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        const row = data as SupabaseCourtRow;
        return {
          ...toUiCourtFromSupabase(row),
          images: Array.isArray(row.images) ? row.images : [],
        };
      }
    } catch (err) {
      console.warn("[court] Supabase 讀取失敗，改用 Firebase：", err instanceof Error ? err.message : err);
    }
  }

  try {
    const snap = await getDoc(doc(db, "courts", courtId));
    if (snap.exists()) {
      const raw = snap.data() as SchemaCourt & { ownership?: string; images?: CourtImage[] };
      if (raw.isDeleted !== true && raw.status !== "closed") {
        const ui = toUiCourt(snap.id, { ...raw, courtId: snap.id } as SchemaCourt);
        return { ...ui, images: ui.images ?? [] };
      }
    }
  } catch (err) {
    console.warn("[court] Firestore 讀取失敗：", err instanceof Error ? err.message : err);
  }

  const seed = seedCourts.find((c) => c.id === courtId);
  if (seed) {
    return { ...seed, images: seed.images ?? [] };
  }

  return null;
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
  if (USE_SUPABASE && hasSupabaseConfig()) {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.from("pending_courts").insert({
      name: data.name,
      city: data.city,
      district: data.district,
      address: data.address,
      description: data.note,
      court_count: data.courtCount,
      booking_method: data.bookingMethod,
      reported_by_uid: data.reportedByUid,
      reported_by_name: data.reportedByName,
      status: "pending",
    });

    if (error) throw error;
    return;
  }

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
  if (USE_SUPABASE && hasSupabaseConfig()) {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.from("courts").upsert({
      id: courtId,
      name: input.name.trim(),
      city: input.city,
      district: input.district.trim(),
      address: input.address.trim(),
      lat: input.lat,
      lng: input.lng,
      indoor: input.indoor,
      surface_type: input.surfaceType,
      total_courts: input.totalCourts,
      has_night_light: input.hasNightLight,
      open_hours: input.openHours.trim(),
      phone: input.phone.trim(),
      booking_method: input.bookingMethod.trim(),
      booking_url: input.bookingUrl.trim(),
      notes: input.notes.trim(),
      status: input.status ?? "active",
      is_deleted: false,
      deleted_at: null,
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;
    return;
  }

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

export async function updateCourtImages(courtId: string, images: CourtImage[]) {
  if (!USE_SUPABASE || !hasSupabaseConfig()) {
    throw new Error("球場圖片管理需要 Supabase 設定");
  }

  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("courts")
    .update({
      images,
      updated_at: new Date().toISOString(),
    })
    .eq("id", courtId);

  if (error) throw error;
}

export async function softDeleteCourt(courtId: string) {
  if (USE_SUPABASE && hasSupabaseConfig()) {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase
      .from("courts")
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        status: "closed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", courtId);

    if (error) throw error;
    return;
  }

  await updateDoc(doc(db, "courts", courtId), {
    isDeleted: true,
    deletedAt: serverTimestamp(),
    status: "closed",
    updatedAt: serverTimestamp(),
  });
}
