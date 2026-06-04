import { USE_SUPABASE } from "./config";
import { getSupabaseBrowserClient, hasSupabaseConfig } from "./supabase";

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
    lastUpdated: String(data.last_updated ?? data.lastUpdated ?? ""),
    updatedAt: data.updated_at ? new Date(String(data.updated_at)).getTime() : undefined,
  };
}

export async function fetchLegalPage(slug: LegalPageSlug): Promise<LegalPageContent | null> {
  if (!USE_SUPABASE || !hasSupabaseConfig()) return null;
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from(COLLECTION)
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data ? fromDoc(slug, data as Record<string, unknown>) : null;
}

export function subscribeLegalPage(
  slug: LegalPageSlug,
  cb: (page: LegalPageContent | null) => void,
) {
  if (!USE_SUPABASE || !hasSupabaseConfig()) {
    cb(null);
    return () => {};
  }
  const supabase = getSupabaseBrowserClient();
  let active = true;
  const load = async () => {
    const page = await fetchLegalPage(slug);
    if (active) cb(page);
  };
  load().catch((err) => console.error(`[legal_pages/${slug}] Supabase 讀取失敗：`, err.message));
  const channel = supabase
    .channel(`public:legal_pages:${slug}`)
    .on("postgres_changes", { event: "*", schema: "public", table: COLLECTION }, () => {
      void load().catch(() => {});
    })
    .subscribe();
  return () => {
    active = false;
    void supabase.removeChannel(channel);
  };
}

export async function saveLegalPage(content: LegalPageContent): Promise<void> {
  if (!USE_SUPABASE || !hasSupabaseConfig()) throw new Error("法務頁面管理需要 Supabase 設定");
  const payload = {
    slug: content.slug,
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
    last_updated: content.lastUpdated,
    updated_at: new Date().toISOString(),
  };
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from(COLLECTION).upsert(payload);
  if (error) throw error;
}
