import { getSupabaseBrowserClient, hasSupabaseConfig } from "./supabase";
import type { EquipmentReview } from "./supabase.types";
import { getOptimizedCloudinaryUrl } from "./cloudinaryUrl";
import { seedEquipmentReviews } from "@/data/equipmentReviews";

type ReviewRow = Record<string, unknown>;

function toReview(row: ReviewRow): EquipmentReview {
  const coverPublicId = row.cover_image_public_id ? String(row.cover_image_public_id) : null;
  return {
    id: String(row.id ?? ""),
    title: String(row.title ?? ""),
    slug: String(row.slug ?? row.id ?? ""),
    category: String(row.category ?? "球拍"),
    brand: String(row.brand ?? ""),
    model: String(row.model ?? ""),
    coverImagePublicId: coverPublicId,
    coverImageUrl:
      String(row.cover_image_url ?? "") ||
      getOptimizedCloudinaryUrl(coverPublicId, { width: 1200 }),
    gallery: Array.isArray(row.gallery) ? (row.gallery as EquipmentReview["gallery"]) : [],
    contentMd: String(row.content_md ?? ""),
    authorUid: row.author_uid ? String(row.author_uid) : null,
    authorName: String(row.author_name ?? "JoJo Tennis 編輯部"),
    isPublished: Boolean(row.is_published),
    publishedAt: row.published_at ? String(row.published_at) : null,
    viewCount: Number(row.view_count ?? 0),
    createdAt: row.created_at ? String(row.created_at) : undefined,
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  };
}

export async function fetchEquipmentReviews(options: { includeDrafts?: boolean } = {}) {
  if (!hasSupabaseConfig()) {
    return options.includeDrafts ? seedEquipmentReviews : seedEquipmentReviews.filter((review) => review.isPublished);
  }

  const supabase = getSupabaseBrowserClient();
  let query = supabase
    .from("equipment_reviews")
    .select("*")
    .eq("is_deleted", false)
    .order("published_at", { ascending: false, nullsFirst: false });

  if (!options.includeDrafts) query = query.eq("is_published", true);

  const { data, error } = await query;
  if (error) {
    console.error("[reviews] Supabase 讀取失敗：", error.message);
    return options.includeDrafts ? [] : seedEquipmentReviews.filter((review) => review.isPublished);
  }
  const reviews = (data ?? []).map((row) => toReview(row as ReviewRow));
  if (reviews.length > 0) return reviews;
  return options.includeDrafts ? [] : seedEquipmentReviews.filter((review) => review.isPublished);
}

export async function fetchEquipmentReviewBySlug(slug: string) {
  if (!hasSupabaseConfig()) {
    return seedEquipmentReviews.find((review) => review.slug === slug && review.isPublished) ?? null;
  }

  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("equipment_reviews")
    .select("*")
    .eq("slug", slug)
    .eq("is_deleted", false)
    .maybeSingle();

  if (error) {
    console.error("[review] Supabase 讀取失敗：", error.message);
    return seedEquipmentReviews.find((review) => review.slug === slug && review.isPublished) ?? null;
  }
  return data
    ? toReview(data as ReviewRow)
    : seedEquipmentReviews.find((review) => review.slug === slug && review.isPublished) ?? null;
}

export async function saveEquipmentReview(input: Partial<EquipmentReview> & { title: string; slug: string }) {
  if (!hasSupabaseConfig()) {
    throw new Error("尚未設定 Supabase 環境變數");
  }

  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("equipment_reviews")
    .upsert({
      id: input.id,
      title: input.title,
      slug: input.slug,
      category: input.category ?? "球拍",
      brand: input.brand ?? "",
      model: input.model ?? "",
      cover_image_public_id: input.coverImagePublicId ?? null,
      cover_image_url: input.coverImageUrl ?? "",
      gallery: input.gallery ?? [],
      content_md: input.contentMd ?? "",
      author_uid: input.authorUid ?? null,
      author_name: input.authorName ?? "JoJo Tennis 編輯部",
      is_published: input.isPublished ?? false,
      published_at: input.isPublished ? input.publishedAt ?? new Date().toISOString() : null,
      is_deleted: false,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) throw error;
  return toReview(data as ReviewRow);
}

export async function deleteEquipmentReview(id: string) {
  if (!hasSupabaseConfig()) return;

  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("equipment_reviews")
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;
}
