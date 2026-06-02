import { NextResponse } from "next/server";
import { getSupabaseServiceClient, hasSupabaseConfig } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!hasSupabaseConfig() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ ok: true });
  }
  const body = (await request.json()) as { token?: string };
  if (!body.token) return NextResponse.json({ ok: true });

  const supabase = getSupabaseServiceClient();
  await supabase.from("fcm_tokens").delete().eq("token", body.token);
  return NextResponse.json({ ok: true });
}
