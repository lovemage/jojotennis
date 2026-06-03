import { getSupabaseBrowserClient, hasSupabaseConfig } from "./supabase";
import type { AttendanceStats } from "./supabase.types";

export function computeBayesianRate(attendedCount: number, obligationCount: number) {
  return (attendedCount + 3) / (obligationCount + 4);
}

export async function submitReview(input: {
  matchId: string;
  matchDate: string;
  reviewerUid: string;
  revieweeUid: string;
  direction: "host_to_player" | "player_to_host";
  attended?: boolean;
  excused?: boolean;
  stars: number;
  comment?: string;
}) {
  if (!hasSupabaseConfig()) throw new Error("尚未設定 Supabase");
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("match_reviews").insert({
    match_id: input.matchId,
    match_date: input.matchDate,
    reviewer_uid: input.reviewerUid,
    reviewee_uid: input.revieweeUid,
    direction: input.direction,
    attended: input.attended ?? true,
    excused: input.excused ?? false,
    stars: input.stars,
    comment: input.comment?.slice(0, 300) ?? "",
  });
  if (error) throw error;
}

export async function getAttendanceStats(uid: string): Promise<AttendanceStats> {
  const emptyStats = {
    obligationCount: 0,
    attendedCount: 0,
    attendanceRate: computeBayesianRate(0, 0),
    averageStars: null,
  };

  if (!hasSupabaseConfig()) {
    return emptyStats;
  }

  const supabase = getSupabaseBrowserClient();
  const [{ data: obligations, error: obligationsError }, { data: reviews, error: reviewsError }] = await Promise.all([
    supabase
      .from("match_attendance_obligations")
      .select("status")
      .eq("participant_uid", uid)
      .not("status", "in", '("cancelled","host_cancelled","early_withdrawn")'),
    supabase.from("match_reviews").select("stars").eq("reviewee_uid", uid).not("stars", "is", null),
  ]);

  if (obligationsError || reviewsError) {
    console.warn(
      "[reviews] Supabase attendance stats unavailable:",
      obligationsError?.message ?? reviewsError?.message,
    );
    return emptyStats;
  }

  const obligationCount = obligations?.length ?? 0;
  const attendedCount = obligations?.filter((row) => row.status === "attended").length ?? 0;
  const starValues = (reviews ?? []).map((row) => Number(row.stars)).filter(Number.isFinite);
  const averageStars =
    starValues.length > 0 ? starValues.reduce((sum, value) => sum + value, 0) / starValues.length : null;

  return {
    obligationCount,
    attendedCount,
    attendanceRate: computeBayesianRate(attendedCount, obligationCount),
    averageStars,
  };
}
