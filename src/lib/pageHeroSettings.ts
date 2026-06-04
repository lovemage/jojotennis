import { USE_SUPABASE } from "./config";
import { getOptimizedCloudinaryUrl } from "./cloudinaryUrl";
import { getSupabaseBrowserClient, hasSupabaseConfig } from "./supabase";

export type PageHeroKey =
  | "match"
  | "buddies"
  | "courts"
  | "coach"
  | "coachRegister"
  | "studentNeed"
  | "reviews"
  | "news"
  | "clubs";

export type PageHeroSetting = {
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  publicId?: string;
};

export type PageHeroAdminItem = {
  key: PageHeroKey;
  label: string;
  href: string;
};

const STORAGE_KEY = "jojo-page-hero-settings";

export const PAGE_HERO_ADMIN_ITEMS: PageHeroAdminItem[] = [
  { key: "match", label: "揪球友", href: "/match" },
  { key: "buddies", label: "球友列表", href: "/buddies" },
  { key: "courts", label: "找球場", href: "/courts" },
  { key: "coach", label: "找教練", href: "/coach" },
  { key: "coachRegister", label: "教練申請", href: "/coach/register" },
  { key: "studentNeed", label: "學習需求", href: "/coach/post" },
  { key: "reviews", label: "球具評測", href: "/reviews" },
  { key: "news", label: "網球新聞", href: "/news" },
  { key: "clubs", label: "社團", href: "/club" },
];

export const DEFAULT_PAGE_HEROES: Record<PageHeroKey, PageHeroSetting> = {
  match: {
    eyebrow: "Match",
    title: "揪球友",
    description: "用等級、地點和可打時間找到合適的球友，讓臨打和固定練球更容易。",
    image: "/images/hero/match.png",
  },
  buddies: {
    eyebrow: "Buddies",
    title: "球友列表",
    description: "找線上活躍的球友、發私訊揪球",
    image: "",
  },
  courts: {
    eyebrow: "Courts",
    title: "找球場",
    description: "搜尋全台網球場，一鍵查詢場地資訊與預約方式。",
    image: "/images/hero/courts.png",
  },
  coach: {
    eyebrow: "Coach",
    title: "找到屬於你的網球教練",
    description: "依等級、地區、費用篩選，直接透過站內私訊聯繫教練",
    image: "/images/hero/coach.png",
  },
  coachRegister: {
    eyebrow: "Coach Register",
    title: "申請成為平台教練",
    description: "填寫個人與身分驗證資料，由管理員審核通過後即會刊登在「找教練」列表。",
    image: "/images/hero/coach-register.png",
  },
  studentNeed: {
    eyebrow: "Student Need",
    title: "發布學習需求",
    description: "讓教練了解你的程度、預算與學習目標。",
    image: "",
  },
  reviews: {
    eyebrow: "Reviews",
    title: "球具評測",
    description: "球拍、球線、球鞋與配件實測，幫你找到適合自己的裝備。",
    image: "/images/hero/reviews.png",
  },
  news: {
    eyebrow: "News",
    title: "網球新聞 & 活動",
    description: "賽事快訊・品牌活動・新品上市，掌握台灣與國際網球消息。",
    image: "/images/hero/news.png",
  },
  clubs: {
    eyebrow: "Clubs",
    title: "社團",
    description: "探索地區社團、固定團練與球隊資訊，找到長期一起打球的夥伴。",
    image: "",
  },
};

function normalizeSetting(key: PageHeroKey, input: unknown): PageHeroSetting {
  const fallback = DEFAULT_PAGE_HEROES[key];
  if (!input || typeof input !== "object") return fallback;

  const row = input as Partial<Record<keyof PageHeroSetting, unknown>>;
  const publicId = typeof row.publicId === "string" ? row.publicId : "";
  const image =
    typeof row.image === "string"
      ? row.image
      : publicId
        ? getOptimizedCloudinaryUrl(publicId, { width: 1200, format: "webp" })
        : fallback.image;

  return {
    eyebrow: typeof row.eyebrow === "string" ? row.eyebrow : fallback.eyebrow,
    title: typeof row.title === "string" && row.title.trim() ? row.title : fallback.title,
    description:
      typeof row.description === "string" && row.description.trim()
        ? row.description
        : fallback.description,
    image,
    publicId: publicId || undefined,
  };
}

function normalizeSettings(input: unknown): Record<PageHeroKey, PageHeroSetting> {
  const source =
    input && typeof input === "object" && "pages" in input
      ? (input as { pages?: unknown }).pages
      : input;
  const rows = source && typeof source === "object" ? (source as Record<string, unknown>) : {};

  return PAGE_HERO_ADMIN_ITEMS.reduce(
    (acc, item) => {
      acc[item.key] = normalizeSetting(item.key, rows[item.key]);
      return acc;
    },
    {} as Record<PageHeroKey, PageHeroSetting>,
  );
}

function readLocalPageHeroes() {
  if (typeof window === "undefined") return DEFAULT_PAGE_HEROES;
  try {
    return normalizeSettings(JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}"));
  } catch {
    return DEFAULT_PAGE_HEROES;
  }
}

export function subscribePageHeroSettings(
  cb: (settings: Record<PageHeroKey, PageHeroSetting>) => void,
) {
  if (USE_SUPABASE && hasSupabaseConfig()) {
    const supabase = getSupabaseBrowserClient();
    let active = true;
    const load = async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "page_heroes")
        .maybeSingle();
      if (error) throw error;
      if (active) cb(normalizeSettings((data as { value?: unknown } | null)?.value));
    };
    load().catch(() => {
      if (active) cb(readLocalPageHeroes());
    });
    const channel = supabase
      .channel("public:site_settings:page_heroes")
      .on("postgres_changes", { event: "*", schema: "public", table: "site_settings" }, () => {
        void load().catch(() => {});
      })
      .subscribe();
    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }

  cb(readLocalPageHeroes());
  return () => {};
}

export async function savePageHeroSettings(settings: Record<PageHeroKey, PageHeroSetting>) {
  const normalized = normalizeSettings(settings);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  }

  if (USE_SUPABASE && hasSupabaseConfig()) {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase
      .from("site_settings")
      .upsert({ key: "page_heroes", value: { pages: normalized }, updated_at: new Date().toISOString() });
    if (error) throw error;
  }

  return normalized;
}

export async function savePageHeroSetting(key: PageHeroKey, setting: PageHeroSetting) {
  const current = readLocalPageHeroes();
  return savePageHeroSettings({ ...current, [key]: normalizeSetting(key, setting) });
}
