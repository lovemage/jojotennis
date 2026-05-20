"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createAiTennisCover, type NewsArticle, type NewsCategory } from "@/data/news";
import { useApp } from "@/context/AppContext";

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

function resizeImageFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error("圖片讀取失敗"));
    reader.onload = () => {
      const image = new Image();

      image.onerror = () => reject(new Error("圖片格式無法讀取"));
      image.onload = () => {
        const maxWidth = 1200;
        const scale = Math.min(1, maxWidth / image.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);

        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("圖片壓縮失敗"));
          return;
        }

        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.78));
      };
      image.src = String(reader.result);
    };

    reader.readAsDataURL(file);
  });
}

export default function NewsEditorForm({ article }: NewsEditorFormProps) {
  const router = useRouter();
  const { saveNewsArticle } = useApp();
  const [title, setTitle] = useState(article?.title ?? "");
  const [slug, setSlug] = useState(article?.slug ?? "");
  const [category, setCategory] = useState<NewsCategory>(article?.category ?? "賽事");
  const [excerpt, setExcerpt] = useState(article?.excerpt ?? "");
  const [coverImage, setCoverImage] = useState(article?.coverImage ?? "");
  const [coverPreview, setCoverPreview] = useState(article?.coverImage ?? "");
  const [content, setContent] = useState(article?.content ?? "");
  const [isPublished, setIsPublished] = useState(article?.isPublished ?? false);
  const [generationStatus, setGenerationStatus] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [coverFile, setCoverFile] = useState<File | undefined>();
  const generatedSlug = useMemo(() => slug || slugify(title), [slug, title]);

  function generateCover() {
    const prompts: Record<NewsCategory, { subject: string; accent: string; prompt: string }> = {
      賽事: {
        subject: "Professional Match",
        accent: "#B85C38",
        prompt:
          "Professional tennis match on clay court, Roland Garros style, dramatic lighting, athletic player in action, luxury sports aesthetic, cinematic photography, high contrast, editorial style",
      },
      品牌: {
        subject: "Luxury Equipment",
        accent: "#C9A84C",
        prompt:
          "Luxury tennis equipment flat lay, premium racket and balls, minimalist styling, white marble background, editorial fashion photography",
      },
      新品: {
        subject: "Premium Gear",
        accent: "#C9A84C",
        prompt:
          "Luxury tennis equipment flat lay, premium racket and balls, minimalist styling, white marble background, editorial fashion photography",
      },
      活動: {
        subject: "Club Lifestyle",
        accent: "#1E3D2F",
        prompt:
          "Tennis club social event, elegant outdoor setting, natural light, lifestyle photography, On Running or Alo Yoga aesthetic",
      },
      教學: {
        subject: "Training Session",
        accent: "#1E3D2F",
        prompt:
          "Professional tennis match on clay court, Roland Garros style, dramatic lighting, athletic player in action, luxury sports aesthetic, cinematic photography, high contrast, editorial style",
      },
    };
    const config = prompts[category];
    const image = createAiTennisCover(title || config.subject, config.accent, config.subject);

    setCoverImage(image);
    setCoverPreview(image);
    setCoverFile(undefined);
    setGenerationStatus(`已依提示詞生成封面：${config.prompt}`);
  }

  function updateTitle(value: string) {
    setTitle(value);
    if (!slug) {
      setSlug(slugify(value));
    }
  }

  async function replaceCoverFromFile(file?: File) {
    if (!file) {
      return;
    }

    try {
      const image = await resizeImageFile(file);
      setCoverImage(image);
      setCoverPreview(image);
      setCoverFile(file);
      setGenerationStatus("已選擇封面圖片，儲存時會上傳至 Firebase Storage。");
    } catch {
      setGenerationStatus("圖片讀取失敗，請換一張圖片或貼上圖片網址。");
    }
  }

  async function saveArticle() {
    if (!title.trim() || !content.trim()) {
      setSaveStatus("請至少填寫標題與正文。");
      return;
    }

    if (!coverFile && coverImage.startsWith("data:image") && coverImage.length > 900_000) {
      setSaveStatus("圖片仍然太大，請上傳較小圖片或使用 AI 生成封面。");
      return;
    }

    const nextArticle: NewsArticle = {
      id: article?.id ?? `news-${Date.now()}`,
      title: title.trim(),
      slug: generatedSlug || `news-${Date.now()}`,
      category,
      coverImage: coverImage || createAiTennisCover(title, "#B85C38", category),
      excerpt: excerpt.trim() || content.trim().slice(0, 100),
      content: content.trim(),
      publishedAt: article?.publishedAt ?? new Date().toISOString().slice(0, 10),
      isPublished,
      author: article?.author ?? "JoJo Tennis 編輯部",
    };

    setSaving(true);
    setSaveStatus("");
    try {
      await saveNewsArticle(nextArticle, coverFile);
      setSaveStatus("已儲存文章，封面已上傳至 Storage，前台新聞會同步更新。");
      router.push("/admin/news");
    } catch {
      setSaveStatus("儲存失敗，請確認已登入管理員帳號後再試。");
    } finally {
      setSaving(false);
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
      <select
        value={category}
        onChange={(event) => setCategory(event.target.value as NewsCategory)}
        className="w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay"
      >
        {categories.map((category) => (
          <option key={category}>{category}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={generateCover}
        className="w-full rounded-full bg-pine px-5 py-3 text-sm font-bold text-white"
      >
        ✨ AI 生成封面圖
      </button>
      <label className="block rounded-2xl border border-parchment bg-ivory p-4">
        <span className="text-sm font-bold text-pine">自己置換封面圖</span>
        <span className="mt-1 block text-xs leading-5 text-muted">
          可上傳圖片轉成 Base64，或貼上圖片網址/Base64。
        </span>
        <input
          type="file"
          accept="image/*"
          onChange={(event) => replaceCoverFromFile(event.target.files?.[0])}
          className="mt-3 w-full text-xs text-muted"
        />
      </label>
      <textarea
        value={coverImage}
        onChange={(event) => {
          setCoverImage(event.target.value);
          setCoverPreview(event.target.value);
          setCoverFile(undefined);
        }}
        rows={3}
        placeholder="貼上圖片網址或 Base64 圖片資料"
        className="w-full resize-none rounded-2xl border border-parchment bg-ivory px-4 py-3 text-xs leading-5 outline-none focus:border-clay"
      />
      {generationStatus ? (
        <p className="rounded-2xl bg-ivory p-3 text-xs leading-5 text-muted">
          {generationStatus}
        </p>
      ) : null}
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
        onClick={() => void saveArticle()}
        disabled={saving}
        className="w-full rounded-full bg-clay px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
      >
        {saving ? "儲存中..." : "儲存"}
      </button>
      {saveStatus ? <p className="text-center text-xs font-semibold text-clay">{saveStatus}</p> : null}
    </form>
  );
}
