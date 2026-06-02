"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import {
  deleteEquipmentReview,
  fetchEquipmentReviews,
  saveEquipmentReview,
} from "@/lib/equipmentReviewService";
import { getOptimizedCloudinaryUrl } from "@/lib/cloudinaryUrl";
import type { EquipmentReview } from "@/lib/supabase.types";

type ReviewDraft = {
  id?: string;
  title: string;
  slug: string;
  category: string;
  brand: string;
  model: string;
  coverImageUrl: string;
  contentMd: string;
  isPublished: boolean;
};

const emptyDraft: ReviewDraft = {
  title: "",
  slug: "",
  category: "球拍",
  brand: "",
  model: "",
  coverImageUrl: "",
  contentMd: "",
  isPublished: false,
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\w\s\u4e00-\u9fff-]/g, "")
    .replace(/\s+/g, "-");
}

function convertToWebp(file: File, maxWidth = 1600) {
  return new Promise<File>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("圖片讀取失敗"));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("圖片格式無法讀取"));
      image.onload = () => {
        const scale = Math.min(1, maxWidth / image.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("圖片轉檔失敗"));
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("圖片轉檔失敗"));
              return;
            }
            const name = file.name.replace(/\.[^.]+$/, "") || "review-image";
            resolve(new File([blob], `${name}.webp`, { type: "image/webp" }));
          },
          "image/webp",
          0.86,
        );
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

