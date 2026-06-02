"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import PageHero from "@/components/PageHero";
import { fetchEquipmentReviews } from "@/lib/equipmentReviewService";
import type { EquipmentReview } from "@/lib/supabase.types";

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

export default function ReviewsPageClient() {
  const [reviews, setReviews] = useState<EquipmentReview[]>([]);
  const [category, setCategory] = useState("全部");

  useEffect(() => {
    fetchEquipmentReviews()
      .then(setReviews)
      .catch((error) => console.error("[reviews] 讀取失敗：", error));
  }, []);

  const categories = useMemo(
    () => ["全部", ...Array.from(new Set(reviews.map((review) => review.category)))],
    [reviews],
  );
  const visibleReviews =
    category === "全部" ? reviews : reviews.filter((review) => review.category === category);

  return (
    <section className="mx-auto max-w-md overflow-hidden pb-8">
      <PageHero
        settingsKey="reviews"
        eyebrow="Reviews"
        title="球具評測"
        description="球拍、球線、球鞋與配件實測，幫你找到適合自己的裝備。"
        image="/images/hero/reviews.png"
      >
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${
                category === item
                  ? "bg-gold text-pine shadow-[0_12px_28px_rgba(201,168,76,0.25)]"
                  : "border border-white/25 bg-white/10 text-white"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </PageHero>

      <div className="mt-6 divide-y divide-pine/10 border-y border-pine/10 bg-white shadow-[0_16px_48px_rgba(30,61,47,0.07)]">
        {visibleReviews.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted">目前尚無評測文章。</p>
        ) : (
          visibleReviews.map((review) => (
            <Link key={review.id} href={`/reviews/${review.slug}`} className="block overflow-hidden">
              {review.coverImageUrl ? (
                <img src={review.coverImageUrl} alt={review.title} className="aspect-[16/9] w-full object-cover" />
              ) : null}
              <div className="px-5 py-5">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-clay">
                  {review.category} · {review.brand} {review.model}
                </p>
                <h2 className="mt-2 text-lg font-black tracking-tight text-pine">{review.title}</h2>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted">
                  {stripHtml(review.contentMd).slice(0, 120)}
                </p>
              </div>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}
