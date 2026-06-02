import { NextResponse } from "next/server";
import { getSupabaseServiceClient, hasSupabaseConfig } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const raw = await request.text();
  const event = JSON.parse(raw) as { type?: string; data?: { email_id?: string; to?: string[] } };

  if (hasSupabaseConfig() && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const supabase = getSupabaseServiceClient();
    if (event.type === "email.bounced" || event.type === "email.complained") {
      await supabase
        .from("email_log")
        .update({ status: event.type === "email.bounced" ? "bounced" : "complained" })
        .eq("resend_id", event.data?.email_id ?? "");
    }
  }

  return NextResponse.json({ ok: true });
}
