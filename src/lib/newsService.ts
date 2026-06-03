import { db } from "./firebase";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  serverTimestamp,
  orderBy,
  query,
} from "firebase/firestore";
import type { NewsArticle } from "@/data/news";
import { uploadDataUrlImage, uploadImageFile } from "./uploadMedia";
import { ENABLE_SUPABASE_NEWS, USE_SUPABASE } from "./config";
import { getSupabaseBrowserClient, hasSupabaseConfig } from "./supabase";

function toNewsArticle(id: string, data: Record<string, unknown>): NewsArticle {
  const publishedAt =
    typeof data.publishedAt === "string"
      ? data.publishedAt
      : data.publishedAt && typeof (data.publishedAt as { toDate?: () => Date }).toDate === "function"
        ? (data.publishedAt as { toDate: () => Date }).toDate().toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10);

  return {
    id,
    title: String(data.title ?? ""),
    slug: String(data.slug ?? id),
    category: (data.category as NewsArticle["category"]) ?? "賽事",
    coverImage: String(data.coverImageUrl ?? data.coverImage ?? ""),
    excerpt: String(data.excerpt ?? ""),
    content: String(data.content ?? ""),
    publishedAt,
    isPublished: Boolean(data.isPublished),
    author: String(data.author ?? "JoJo Tennis 編輯部"),
  };
}

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

function subscribeToFirestoreNews(cb: (articles: NewsArticle[]) => void) {
  return onSnapshot(
    query(collection(db, "news"), orderBy("publishedAt", "desc")),
    (snap) => {
      cb(snap.docs.map((d) => toNewsArticle(d.id, d.data() as Record<string, unknown>)));
    },
    () => cb([]),
  );
}

export function subscribeToNews(cb: (articles: NewsArticle[]) => void) {
  if (USE_SUPABASE && ENABLE_SUPABASE_NEWS && hasSupabaseConfig()) {
    const supabase = getSupabaseBrowserClient();
    let active = true;
    let fallbackUnsub: (() => void) | null = null;

    fetchSupabaseNews()
      .then((articles) => {
        if (active) cb(articles);
      })
      .catch((err) => {
        console.warn("[news] Supabase 讀取失敗，改用 Firebase：", err.message);
        if (active) {
          cb([]);
          fallbackUnsub = subscribeToFirestoreNews(cb);
        }
      });

    const channel = supabase
      .channel(createRealtimeChannelName())
      .on("postgres_changes", { event: "*", schema: "public", table: "news" }, () => {
        if (fallbackUnsub) return;
        fetchSupabaseNews()
          .then((articles) => {
            if (active) cb(articles);
          })
          .catch((err) => console.error("[news] Supabase realtime 更新失敗：", err.message));
      })
      .subscribe();

    return () => {
      active = false;
      fallbackUnsub?.();
      void supabase.removeChannel(channel);
    };
  }

  return subscribeToFirestoreNews(cb);
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

  const payload = {
    newsId: article.id,
    title: article.title,
    slug: article.slug,
    category: article.category,
    content: article.content,
    excerpt: article.excerpt,
    coverImageUrl,
    coverImage: coverImageUrl,
    isPublished: article.isPublished,
    publishedAt: article.publishedAt,
    author: article.author,
    isDeleted: false,
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  };

  await setDoc(doc(db, "news", article.id), payload, { merge: true });
  return { ...article, coverImage: coverImageUrl };
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

  await deleteDoc(doc(db, "news", articleId));
}
