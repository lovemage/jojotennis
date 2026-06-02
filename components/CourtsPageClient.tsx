"use client";

import { useEffect, useState } from "react";
import PageHero from "@/components/PageHero";
import CourtsExplorer from "@/components/CourtsExplorer";
import { courts as seedCourts, type Court } from "@/data/courts";
import { subscribeToCourts } from "@/lib/courtService";

export default function CourtsPageClient() {
  const [courts, setCourts] = useState<Court[]>(seedCourts);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToCourts((liveCourts) => {
      setCourts(liveCourts.length > 0 ? liveCourts : seedCourts);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return (
    <section className="mx-auto max-w-md overflow-hidden pb-8">
      <PageHero
        eyebrow="Courts"
        title="找球場"
        description="搜尋全台網球場，一鍵查詢場地資訊與預約方式。"
        image="/images/hero/courts.png"
      />
      {loading ? (
        <div className="flex min-h-[200px] items-center justify-center text-sm text-muted">
          載入中...
        </div>
      ) : courts.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-muted">目前沒有資料</div>
      ) : (
        <div className="mt-6 px-5">
          <CourtsExplorer courts={courts} />
        </div>
      )}
      <p className="mt-6 px-5 text-center text-sm text-muted">
        各球場預約請點擊球場卡片內的「前往預約」，將跳轉至各球場官方網站。
      </p>
    </section>
  );
}
