import { NextResponse } from "next/server";
import { getSupabaseServiceClient, hasSupabaseConfig } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!hasSupabaseConfig() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ ok: false, error: "Supabase service role not configured" }, { status: 503 });
  }

  const body = (await request.json()) as { uid?: string; token?: string; device?: string };
  if (!body.uid || !body.token) {
    return NextResponse.json({ error: "Missing uid or token" }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();
  const { error } = await supabase.from("fcm_tokens").upsert({
    uid: body.uid,
    token: body.token,
    device: body.device ?? "",
    last_seen_at: new Date().toISOString(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
