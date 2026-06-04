import type { NewsArticle } from "@/data/news";
import { uploadDataUrlImage, uploadImageFile } from "./uploadMedia";
import { ENABLE_SUPABASE_NEWS, USE_SUPABASE } from "./config";
import { getSupabaseBrowserClient, hasSupabaseConfig } from "./supabase";

function toNewsArticleFromSupabase(row: Record<string, unknown>): NewsArticle {
  return {
    id: String(row.id ?? ""),
    title: String(row.title ?? ""),
    slug: String(row.slug ?? row.id ?? ""),
    category: (row.category as NewsArticle["category"]) ?? "賽事",
    coverImage: String(row.cover_image_url ?? ""),
    excerpt: String(row.excerpt ?? ""),
    content: String(row.content ?? ""),
    publishedAt: String(row.published_at ?? new Date().toISOString().slice(0, 10)),
    isPublished: Boolean(row.is_published),
    author: String(row.author ?? "JoJo Tennis 編輯部"),
  };
}

function createRealtimeChannelName() {
  return `public:news:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}

async function fetchSupabaseNews() {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("news")
    .select("*")
    .eq("is_deleted", false)
    .order("published_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => toNewsArticleFromSupabase(row as Record<string, unknown>));
}

export function subscribeToNews(cb: (articles: NewsArticle[]) => void) {
  if (USE_SUPABASE && ENABLE_SUPABASE_NEWS && hasSupabaseConfig()) {
    const supabase = getSupabaseBrowserClient();
    let active = true;

    fetchSupabaseNews()
      .then((articles) => {
        if (active) cb(articles);
      })
      .catch((err) => {
        console.error("[news] Supabase 讀取失敗：", err.message);
        if (active) cb([]);
      });

    const channel = supabase
      .channel(createRealtimeChannelName())
      .on("postgres_changes", { event: "*", schema: "public", table: "news" }, () => {
        fetchSupabaseNews()
          .then((articles) => {
            if (active) cb(articles);
          })
          .catch((err) => console.error("[news] Supabase realtime 更新失敗：", err.message));
      })
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }

  cb([]);
  return () => {};
}

export async function saveNewsArticle(
  article: NewsArticle,
  coverFile?: File,
): Promise<NewsArticle> {
  let coverImageUrl = article.coverImage;
  if (coverFile) {
    coverImageUrl = await uploadImageFile(coverFile, `news/${article.id}/cover.jpg`);
  } else if (coverImageUrl.startsWith("data:image")) {
    coverImageUrl = await uploadDataUrlImage(coverImageUrl, `news/${article.id}/cover.jpg`);
  }

  if (USE_SUPABASE && hasSupabaseConfig()) {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.from("news").upsert({
      id: article.id,
      title: article.title,
      slug: article.slug,
      category: article.category,
      content: article.content,
      excerpt: article.excerpt,
      cover_image_url: coverImageUrl,
      is_published: article.isPublished,
      published_at: article.publishedAt,
      author: article.author,
      is_deleted: false,
      deleted_at: null,
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;
    return { ...article, coverImage: coverImageUrl };
  }

  throw new Error("新聞管理需要 Supabase 設定");
}

export async function deleteNewsArticle(articleId: string) {
  if (USE_SUPABASE && hasSupabaseConfig()) {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase
      .from("news")
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", articleId);

    if (error) throw error;
    return;
  }

  throw new Error("新聞刪除需要 Supabase 設定");
}
