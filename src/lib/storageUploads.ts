import { storage } from "./firebase";
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/heic"];

export async function uploadCoachIdImage(
  uid: string,
  side: "front" | "back",
  file: File,
): Promise<{ path: string; url: string }> {
  if (file.size > MAX_BYTES) {
    throw new Error(`圖片過大，請縮小至 5MB 以下（目前 ${(file.size / 1024 / 1024).toFixed(1)}MB）`);
  }
  if (file.type && !ALLOWED_MIME.includes(file.type)) {
    throw new Error("僅接受 JPG / PNG / WebP / HEIC 圖片格式");
  }
  const ext = guessExt(file);
  const path = `pending_coaches/${uid}/id_${side}.${ext}`;
  const r = ref(storage, path);
  await uploadBytes(r, file, { contentType: file.type || `image/${ext}` });
  const url = await getDownloadURL(r);
  return { path, url };
}

export async function deleteStorageObject(path: string): Promise<void> {
  try {
    await deleteObject(ref(storage, path));
  } catch (err) {
    console.warn("[storage] 刪除失敗（可能已不存在）：", path, err);
  }
}

function guessExt(file: File): string {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/heic") return "heic";
  const m = /\.([a-zA-Z0-9]+)$/.exec(file.name);
  if (m) return m[1].toLowerCase();
  return "jpg";
}
