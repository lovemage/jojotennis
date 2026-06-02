"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { remark } from "remark";
import html from "remark-html";
import { fetchEquipmentReviewBySlug } from "@/lib/equipmentReviewService";
import type { EquipmentReview } from "@/lib/supabase.types";

export default function ReviewDetailPage({ params }: { params: { slug: string } }) {
  const [review, setReview] = useState<EquipmentReview | null>(null);
  const [contentHtml, setContentHtml] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchEquipmentReviewBySlug(params.slug)
      .then(async (result) => {
        if (!active) return;
        setReview(result);
        const content = result?.contentMd ?? "";
        if (/<[a-z][\s\S]*>/i.test(content)) {
          setContentHtml(content);
        } else {
          const processed = await remark().use(html).process(content);
          setContentHtml(String(processed));
        }
      })
      .catch((error) => console.error("[review] 讀取失敗：", error))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [params.slug]);

  if (loading) {
    return <section className="mx-auto max-w-md px-6 py-10 text-sm text-muted">載入評測中...</section>;
  }

  if (!review) {
    return (
      <section className="mx-auto max-w-md px-6 py-10">
        <h1 className="text-2xl font-bold text-pine">找不到評測</h1>
        <Link href="/reviews" className="mt-4 inline-flex rounded-lg bg-pine px-4 py-2 text-sm font-bold text-white">
          返回球具評測
        </Link>
      </section>
    );
  }

  return (
    <article className="mx-auto max-w-md px-6 py-8">
      <Link href="/reviews" className="text-sm font-bold text-clay">
        ← 返回球具評測
      </Link>
      {review.coverImageUrl ? (
        <img src={review.coverImageUrl} alt={review.title} className="mt-5 aspect-[16/9] w-full rounded-lg object-cover" />
      ) : null}
      <p className="mt-6 text-sm font-bold text-clay">
        {review.category} · {review.brand} {review.model}
      </p>
      <h1 className="mt-2 text-3xl font-bold leading-tight text-pine">{review.title}</h1>
      <p className="mt-3 text-sm text-muted">作者：{review.authorName}</p>
      <div
        className="prose-news mt-8 rounded-[1.5rem] bg-white p-5 text-base leading-8 text-ink shadow-sm ring-1 ring-parchment"
        dangerouslySetInnerHTML={{ __html: contentHtml }}
      />
    </article>
  );
}
