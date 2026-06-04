import { NextResponse } from "next/server";
import { SUPER_ADMIN_EMAILS } from "@/lib/config";
import { getAdminAuth } from "@/lib/firebaseAdmin";
import { getSupabaseServiceClient } from "@/lib/supabase";
import { deleteRedisConversation } from "@/lib/upstashChat";

export const runtime = "nodejs";

type MatchRow = {
  id: string;
  title: string;
  owner_uid: string;
  owner_nickname: string;
  city: string;
  district: string;
  venue: string;
  date: string;
  start_time: string;
  end_time: string;
  status: "open" | "closed" | "cancelled";
  is_deleted: boolean;
  applicant_count?: number;
};

async function verifyFirebaseTokenWithRest(token: string) {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) throw new Error("Missing NEXT_PUBLIC_FIREBASE_API_KEY");
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken: token }),
  });
  if (!response.ok) throw new Error(`Firebase Auth REST failed: ${response.status}`);
  const data = (await response.json()) as { users?: Array<{ localId?: string; email?: string }> };
  const user = data.users?.[0];
  if (!user?.localId) throw new Error("Firebase Auth REST returned no user");
  return { uid: user.localId, email: user.email ?? "" };
}

async function verifyUser(request: Request) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return { ok: false as const, status: 401, error: "Missing token" };
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    return { ok: true as const, uid: decoded.uid, email: decoded.email ?? "" };
  } catch {
    try {
      return { ok: true as const, ...(await verifyFirebaseTokenWithRest(token)) };
    } catch {
      return { ok: false as const, status: 401, error: "Invalid token" };
    }
  }
}

async function isAdmin(uid: string, email: string) {
  const normalized = email.trim().toLowerCase();
  if (SUPER_ADMIN_EMAILS.map((item) => item.toLowerCase()).includes(normalized)) return true;
  const supabase = getSupabaseServiceClient();
  const { data } = await supabase
    .from("users")
    .select("role")
    .eq("uid", uid)
    .eq("is_deleted", false)
    .maybeSingle();
  return data?.role === "admin";
}

async function requireAdmin(request: Request) {
  const auth = await verifyUser(request);
  if (!auth.ok) return auth;
  if (!(await isAdmin(auth.uid, auth.email))) {
    return { ok: false as const, status: 403, error: "Forbidden" };
  }
  return auth;
}

function isMissingMatchesTable(error: { message?: string; code?: string } | null) {
  return Boolean(
    error &&
      (error.code === "PGRST205" ||
        /Could not find the table 'public\\.(matches|match_applications)'|relation .*matches.* does not exist/i.test(
          error.message ?? "",
        )),
  );
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const supabase = getSupabaseServiceClient();
  const [{ data: matches, error: matchesError }, { data: applications, error: appsError }] =
    await Promise.all([
      supabase
        .from("matches")
        .select("id,title,owner_uid,owner_nickname,city,district,venue,date,start_time,end_time,status,is_deleted")
        .order("created_at", { ascending: false }),
      supabase
        .from("match_applications")
        .select("match_id")
        .eq("is_deleted", false),
    ]);

  if (isMissingMatchesTable(matchesError) || isMissingMatchesTable(appsError)) {
    return NextResponse.json(
      { error: "Supabase matches tables are missing. Apply supabase/migrations/0005_add_matches_tables.sql first." },
      { status: 503 },
    );
  }
  if (matchesError) return NextResponse.json({ error: matchesError.message }, { status: 500 });
  if (appsError) return NextResponse.json({ error: appsError.message }, { status: 500 });

  const counts = new Map<string, number>();
  for (const app of applications ?? []) {
    const matchId = String((app as { match_id?: string }).match_id ?? "");
    if (matchId) counts.set(matchId, (counts.get(matchId) ?? 0) + 1);
  }

  return NextResponse.json({
    matches: ((matches ?? []) as MatchRow[]).map((match) => ({
      id: match.id,
      title: match.title,
      ownerNickname: match.owner_nickname,
      city: match.city,
      district: match.district,
      venue: match.venue,
      date: match.date,
      startTime: match.start_time,
      endTime: match.end_time,
      status: match.status,
      isDeleted: Boolean(match.is_deleted),
      applicantCount: counts.get(match.id) ?? 0,
    })),
  });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = (await request.json().catch(() => ({}))) as {
    matchId?: string;
    status?: "open" | "closed" | "cancelled";
  };
  if (!body.matchId || !body.status) {
    return NextResponse.json({ error: "Missing matchId or status" }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();
  const { error } = await supabase
    .from("matches")
    .update({ status: body.status, updated_at: new Date().toISOString() })
    .eq("id", body.matchId);

  if (isMissingMatchesTable(error)) {
    return NextResponse.json(
      { error: "Supabase matches table is missing. Apply supabase/migrations/0005_add_matches_tables.sql first." },
      { status: 503 },
    );
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url = new URL(request.url);
  const matchId = url.searchParams.get("matchId")?.trim();
  if (!matchId) return NextResponse.json({ error: "Missing matchId" }, { status: 400 });

  const supabase = getSupabaseServiceClient();
  const { error } = await supabase
    .from("matches")
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", matchId);

  if (isMissingMatchesTable(error)) {
    return NextResponse.json(
      { error: "Supabase matches table is missing. Apply supabase/migrations/0005_add_matches_tables.sql first." },
      { status: 503 },
    );
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await deleteRedisConversation(`match_${matchId}`).catch(() => undefined);
  return NextResponse.json({ ok: true });
}
