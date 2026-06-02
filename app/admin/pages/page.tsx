"use client";

import { useEffect, useMemo, useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import PageHero from "@/components/PageHero";
import { getOptimizedCloudinaryUrl } from "@/lib/cloudinaryUrl";
import {
  DEFAULT_PAGE_HEROES,
  PAGE_HERO_ADMIN_ITEMS,
  savePageHeroSettings,
  subscribePageHeroSettings,
  type PageHeroKey,
  type PageHeroSetting,
} from "@/lib/pageHeroSettings";

async function convertToWebp(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const maxWidth = 1600;
  const scale = Math.min(1, maxWidth / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("圖片轉換失敗");

  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.86));
  bitmap.close();
  if (!blob) throw new Error("WebP 產生失敗");

  const name = file.name.replace(/\.[^.]+$/, "") || "page-hero";
  return new File([blob], `${name}.webp`, { type: "image/webp" });
}

async function uploadHeroImage(file: File, key: PageHeroKey) {
  const webpFile = await convertToWebp(file);
  const signResponse = await fetch("/api/cloudinary/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      folder: `page-heroes/${key}`,
      tags: "page-hero,jojo-tennis",
    }),
  });

  if (!signResponse.ok) throw new Error("Cloudinary 簽章失敗");

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

  const uploaded = (await uploadResponse.json()) as { public_id: string; secure_url?: string };
  return {
    publicId: uploaded.public_id,
    image:
      getOptimizedCloudinaryUrl(uploaded.public_id, { width: 1200, format: "webp" }) ||
      uploaded.secure_url ||
      "",
  };
}

export default function AdminPagesPage() {
  const [selectedKey, setSelectedKey] = useState<PageHeroKey>("match");
  const [heroes, setHeroes] = useState(DEFAULT_PAGE_HEROES);
  const [draft, setDraft] = useState<PageHeroSetting>(DEFAULT_PAGE_HEROES.match);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState("");

  const selectedItem = useMemo(
    () => PAGE_HERO_ADMIN_ITEMS.find((item) => item.key === selectedKey) ?? PAGE_HERO_ADMIN_ITEMS[0],
    [selectedKey],
  );

  useEffect(() => {
    return subscribePageHeroSettings((settings) => {
      setHeroes(settings);
      setDraft(settings[selectedKey]);
    });
  }, [selectedKey]);

  function updateDraft(field: keyof PageHeroSetting, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function uploadImage(file?: File) {
    if (!file) return;
    setUploading(true);
    setStatus("Hero 圖片轉 WebP 並上傳中...");
    try {
      const uploaded = await uploadHeroImage(file, selectedKey);
      setDraft((current) => ({ ...current, ...uploaded }));
      setStatus("圖片已上傳，請按儲存套用。");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "圖片上傳失敗");
    } finally {
      setUploading(false);
    }
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatus("");
    try {
      const saved = await savePageHeroSettings({ ...heroes, [selectedKey]: draft });
      setHeroes(saved);
      setDraft(saved[selectedKey]);
      setStatus("分頁 Hero 已儲存。");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "儲存失敗");
    } finally {
      setSaving(false);
    }
  }

  async function resetDefault() {
    setSaving(true);
    setStatus("");
    try {
      const saved = await savePageHeroSettings({
        ...heroes,
        [selectedKey]: DEFAULT_PAGE_HEROES[selectedKey],
      });
      setHeroes(saved);
      setDraft(saved[selectedKey]);
      setStatus("已恢復此分頁預設 Hero。");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "恢復失敗");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminGuard>
      <section className="mx-auto max-w-md px-6 py-10">
        <div className="rounded-[2rem] bg-pine p-6 text-white shadow-lg">
          <p className="text-sm font-semibold text-gold">Admin</p>
          <h1 className="mt-2 text-3xl font-bold">分頁管理</h1>
          <p className="mt-4 leading-7 text-parchment">
            統一管理各分頁 Hero 圖片、標題文字與敘述內容。
          </p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2">
          {PAGE_HERO_ADMIN_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setSelectedKey(item.key);
                setDraft(heroes[item.key]);
                setStatus("");
              }}
              className={`rounded-2xl px-3 py-3 text-left text-sm font-bold ${
                selectedKey === item.key ? "bg-pine text-white" : "bg-white text-pine ring-1 ring-parchment"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <form onSubmit={(event) => void save(event)} className="mt-6 space-y-4 rounded-[1.5rem] bg-white p-5 ring-1 ring-parchment">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-clay">目前編輯</p>
              <h2 className="mt-1 text-lg font-black text-pine">{selectedItem.label}</h2>
              <p className="mt-1 text-xs text-muted">{selectedItem.href}</p>
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={() => void resetDefault()}
              className="shrink-0 rounded-full border border-pine px-3 py-2 text-xs font-bold text-pine disabled:opacity-60"
            >
              恢復預設
            </button>
          </div>

          <input
            value={draft.eyebrow}
            onChange={(event) => updateDraft("eyebrow", event.target.value)}
            placeholder="眉標，例如 Reviews"
            className="w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay"
          />
          <input
            required
            value={draft.title}
            onChange={(event) => updateDraft("title", event.target.value)}
            placeholder="分頁標題"
            className="w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay"
          />
          <textarea
            required
            value={draft.description}
            onChange={(event) => updateDraft("description", event.target.value)}
            rows={4}
            placeholder="分頁敘述"
            className="w-full resize-none rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm leading-6 outline-none focus:border-clay"
          />

          <label className="block rounded-2xl border border-parchment bg-ivory p-4">
            <span className="text-sm font-bold text-pine">Hero 圖片</span>
            <span className="mt-1 block text-xs leading-5 text-muted">
              可上傳圖片，或直接貼圖片 URL。空白則使用純色 Hero。
            </span>
            <input
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={(event) => void uploadImage(event.target.files?.[0])}
              className="mt-3 w-full text-xs text-muted"
            />
          </label>
          <textarea
            value={draft.image}
            onChange={(event) => updateDraft("image", event.target.value)}
            rows={2}
            placeholder="Hero 圖片 URL"
            className="w-full resize-none rounded-2xl border border-parchment bg-ivory px-4 py-3 text-xs leading-5 outline-none focus:border-clay"
          />

          <div className="overflow-hidden rounded-2xl border border-parchment">
            <PageHero
              eyebrow={draft.eyebrow}
              title={draft.title || "分頁標題"}
              description={draft.description || "分頁敘述"}
              image={draft.image}
            />
          </div>

          <button
            type="submit"
            disabled={saving || uploading}
            className="w-full rounded-full bg-clay px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
          >
            {saving ? "儲存中..." : uploading ? "上傳中..." : "儲存分頁設定"}
          </button>
          {status ? <p className="text-sm font-bold text-clay">{status}</p> : null}
        </form>
      </section>
    </AdminGuard>
  );
}
