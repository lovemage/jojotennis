"use client";

import { useMemo, useState } from "react";
import type { NewsArticle, NewsCategory } from "@/data/news";

type NewsEditorFormProps = {
  article?: NewsArticle;
};

const categories: NewsCategory[] = ["賽事", "品牌", "新品", "活動", "教學"];

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

export default function NewsEditorForm({ article }: NewsEditorFormProps) {
  const [title, setTitle] = useState(article?.title ?? "");
  const [slug, setSlug] = useState(article?.slug ?? "");
  const [excerpt, setExcerpt] = useState(article?.excerpt ?? "");
  const [coverImage, setCoverImage] = useState(article?.coverImage ?? "");
  const [coverPreview, setCoverPreview] = useState(article?.coverImage ?? "");
  const [content, setContent] = useState(article?.content ?? "");
  const [isPublished, setIsPublished] = useState(article?.isPublished ?? false);
  const generatedSlug = useMemo(() => slug || slugify(title), [slug, title]);

  function updateTitle(value: string) {
    setTitle(value);
    if (!slug) {
      setSlug(slugify(value));
    }
  }

  return (
    <form className="mt-6 space-y-4 rounded-[1.5rem] border border-parchment bg-white p-5 shadow-sm">
      <input
        value={title}
        onChange={(event) => updateTitle(event.target.value)}
        placeholder="標題"
        className="w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay"
      />
      <input
        value={generatedSlug}
        onChange={(event) => setSlug(event.target.value)}
        placeholder="Slug"
        className="w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay"
      />
      <select className="w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay">
        {categories.map((category) => (
          <option key={category}>{category}</option>
        ))}
      </select>
      <input
        value={coverImage}
        onChange={(event) => {
          setCoverImage(event.target.value);
          setCoverPreview(event.target.value);
        }}
        placeholder="封面圖 Storage URL"
        className="w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay"
      />
      <input
        type="file"
        accept="image/*"
        onChange={(event) => {
          const file = event.target.files?.[0];

          if (file) {
            setCoverPreview(URL.createObjectURL(file));
          }
        }}
        className="w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay"
      />
      {coverPreview ? (
        <img
          src={coverPreview}
          alt="封面預覽"
          className="aspect-video w-full rounded-xl object-cover"
        />
      ) : null}
      <label className="block">
        <textarea
          value={excerpt}
          onChange={(event) => setExcerpt(event.target.value.slice(0, 100))}
          rows={3}
          placeholder="摘要，100 字上限"
          className="w-full resize-none rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm leading-6 outline-none focus:border-clay"
        />
        <span className="text-xs text-muted">{excerpt.length}/100</span>
      </label>
      <textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        rows={8}
        placeholder="正文"
        className="w-full resize-none rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm leading-6 outline-none focus:border-clay"
      />
      <label className="flex items-center justify-between rounded-2xl bg-ivory p-4 text-sm font-semibold text-pine">
        立即發布
        <input
          type="checkbox"
          checked={isPublished}
          onChange={(event) => setIsPublished(event.target.checked)}
        />
      </label>
      <button
        type="button"
        className="w-full rounded-full bg-clay px-5 py-3 text-sm font-bold text-white"
      >
        儲存
      </button>
    </form>
  );
}
