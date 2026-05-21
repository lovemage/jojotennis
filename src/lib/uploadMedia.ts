import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getClientStorage } from "./firebase";

export async function uploadImageFile(
  file: File,
  storagePath: string,
): Promise<string> {
  const snapshot = await uploadBytes(ref(getClientStorage(), storagePath), file, {
    contentType: file.type || "image/jpeg",
  });
  return getDownloadURL(snapshot.ref);
}

export async function uploadDataUrlImage(
  dataUrl: string,
  storagePath: string,
): Promise<string> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const snapshot = await uploadBytes(ref(getClientStorage(), storagePath), blob, {
    contentType: blob.type || "image/jpeg",
  });
  return getDownloadURL(snapshot.ref);
}
