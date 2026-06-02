"use client";

import { useState } from "react";
import PageHero from "@/components/PageHero";
import NewsList, { newsTabs, type NewsTab } from "@/components/NewsList";

export default function NewsPageClient() {
  const [category, setCategory] = useState<NewsTab>("全部");

  return (
    <section className="mx-auto max-w-md overflow-hidden pb-8">
      <PageHero
        eyebrow="News"
        title="網球新聞 & 活動"
        description="賽事快訊・品牌活動・新品上市，掌握台灣與國際網球消息。"
        image="/images/hero/news.png"
      >
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {newsTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setCategory(tab)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${
                category === tab
                  ? "bg-gold text-pine shadow-[0_12px_28px_rgba(201,168,76,0.25)]"
                  : "border border-white/25 bg-white/10 text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </PageHero>

      <NewsList category={category} />
    </section>
  );
}
