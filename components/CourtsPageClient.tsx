"use client";

import { useEffect, useState } from "react";
import PageHero from "@/components/PageHero";
import CourtsExplorer from "@/components/CourtsExplorer";
import { courts as seedCourts } from "@/data/courts";
import type { Court } from "@/data/courts";
import { subscribeToCourts } from "@/lib/courtService";

export default function CourtsPageClient() {
  const [courts, setCourts] = useState<Court[]>(seedCourts);

  useEffect(() => {
    const unsubscribe = subscribeToCourts((liveCourts) => {
      if (liveCourts.length > 0) {
        setCourts(liveCourts);
      }
    });
    return unsubscribe;
  }, []);

  return (
    <section className="mx-auto max-w-md px-6 py-10">
      <PageHero title="找球場" description="搜尋全台網球場，一鍵查詢場地資訊與預約方式。" />
      <CourtsExplorer courts={courts} />
      <p className="mt-6 text-center text-sm text-muted">
        各球場預約請點擊球場卡片內的「前往預約」，將跳轉至各球場官方網站。
      </p>
    </section>
  );
}
