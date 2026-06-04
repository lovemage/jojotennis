export type SeedResult = {
  courts: number;
  clubs: number;
  coaches: number;
  skipped: boolean;
};

/** 舊 Firestore seed 已停用；資料請透過 Supabase migration 或後台表單建立。 */
export async function seedFirestoreIfEmpty(): Promise<SeedResult> {
  return { courts: 0, clubs: 0, coaches: 0, skipped: true };
}
