"use client";

import { useEffect, useState } from "react";
import type { CourtImage } from "@/lib/supabase.types";
import { getOptimizedCloudinaryUrl } from "@/lib/cloudinaryUrl";
import { fetchCourtById, updateCourtImages } from "@/lib/courtService";

type CourtImagesAdminPanelProps = {
  courtId: string;
  initialImages?: CourtImage[];
};

export default function CourtImagesAdminPanel({ courtId, initialImages = [] }: CourtImagesAdminPanelProps) {
  const [images, setImages] = useState<CourtImage[]>(initialImages);
  const [status, setStatus] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let active = true;
    fetchCourtById(courtId)
      .then((court) => {
        if (active && court?.images) setImages(court.images);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [courtId]);

  async function uploadFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setStatus("");

    try {
      const nextImages = [...images];
      for (const file of Array.from(files)) {
        const signResponse = await fetch("/api/cloudinary/sign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ folder: `courts/${courtId}`, tags: "court,jojo-tennis" }),
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
        formData.append("file", file);
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
        const uploaded = (await uploadResponse.json()) as { public_id: string };
        nextImages.push({
          publicId: uploaded.public_id,
          sortOrder: nextImages.length,
        });
      }

      await updateCourtImages(courtId, nextImages);
      setImages(nextImages);
      setStatus("圖片已更新。");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "圖片上傳失敗");
    } finally {
      setUploading(false);
    }
  }

  async function removeImage(publicId: string) {
    const nextImages = images
      .filter((image) => image.publicId !== publicId)
      .map((image, index) => ({ ...image, sortOrder: index }));
    await updateCourtImages(courtId, nextImages);
    setImages(nextImages);
    void fetch("/api/cloudinary/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicId }),
    });
  }

  return (
    <div className="mt-4 rounded-lg bg-ivory p-3">
      <label className="block">
        <span className="text-xs font-bold text-pine">球場圖片</span>
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={uploading}
          onChange={(event) => void uploadFiles(event.target.files)}
          className="mt-2 w-full text-xs text-muted"
        />
      </label>
      {status ? <p className="mt-2 text-xs font-bold text-clay">{status}</p> : null}
      {images.length > 0 ? (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {images.map((image) => (
            <div key={image.publicId} className="overflow-hidden rounded-md bg-white">
              <img src={getOptimizedCloudinaryUrl(image.publicId, { width: 240 })} alt="" className="h-20 w-full object-cover" />
              <button
                type="button"
                onClick={() => void removeImage(image.publicId)}
                className="block w-full px-2 py-1 text-xs font-bold text-clay"
              >
                刪除
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
