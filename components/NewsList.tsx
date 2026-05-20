"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { NewsArticle, NewsCategory } from "@/data/news";
import { useApp } from "@/context/AppContext";

type NewsListProps = {
  articles?: NewsArticle[];
};

const tabs: Array<"全部" | NewsCategory> = [
  "全部",
  "賽事",
  "品牌",
  "新品",
  "活動",
];

export default function NewsList({ articles = [] }: NewsListProps) {
  const { newsArticles } = useApp();
  const [category, setCategory] = useState<(typeof tabs)[number]>("全部");
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
    <>
      <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setCategory(tab)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ${
              category === tab ? "bg-pine text-white" : "bg-white text-pine"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-4">
        {filteredArticles.map((article) => (
          <Link
            key={article.id}
            href={`/news/${article.slug}`}
            className="block rounded-[1.5rem] border border-parchment bg-white p-4 shadow-sm"
          >
            <img
              src={article.coverImage}
              alt={article.title}
              className="aspect-video w-full rounded-xl object-cover"
            />
            <span className="mt-3 inline-flex rounded-full bg-clay px-3 py-1 text-xs font-bold text-white">
              {article.category}
            </span>
            <h2 className="mt-2 text-lg font-bold text-pine">{article.title}</h2>
            <p className="mt-1 text-xs text-muted">{article.publishedAt}</p>
            <p className="mt-3 text-sm leading-6 text-muted">{article.excerpt}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
