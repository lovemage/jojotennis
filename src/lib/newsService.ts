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

export function subscribeToNews(cb: (articles: NewsArticle[]) => void) {
  return onSnapshot(
    query(collection(db, "news"), orderBy("publishedAt", "desc")),
    (snap) => {
      cb(snap.docs.map((d) => toNewsArticle(d.id, d.data() as Record<string, unknown>)));
    },
    () => cb([]),
  );
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
  await deleteDoc(doc(db, "news", articleId));
}
