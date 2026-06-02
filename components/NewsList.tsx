"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { NewsArticle, NewsCategory } from "@/data/news";
import { useApp } from "@/context/AppContext";

export const newsTabs: Array<"全部" | NewsCategory> = [
  "全部",
  "賽事",
  "品牌",
  "新品",
  "活動",
];

export type NewsTab = (typeof newsTabs)[number];

type NewsListProps = {
  articles?: NewsArticle[];
  category: NewsTab;
};

export default function NewsList({ articles = [], category }: NewsListProps) {
  const { newsArticles } = useApp();
  const sourceArticles = (articles.length > 0 ? articles : newsArticles).filter(
    (article) => article.isPublished,
  );
  const filteredArticles = useMemo(
    () =>
      category === "全部"
        ? sourceArticles
        : sourceArticles.filter((article) => article.category === category),
    [sourceArticles, category],
  );

  return (
    <div className="mt-6 divide-y divide-pine/10 border-y border-pine/10 bg-white shadow-[0_16px_48px_rgba(30,61,47,0.07)]">
      {filteredArticles.map((article) => (
        <Link key={article.id} href={`/news/${article.slug}`} className="block">
          <img src={article.coverImage} alt={article.title} className="aspect-video w-full object-cover" />
          <div className="px-5 py-5">
            <span className="inline-flex rounded-full bg-clay px-3 py-1 text-xs font-bold text-white">
              {article.category}
            </span>
            <h2 className="mt-2 text-lg font-black tracking-tight text-pine">{article.title}</h2>
            <p className="mt-1 text-xs text-muted">{article.publishedAt}</p>
            <p className="mt-3 text-sm leading-6 text-muted">{article.excerpt}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
