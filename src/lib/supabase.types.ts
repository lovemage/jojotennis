export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type CourtImage = {
  publicId: string;
  caption?: string;
  sortOrder: number;
};

export type EquipmentReview = {
  id: string;
  title: string;
  slug: string;
  category: string;
  brand: string;
  model: string;
  coverImagePublicId?: string | null;
  coverImageUrl: string;
  gallery: CourtImage[];
  contentMd: string;
  authorUid?: string | null;
  authorName: string;
  isPublished: boolean;
  publishedAt?: string | null;
  viewCount: number;
  createdAt?: string;
  updatedAt?: string;
};

export type AttendanceStats = {
  obligationCount: number;
  attendedCount: number;
  attendanceRate: number;
  averageStars: number | null;
};