async function uploadCloudinaryImage(file: File, folder: string, width: number) {
  const webpFile = await convertToWebp(file, width);
  const signResponse = await fetch("/api/cloudinary/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder, tags: "jojo-tennis,equipment-review" }),
  });

  if (!signResponse.ok) throw new Error("Cloudinary 簽名失敗");

  const signature = (await signResponse.json()) as {
    cloudName: string;
    apiKey: string;
    timestamp: number;
    signature: string;
    folder: string;
    tags: string;
  };
  const formData = new FormData();
  formData.append("file", webpFile);
  formData.append("api_key", signature.apiKey);
  formData.append("timestamp", String(signature.timestamp));
  formData.append("signature", signature.signature);
  formData.append("folder", signature.folder);
  formData.append("tags", signature.tags);

  const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`, {
    method: "POST",
    body: formData,
  });

  if (!uploadResponse.ok) throw new Error("Cloudinary 上傳失敗");

  const uploaded = (await uploadResponse.json()) as { public_id: string; secure_url: string };
  return getOptimizedCloudinaryUrl(uploaded.public_id, { width, format: "webp" }) || uploaded.secure_url;
}

function toDraft(review: EquipmentReview): ReviewDraft {
  return {
    id: review.id,
    title: review.title,
    slug: review.slug,
    category: review.category,
    brand: review.brand,
    model: review.model,
    coverImageUrl: review.coverImageUrl,
    contentMd: review.contentMd,
    isPublished: review.isPublished,
  };
}

export default function AdminReviewsPage() {
  const editorRef = useRef<HTMLDivElement>(null);
  const inlineImageInputRef = useRef<HTMLInputElement>(null);
  const [reviews, setReviews] = useState<EquipmentReview[]>([]);
  const [draft, setDraft] = useState<ReviewDraft>(emptyDraft);
  const [mode, setMode] = useState<"visual" | "html">("visual");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const isEditing = Boolean(draft.id);
  const previewText = useMemo(() => draft.contentMd.replace(/<[^>]*>/g, "").slice(0, 90), [draft.contentMd]);

  async function reload() {
    setReviews(await fetchEquipmentReviews({ includeDrafts: true }));
  }

  useEffect(() => {
    void reload();
  }, []);

  function updateTitle(value: string) {
    setDraft((current) => ({
      ...current,
      title: value,
      slug: current.slug || slugify(value),
    }));
  }

  function runFormat(command: string, value?: string) {
    if (mode !== "visual") return;
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    setDraft((current) => ({ ...current, contentMd: editorRef.current?.innerHTML ?? current.contentMd }));
  }

  function insertHtml(html: string) {
    editorRef.current?.focus();
    document.execCommand("insertHTML", false, html);
    setDraft((current) => ({ ...current, contentMd: editorRef.current?.innerHTML ?? current.contentMd }));
  }

  async function uploadCover(file?: File) {
    if (!file) return;
    setUploading(true);
    setStatus("封面轉 WebP 並上傳 Cloudinary 中...");
    try {
      const url = await uploadCloudinaryImage(file, "equipment-reviews/covers", 1600);
      setDraft((current) => ({ ...current, coverImageUrl: url }));
      setStatus("封面已上傳。");
    } catch {
      setStatus("封面上傳失敗，請確認 Cloudinary 設定。");
    } finally {
      setUploading(false);
    }
  }

  async function uploadInlineImage(file?: File) {
    if (!file) return;
    setUploading(true);
    setStatus("內文圖片轉 WebP 並上傳中...");
    try {
      const url = await uploadCloudinaryImage(file, "equipment-reviews/content", 1400);
      insertHtml(`<figure><img src="${url}" alt="" /></figure>`);
      setStatus("圖片已插入內文。");
    } catch {
      setStatus("內文圖片上傳失敗。");
    } finally {
      setUploading(false);
      if (inlineImageInputRef.current) inlineImageInputRef.current.value = "";
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const contentMd = mode === "visual" ? editorRef.current?.innerHTML ?? draft.contentMd : draft.contentMd;
    if (!draft.title.trim() || !contentMd.trim()) {
      setStatus("請至少填寫標題與內容。");
      return;
    }

    setSaving(true);
    setStatus("");
    try {
      await saveEquipmentReview({
        ...draft,
        slug: draft.slug || slugify(draft.title),
        contentMd,
        authorName: "JoJo Tennis 編輯部",
      });
      setDraft(emptyDraft);
      await reload();
      setStatus("評測已儲存。");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "儲存失敗");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminGuard>
      <section className="mx-auto max-w-md px-6 py-10">
        <div className="rounded-[2rem] bg-pine p-6 text-white shadow-lg">
          <p className="text-sm font-semibold text-gold">Admin</p>
          <h1 className="mt-2 text-3xl font-bold">球具評測管理</h1>
          <p className="mt-4 leading-7 text-parchment">建立、編輯、發布球拍、球線、球鞋與配件評測。</p>
        </div>

        <form onSubmit={(event) => void submit(event)} className="mt-6 space-y-4 rounded-[1.5rem] bg-white p-5 ring-1 ring-parchment">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-black text-pine">{isEditing ? "編輯評測" : "新增評測"}</h2>
            {isEditing ? (
              <button type="button" onClick={() => setDraft(emptyDraft)} className="rounded-full bg-ivory px-4 py-2 text-xs font-bold text-pine">
                新增
              </button>
            ) : null}
          </div>

          <input required value={draft.title} onChange={(event) => updateTitle(event.target.value)} placeholder="標題" className="w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay" />
          <input required value={draft.slug} onChange={(event) => setDraft((current) => ({ ...current, slug: event.target.value }))} placeholder="slug" className="w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay" />

          <div className="grid grid-cols-2 gap-2">
            <select value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))} className="rounded-2xl border border-parchment bg-ivory px-3 py-3 text-sm outline-none focus:border-clay">
              <option>球拍</option>
              <option>球線</option>
              <option>球鞋</option>
              <option>握把</option>
              <option>配件</option>
            </select>
            <input value={draft.brand} onChange={(event) => setDraft((current) => ({ ...current, brand: event.target.value }))} placeholder="品牌" className="rounded-2xl border border-parchment bg-ivory px-3 py-3 text-sm outline-none focus:border-clay" />
          </div>

          <input value={draft.model} onChange={(event) => setDraft((current) => ({ ...current, model: event.target.value }))} placeholder="型號" className="w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay" />

          <label className="block rounded-2xl border border-parchment bg-ivory p-4">
            <span className="text-sm font-bold text-pine">封面圖片</span>
            <span className="mt-1 block text-xs leading-5 text-muted">上傳後會先轉 WebP，再送 Cloudinary。</span>
            <input type="file" accept="image/*" onChange={(event) => void uploadCover(event.target.files?.[0])} className="mt-3 w-full text-xs text-muted" />
          </label>

          <textarea value={draft.coverImageUrl} onChange={(event) => setDraft((current) => ({ ...current, coverImageUrl: event.target.value }))} rows={2} placeholder="封面圖片 URL" className="w-full resize-none rounded-2xl border border-parchment bg-ivory px-4 py-3 text-xs leading-5 outline-none focus:border-clay" />
          {draft.coverImageUrl ? <img src={draft.coverImageUrl} alt="封面預覽" className="aspect-video w-full rounded-xl object-cover" /> : null}

          <div className="rounded-2xl border border-parchment bg-ivory p-3">
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => setMode((value) => (value === "visual" ? "html" : "visual"))} className="rounded-full bg-pine px-4 py-2 text-xs font-black text-white">
                {mode === "visual" ? "切換 HTML" : "切換富文本"}
              </button>
              {mode === "visual" ? (
                <>
                  <button type="button" onClick={() => runFormat("bold")} className="rounded-full bg-white px-3 py-2 text-xs font-black text-pine">B</button>
                  <button type="button" onClick={() => runFormat("italic")} className="rounded-full bg-white px-3 py-2 text-xs font-black text-pine">I</button>
                  <button type="button" onClick={() => runFormat("formatBlock", "<h2>")} className="rounded-full bg-white px-3 py-2 text-xs font-black text-pine">H2</button>
                  <button type="button" onClick={() => runFormat("insertUnorderedList")} className="rounded-full bg-white px-3 py-2 text-xs font-black text-pine">清單</button>
                  <button type="button" onClick={() => inlineImageInputRef.current?.click()} disabled={uploading} className="rounded-full bg-gold px-3 py-2 text-xs font-black text-pine disabled:opacity-60">
                    {uploading ? "上傳中" : "上傳圖片"}
                  </button>
                  <input ref={inlineImageInputRef} type="file" accept="image/*" onChange={(event) => void uploadInlineImage(event.target.files?.[0])} className="hidden" />
                </>
              ) : null}
            </div>

            {mode === "visual" ? (
              <div
                key={draft.id ?? "new"}
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onBlur={(event) => setDraft((current) => ({ ...current, contentMd: event.currentTarget.innerHTML }))}
                className="prose-news mt-3 min-h-64 rounded-xl bg-white px-4 py-3 text-sm leading-7 text-ink outline-none ring-1 ring-parchment focus:ring-clay"
                dangerouslySetInnerHTML={{ __html: draft.contentMd }}
              />
            ) : (
              <textarea value={draft.contentMd} onChange={(event) => setDraft((current) => ({ ...current, contentMd: event.target.value }))} rows={12} placeholder="<p>評測內容 HTML</p>" className="mt-3 w-full resize-y rounded-xl bg-white px-4 py-3 font-mono text-xs leading-6 outline-none ring-1 ring-parchment focus:ring-clay" />
            )}
          </div>

          {previewText ? <p className="rounded-2xl bg-ivory p-3 text-xs leading-5 text-muted">摘要預覽：{previewText}</p> : null}

          <label className="flex items-center justify-between rounded-2xl bg-ivory p-4 text-sm font-semibold text-pine">
            發布
            <input type="checkbox" checked={draft.isPublished} onChange={(event) => setDraft((current) => ({ ...current, isPublished: event.target.checked }))} className="h-5 w-5 accent-clay" />
          </label>

          <button type="submit" disabled={saving || uploading} className="w-full rounded-full bg-clay px-4 py-3 text-sm font-bold text-white disabled:opacity-60">
            {saving ? "儲存中..." : "儲存評測"}
          </button>
          {status ? <p className="text-sm font-bold text-clay">{status}</p> : null}
        </form>

        <div className="mt-8 space-y-3">
          {reviews.map((review) => (
            <article key={review.id} className="rounded-[1.5rem] bg-white p-5 ring-1 ring-parchment">
              <p className="text-xs font-bold text-clay">{review.category} · {review.isPublished ? "發布" : "草稿"}</p>
              <h2 className="mt-1 font-bold text-pine">{review.title}</h2>
              <p className="mt-1 text-xs text-muted">{review.brand} {review.model}</p>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => setDraft(toDraft(review))} className="rounded-full bg-pine px-4 py-2 text-xs font-bold text-white">
                  編輯
                </button>
                <button type="button" onClick={() => void deleteEquipmentReview(review.id).then(reload)} className="rounded-full bg-ivory px-4 py-2 text-xs font-bold text-clay">
                  刪除
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </AdminGuard>
  );
}
