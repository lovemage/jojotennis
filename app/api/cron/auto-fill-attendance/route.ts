import { NextResponse } from "next/server";
import { getSupabaseServiceClient, hasSupabaseConfig } from "@/lib/supabase";

export const runtime = "nodejs";

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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase
    .from("fcm_tokens")
    .delete()
    .lt("last_seen_at", new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString());

  return NextResponse.json({ updated: data?.length ?? 0 });
}
