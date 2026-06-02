"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import CourtsMap from "@/components/CourtsMap";
import CourtImageCarousel from "@/components/CourtImageCarousel";
import { fetchCourtById } from "@/lib/courtService";
import type { Court } from "@/data/courts";
import type { CourtImage } from "@/lib/supabase.types";

type CourtDetail = Court & { images: CourtImage[] };

export default function CourtDetailPage({ params }: { params: { id: string } }) {
  const [court, setCourt] = useState<CourtDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchCourtById(params.id)
      .then((result) => {
        if (active) setCourt(result);
      })
      .catch((error) => {
        console.error("[court] 讀取球場失敗：", error);
        if (active) setCourt(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [params.id]);

  if (loading) {
    return (
      <section className="mx-auto max-w-md px-6 py-10 text-sm text-muted">
        載入球場資料中...
      </section>
    );
  }

  if (!court) {
    return (
      <section className="mx-auto max-w-md px-6 py-10">
        <h1 className="text-2xl font-bold text-pine">找不到球場</h1>
        <Link href="/courts" className="mt-4 inline-flex rounded-lg bg-pine px-4 py-2 text-sm font-bold text-white">
          返回球場列表
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-md px-6 py-8">
      <Link href="/courts" className="text-sm font-bold text-clay">
        ← 返回球場列表
      </Link>

      <div className="mt-5">
        <CourtImageCarousel images={court.images} title={court.name} />
      </div>

      <div className="mt-6">
        <p className="text-sm font-semibold text-clay">
          {court.city} · {court.district}
        </p>
        <h1 className="mt-1 text-3xl font-bold text-pine">{court.name}</h1>
        <p className="mt-3 text-sm leading-6 text-muted">{court.address}</p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        {[court.environment, court.surface, court.courtCount != null ? `${court.courtCount} 面` : "", court.hasLighting ? "夜間照明" : ""]
          .filter(Boolean)
          .map((item) => (
            <span key={item} className="rounded-lg bg-ivory px-3 py-2 text-center text-xs font-bold text-pine">
              {item}
            </span>
          ))}
      </div>

      <div className="mt-6 rounded-lg border border-parchment bg-white p-5 text-sm leading-7 text-muted">
        {court.weekdayHours ? <p>開放時間：{court.weekdayHours}</p> : null}
        {court.bookingMethod ? <p>預約方式：{court.bookingMethod}</p> : null}
        {court.phone ? <p>電話：{court.phone}</p> : null}
        {court.notes ? <p>備註：{court.notes}</p> : null}
      </div>

      <div className="mt-6">
        <CourtsMap courts={[court]} />
      </div>

      {court.phone ? (
        <div className="mt-6">
          <a
            href={`tel:${court.phone}`}
            className="flex h-11 items-center justify-center rounded-lg border border-pine text-sm font-bold text-pine"
          >
            📞 撥打電話
          </a>
        </div>
      ) : null}
    </section>
  );
}
