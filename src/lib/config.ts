/** Firebase 目前保留 Auth；資料層會逐步移到 Supabase。 */
export const USE_FIREBASE = true;
export const USE_SUPABASE = process.env.NEXT_PUBLIC_USE_SUPABASE !== "false";
export const ENABLE_SUPABASE_NEWS = process.env.NEXT_PUBLIC_ENABLE_SUPABASE_NEWS === "true";
export const ENABLE_SUPABASE_REVIEWS = process.env.NEXT_PUBLIC_ENABLE_SUPABASE_REVIEWS === "true";

export const SUPER_ADMIN_EMAILS = ["sasabrinalu@gmail.com", "test@gmail.com"];
