import { db } from "./firebase";
import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

export type LegalPageSlug = "privacy" | "terms";

export interface LegalSection {
  id: string;
  heading: string;
  body: string;
  highlight?: boolean;
}

export interface LegalPageContent {
  slug: LegalPageSlug;
  badge: string;
  title: string;
  intro: string;
  noticeTitle: string;
  noticeBody: string;
  sections: LegalSection[];
  lastUpdated: string;
  updatedAt?: number;
}

const COLLECTION = "legal_pages";

function sectionsFromUnknown(raw: unknown): LegalSection[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item, index) => ({
      id: String(item.id ?? `section-${index + 1}`),
      heading: String(item.heading ?? ""),
      body: String(item.body ?? ""),
      highlight: item.highlight === true,
    }));
}

function fromDoc(slug: LegalPageSlug, data: Record<string, unknown>): LegalPageContent {
  return {
    slug,
    badge: String(data.badge ?? ""),
    title: String(data.title ?? ""),
    intro: String(data.intro ?? ""),
    noticeTitle: String(data.noticeTitle ?? ""),
    noticeBody: String(data.noticeBody ?? ""),
    sections: sectionsFromUnknown(data.sections),
    lastUpdated: String(data.lastUpdated ?? ""),
    updatedAt:
      data.updatedAt && typeof (data.updatedAt as { toMillis?: () => number }).toMillis === "function"
        ? (data.updatedAt as { toMillis: () => number }).toMillis()
        : undefined,
  };
}

export async function fetchLegalPage(slug: LegalPageSlug): Promise<LegalPageContent | null> {
  const snap = await getDoc(doc(db, COLLECTION, slug));
  if (!snap.exists()) return null;
  return fromDoc(slug, snap.data() as Record<string, unknown>);
}

export function subscribeLegalPage(
  slug: LegalPageSlug,
  cb: (page: LegalPageContent | null) => void,
) {
  return onSnapshot(
    doc(db, COLLECTION, slug),
    (snap) => {
      if (!snap.exists()) {
        cb(null);
        return;
      }
      cb(fromDoc(slug, snap.data() as Record<string, unknown>));
    },
    (err) => console.error(`[legal_pages/${slug}] 監聽失敗：`, err.code, err.message),
  );
}

export async function saveLegalPage(content: LegalPageContent): Promise<void> {
  const payload = {
    badge: content.badge,
    title: content.title,
    intro: content.intro,
    noticeTitle: content.noticeTitle,
    noticeBody: content.noticeBody,
    sections: content.sections.map((s) => ({
      id: s.id,
      heading: s.heading,
      body: s.body,
      highlight: Boolean(s.highlight),
    })),
    lastUpdated: content.lastUpdated,
    updatedAt: serverTimestamp(),
  };
  await setDoc(doc(db, COLLECTION, content.slug), payload, { merge: true });
}
