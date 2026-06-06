"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_HERO_IMAGES,
  saveLandingHeroImages,
  subscribeLandingHeroImages,
  type LandingHeroImage,
} from "@/lib/landingSettings";
import { getOptimizedCloudinaryUrl } from "@/lib/cloudinaryUrl";
import { getClientAuthHeaders } from "@/lib/clientAuthHeaders";

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

  const name = file.name.replace(/\.[^.]+$/, "") || "hero";
  return new File([blob], `${name}.webp`, { type: "image/webp" });
}

export default function AdminHeroImagePanel() {
  const [images, setImages] = useState<LandingHeroImage[]>(DEFAULT_HERO_IMAGES);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => subscribeLandingHeroImages(setImages), []);

  async function uploadFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setStatus("");

    try {
      const nextImages: LandingHeroImage[] = [];
      for (const file of Array.from(files).slice(0, 3)) {
        const webpFile = await convertToWebp(file);
        const signResponse = await fetch("/api/cloudinary/sign", {
          method: "POST",
          headers: await getClientAuthHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ folder: "landing/hero", tags: "landing,hero,jojo-tennis" }),
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
        nextImages.push({
          publicId: uploaded.public_id,
          url:
            getOptimizedCloudinaryUrl(uploaded.public_id, { width: 1200, format: "webp" }) ||
            uploaded.secure_url ||
            "",
        });
      }

      const saved = await saveLandingHeroImages(nextImages);
      setImages(saved);
      setStatus("Hero 圖片已更新。");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Hero 圖片上傳失敗");
    } finally {
      setUploading(false);
    }
  }

  async function resetDefault() {
    const saved = await saveLandingHeroImages(DEFAULT_HERO_IMAGES);
    setImages(saved);
    setStatus("已恢復預設 Hero 圖片。");
  }

  return (
    <div className="mt-6 rounded-[1.5rem] border border-parchment bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-clay">首頁 Hero 輪播</p>
      <p className="mt-2 text-sm leading-6 text-muted">
        上傳 3 張圖片，系統會先轉成 WebP 再上傳 Cloudinary。前台每 1.8 秒自動輪播。
      </p>
      <label className="mt-4 block">
        <span className="text-xs font-bold text-pine">上傳 Hero 圖片</span>
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={uploading}
          onChange={(event) => void uploadFiles(event.target.files)}
          className="mt-2 w-full text-xs text-muted"
        />
      </label>
      <button
        type="button"
        onClick={() => void resetDefault()}
        className="mt-3 rounded-full border border-pine px-4 py-2 text-xs font-bold text-pine"
      >
        恢復預設圖
      </button>
      {status ? <p className="mt-3 text-xs font-bold text-clay">{status}</p> : null}
      <div className="mt-4 grid grid-cols-3 gap-2">
        {images.slice(0, 3).map((image, index) => (
          <div key={`${image.url}-${index}`} className="overflow-hidden rounded-xl bg-ivory">
            <img src={image.url} alt={`Hero ${index + 1}`} className="aspect-[4/3] w-full object-cover" />
          </div>
        ))}
      </div>
    </div>
  );
}
