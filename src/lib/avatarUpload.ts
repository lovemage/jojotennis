"use client";

import { getOptimizedCloudinaryUrl } from "@/lib/cloudinaryUrl";
import { getClientAuthHeaders } from "@/lib/clientAuthHeaders";

type CloudinarySignature = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  tags: string;
};

async function convertAvatarToWebp(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const size = Math.min(bitmap.width, bitmap.height);
  const sx = Math.floor((bitmap.width - size) / 2);
  const sy = Math.floor((bitmap.height - size) / 2);
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext("2d");

  if (!context) {
    bitmap.close();
    throw new Error("頭像轉換失敗");
  }

  context.drawImage(bitmap, sx, sy, size, size, 0, 0, 512, 512);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.86));
  if (!blob) throw new Error("WebP 產生失敗");

  return new File([blob], "avatar.webp", { type: "image/webp" });
}

export async function uploadAvatarImage(
  file: File,
  userUid: string,
  options: { width?: number; height?: number } = {},
): Promise<string> {
  const webpFile = await convertAvatarToWebp(file);
  const signResponse = await fetch("/api/cloudinary/sign", {
    method: "POST",
    headers: await getClientAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      folder: `users/${userUid}/avatar`,
      tags: "avatar,jojo-tennis",
    }),
  });

  if (!signResponse.ok) throw new Error("Cloudinary 簽章失敗");

  const signature = (await signResponse.json()) as CloudinarySignature;
  const formData = new FormData();
  formData.append("file", webpFile);
  formData.append("api_key", signature.apiKey);
  formData.append("timestamp", String(signature.timestamp));
  formData.append("signature", signature.signature);
  formData.append("folder", signature.folder);
  formData.append("tags", signature.tags);

  const uploadResponse = await fetch(
    `https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`,
    { method: "POST", body: formData },
  );

  if (!uploadResponse.ok) throw new Error("Cloudinary 上傳失敗");

  const uploaded = (await uploadResponse.json()) as {
    public_id: string;
    secure_url?: string;
  };

  return (
    getOptimizedCloudinaryUrl(uploaded.public_id, {
      width: options.width ?? 240,
      height: options.height ?? 240,
      crop: "fill",
      format: "webp",
    }) ||
    uploaded.secure_url ||
    ""
  );
}
