import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSupabaseServiceClient, hasSupabaseConfig } from "@/lib/supabase";
import { LINE_SESSION_COOKIE, verifyLineSessionToken } from "@/lib/lineSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toSchemaUserFromSupabase(row: Record<string, unknown>) {
  return {
    uid: String(row.uid ?? ""),
    email: String(row.email ?? ""),
    nickname: String(row.nickname ?? "新球友"),
    provider: "line",
    emailVerified: Boolean(row.email_verified ?? false),
    emailVerificationSentAt: row.email_verification_sent_at
      ? new Date(String(row.email_verification_sent_at)).toISOString()
      : null,
    ntrp: String(row.ntrp ?? "2.0"),
    region: String(row.region ?? "台北市"),
    yearsPlaying: Number(row.years_playing ?? 0),
    avatarUrl: String(row.avatar_url ?? ""),
    role: String(row.role ?? "user"),
    isActive: row.is_active !== false,
    heartsReceived: Number(row.hearts_received ?? 0),
    bio: String(row.bio ?? ""),
    isDeleted: Boolean(row.is_deleted ?? false),
    deletedAt: row.deleted_at ? new Date(String(row.deleted_at)).toISOString() : null,
    createdAt: row.created_at ? new Date(String(row.created_at)).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(String(row.updated_at)).toISOString() : new Date().toISOString(),
  };
}

export async function GET() {
  const session = verifyLineSessionToken(cookies().get(LINE_SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ user: null }, { status: 401 });
  if (!hasSupabaseConfig() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Missing Supabase server config" }, { status: 500 });
  }

  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("uid", session.uid)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ user: null }, { status: 404 });
  return NextResponse.json({ user: toSchemaUserFromSupabase(data as Record<string, unknown>) });
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(LINE_SESSION_COOKIE);
  return response;
}
