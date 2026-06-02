import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { USE_FIREBASE } from "./config";
import { getOptimizedCloudinaryUrl } from "./cloudinaryUrl";

export type LandingHeroImage = {
  url: string;
  publicId?: string;
};

const STORAGE_KEY = "jojo-landing-hero-images";

export const DEFAULT_HERO_IMAGES: LandingHeroImage[] = [
  { url: "/images/landing/hero-serve.png" },
  { url: "/images/landing/hero-doubles.png" },
  { url: "/images/landing/hero-coaching.png" },
];

function normalizeHeroImages(input: unknown): LandingHeroImage[] {
  if (!Array.isArray(input)) return DEFAULT_HERO_IMAGES;
  const images = input
    .map((item) => {
      if (typeof item === "string") return { url: item };
      if (!item || typeof item !== "object") return null;
      const row = item as { url?: unknown; publicId?: unknown };
      const publicId = typeof row.publicId === "string" ? row.publicId : "";
      const url =
        typeof row.url === "string" && row.url
          ? row.url
          : publicId
            ? getOptimizedCloudinaryUrl(publicId, { width: 1200, format: "webp" })
            : "";
      return url ? { url, publicId: publicId || undefined } : null;
    })
    .filter(Boolean) as LandingHeroImage[];

  return images.length > 0 ? images : DEFAULT_HERO_IMAGES;
}

function readLocalHeroImages() {
  if (typeof window === "undefined") return DEFAULT_HERO_IMAGES;
  try {
    return normalizeHeroImages(JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]"));
  } catch {
    return DEFAULT_HERO_IMAGES;
  }
}

export function subscribeLandingHeroImages(cb: (images: LandingHeroImage[]) => void) {
  if (USE_FIREBASE && db) {
    return onSnapshot(
      doc(db, "site_settings", "landing"),
      (snap) => cb(normalizeHeroImages(snap.data()?.heroImages)),
      () => cb(readLocalHeroImages()),
    );
  }

  cb(readLocalHeroImages());
  return () => {};
}

export async function saveLandingHeroImages(images: LandingHeroImage[]) {
  const normalized = normalizeHeroImages(images);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  }

  if (USE_FIREBASE && db) {
    await setDoc(doc(db, "site_settings", "landing"), { heroImages: normalized }, { merge: true });
  }

  return normalized;
}
