import { NextResponse } from "next/server";
import { getSupabaseServiceClient, hasSupabaseConfig } from "@/lib/supabase";

export const runtime = "nodejs";

function isMissingAttendanceTable(error: { message?: string; code?: string } | null) {
  return Boolean(
    error &&
      (error.code === "PGRST205" ||
        /Could not find the table 'public\.match_attendance_obligations'|relation .*match_attendance_obligations.* does not exist/i.test(
          error.message ?? "",
        )),
  );
}

export async function POST(request: Request) {
  const secret = request.headers.get("x-cron-secret");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasSupabaseConfig() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ updated: 0, skipped: true });
  }

  const supabase = getSupabaseServiceClient();
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("match_attendance_obligations")
    .update({
      status: "attended",
      auto_filled: true,
      evaluated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("status", "pending")
    .lt("match_date", cutoff)
    .select("match_id");

  if (isMissingAttendanceTable(error)) {
    return NextResponse.json({ updated: 0, skipped: true, reason: "missing table" });
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ updated: data?.length ?? 0 });
}
