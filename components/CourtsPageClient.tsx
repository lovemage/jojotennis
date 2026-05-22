"use client";

import { useEffect, useState } from "react";
import PageHero from "@/components/PageHero";
import CourtsExplorer from "@/components/CourtsExplorer";
import { courts as seedCourts, type Court } from "@/data/courts";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import type { Court as SchemaCourt } from "@/lib/schema";

function surfaceLabel(type: SchemaCourt["surfaceType"]): string {
  if (type === "clay") return "紅土";
  if (type === "grass") return "草地";
  return "硬地";
}

function toUiCourt(id: string, data: SchemaCourt): Court {
  const ownership = (data as SchemaCourt & { ownership?: string }).ownership?.trim() || "";
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

export default function CourtsPageClient() {
  const [courts, setCourts] = useState<Court[]>(seedCourts);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "courts"),
      (snap) => {
        if (snap.empty) {
          setCourts(seedCourts);
        } else {
          const data = snap.docs
            .filter((d) => {
              const raw = d.data() as SchemaCourt;
              return raw.isDeleted !== true && raw.status !== "closed";
            })
            .map((d) => toUiCourt(d.id, { courtId: d.id, ...d.data() } as SchemaCourt));
          setCourts(data.length > 0 ? data : seedCourts);
        }
        setLoading(false);
      },
      (err) => {
        console.error("[courts] 監聽失敗：", err.code, err.message);
        setCourts(seedCourts);
        setLoading(false);
      },
    );
    return () => unsub();
  }, []);

  return (
    <section className="mx-auto max-w-md px-6 py-10">
      <PageHero title="找球場" description="搜尋全台網球場，一鍵查詢場地資訊與預約方式。" />
      {loading ? (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "200px",
            color: "#8A7E6E",
            fontSize: "14px",
          }}
        >
          載入中...
        </div>
      ) : courts.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#8A7E6E" }}>
          目前沒有資料
        </div>
      ) : (
        <CourtsExplorer courts={courts} />
      )}
      <p className="mt-6 text-center text-sm text-muted">
        各球場預約請點擊球場卡片內的「前往預約」，將跳轉至各球場官方網站。
      </p>
    </section>
  );
}
