import "server-only";
import { createHash } from "node:crypto";

export type CloudinaryUploadSignature = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  tags: string;
};

export function hasCloudinaryConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );
}

export function createUploadSignature(folder: string, tags = "jojo-tennis") {
  if (!hasCloudinaryConfig()) {
    throw new Error("Missing Cloudinary environment variables");
  }

  const timestamp = Math.round(Date.now() / 1000);
  const payload = `folder=${folder}&tags=${tags}&timestamp=${timestamp}${process.env.CLOUDINARY_API_SECRET}`;
  const signature = createHash("sha1").update(payload).digest("hex");

  return {
    cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!,
    apiKey: process.env.CLOUDINARY_API_KEY!,
    timestamp,
    signature,
    folder,
    tags,
  } satisfies CloudinaryUploadSignature;
}

export async function deleteCloudinaryAsset(publicId: string) {
  if (!hasCloudinaryConfig()) {
    throw new Error("Missing Cloudinary environment variables");
  }

  const timestamp = Math.round(Date.now() / 1000);
  const signaturePayload = `public_id=${publicId}&timestamp=${timestamp}${process.env.CLOUDINARY_API_SECRET}`;
  const signature = createHash("sha1").update(signaturePayload).digest("hex");
  const body = new URLSearchParams({
    public_id: publicId,
    timestamp: String(timestamp),
    api_key: process.env.CLOUDINARY_API_KEY!,
    signature,
  });

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/destroy`,
    { method: "POST", body },
  );
  if (!response.ok) throw new Error("Cloudinary delete failed");
  return response.json();
}
