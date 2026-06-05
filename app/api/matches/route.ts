import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminAuth } from "@/lib/firebaseAdmin";
import { getSupabaseServiceClient } from "@/lib/supabase";
import { LINE_SESSION_COOKIE, verifyLineSessionToken } from "@/lib/lineSession";
import {
  addRedisConversationParticipant,
  appendRedisChatMessage,
  deleteRedisConversation,
  removeRedisConversationParticipant,
  updateRedisConversationAfterMessage,
  upsertRedisConversation,
} from "@/lib/upstashChat";
import { isTimeRangeValid, weekdayLabel } from "@/lib/timeUtils";
import type { MatchJoinMode } from "@/lib/schema";

export const runtime = "nodejs";

function isAblyChatMode() {
  return (process.env.NEXT_PUBLIC_CHAT_REALTIME_PROVIDER ?? "ably") === "ably";
}

type MatchStatus = "open" | "closed" | "cancelled";
type AppStatus = "pending" | "accepted" | "declined" | "removed";

type MatchRow = {
  id: string;
  owner_uid: string;
  owner_nickname: string;
  title: string;
  city: string;
  district: string;
  venue: string;
  date: string;
  weekday: string;
  start_time: string;
  end_time: string;
  ntrp_required: string[] | null;
  total_slots: number;
  filled_slots: number;
  status: MatchStatus;
  note: string | null;
  join_mode: MatchJoinMode | null;
  join_code: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

type AppRow = {
  id: string;
  match_id: string;
  applicant_uid: string;
  applicant_nickname: string;
  status: AppStatus;
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

function mapMatch(row: MatchRow) {
  return {
    matchId: row.id,
    ownerUid: row.owner_uid,
    ownerNickname: row.owner_nickname,
    title: row.title,
    city: row.city,
    district: row.district,
    venue: row.venue,
    date: row.date,
    weekday: row.weekday,
    startTime: row.start_time,
    endTime: row.end_time,
    ntrpRequired: row.ntrp_required ?? [],
    totalSlots: row.total_slots,
    filledSlots: row.filled_slots,
    status: row.status,
    note: row.note ?? "",
    joinMode: row.join_mode ?? "approval",
    joinCode: row.join_code ?? undefined,
    isDeleted: row.is_deleted,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapApplication(row: AppRow) {
  return {
    appId: row.id,
    matchId: row.match_id,
    applicantUid: row.applicant_uid,
    applicantNickname: row.applicant_nickname,
    status: row.status,
    isDeleted: row.is_deleted,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

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
  if (!token) {
    const lineSession = verifyLineSessionToken(cookies().get(LINE_SESSION_COOKIE)?.value);
    if (lineSession) return { ok: true as const, uid: lineSession.uid, email: lineSession.email };
    return { ok: false as const, status: 401, error: "Missing token" };
  }
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

async function getOptionalUser(request: Request) {
  const header = request.headers.get("authorization") || "";
  if (!header.startsWith("Bearer ")) return null;
  const auth = await verifyUser(request);
  return auth.ok ? auth : null;
}

function generateJoinCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function addSystemMessage(conversationId: string, content: string) {
  if (isAblyChatMode()) return;
  try {
    await appendRedisChatMessage(conversationId, {
      msgId: `sys-${Date.now()}-${crypto.randomUUID()}`,
      senderUid: "system",
      senderNickname: "揪揪網球",
      content,
      msgType: "system",
      readBy: [],
      createdAt: Date.now(),
    });
    await updateRedisConversationAfterMessage(conversationId, "system", "揪揪網球", content);
  } catch (error) {
    console.warn("[matches] system message skipped:", error);
  }
}

async function addChatParticipant(conversationId: string, uid: string) {
  if (isAblyChatMode()) return;
  await addRedisConversationParticipant(conversationId, uid).catch((error) =>
    console.warn("[matches] add chat participant skipped:", error),
  );
}

async function removeChatParticipant(conversationId: string, uid: string) {
  if (isAblyChatMode()) return;
  await removeRedisConversationParticipant(conversationId, uid).catch((error) =>
    console.warn("[matches] remove chat participant skipped:", error),
  );
}

async function deleteChatConversation(conversationId: string) {
  if (isAblyChatMode()) return;
  await deleteRedisConversation(conversationId).catch((error) =>
    console.warn("[matches] delete chat conversation skipped:", error),
  );
}

async function getMatch(matchId: string) {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .eq("id", matchId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as MatchRow | null;
}

async function listApplications(matchId: string) {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("match_applications")
    .select("*")
    .eq("match_id", matchId)
    .eq("is_deleted", false);
  if (error) throw new Error(error.message);
  return (data ?? []) as AppRow[];
}

async function recalculateMatchFill(matchId: string) {
  const supabase = getSupabaseServiceClient();
  const apps = await listApplications(matchId);
  const acceptedCount = apps.filter((app) => app.status === "accepted").length;
  const match = await getMatch(matchId);
  if (!match) return acceptedCount;
  await supabase
    .from("matches")
    .update({
      filled_slots: acceptedCount,
      status: acceptedCount >= match.total_slots ? "closed" : "open",
      updated_at: new Date().toISOString(),
    })
    .eq("id", matchId);
  return acceptedCount;
}

type MatchJoinResult = {
  ok?: boolean;
  msg?: string;
  acceptedCount?: number;
  isFull?: boolean;
};

async function ensureOwner(matchId: string, uid: string) {
  const match = await getMatch(matchId);
  if (!match || match.is_deleted) throw new Error("球局不存在");
  if (match.owner_uid !== uid) throw new Error("只有主揪可以操作此球局");
  return match;
}

async function joinAccepted(match: MatchRow, uid: string, nickname: string) {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase.rpc("match_join_accepted", {
    p_match_id: match.id,
    p_uid: uid,
    p_nickname: nickname,
  });
  if (error) throw new Error(error.message);
  const result = (data ?? {}) as MatchJoinResult;
  if (!result.ok) return { ok: false, msg: result.msg ?? "加入球局失敗" };

  await addChatParticipant(`match_${match.id}`, uid);
  await addSystemMessage(`match_${match.id}`, `${nickname} 已加入球局！`);
  if (result.isFull) {
    await addSystemMessage(`match_${match.id}`, `「${match.title}」招募完成！祝大家打球愉快`);
  }
  return { ok: true, msg: result.msg ?? "已成功加入球局" };
}

export async function GET(request: Request) {
  const auth = await getOptionalUser(request);
  const supabase = getSupabaseServiceClient();
  const { data: matches, error: matchError } = await supabase
    .from("matches")
    .select("*")
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });

  if (matchError) return NextResponse.json({ error: matchError.message }, { status: 500 });

  let applications: AppRow[] = [];
  if (auth) {
    const ownedMatchIds = new Set(
      ((matches ?? []) as MatchRow[])
        .filter((match) => match.owner_uid === auth.uid)
        .map((match) => match.id),
    );
    const { data: appRows, error: appError } = await supabase
      .from("match_applications")
      .select("*")
      .eq("is_deleted", false);
    if (appError) return NextResponse.json({ error: appError.message }, { status: 500 });
    applications = ((appRows ?? []) as AppRow[]).filter(
      (app) => app.applicant_uid === auth.uid || ownedMatchIds.has(app.match_id),
    );
  }

  return NextResponse.json({
    matches: ((matches ?? []) as MatchRow[]).map(mapMatch),
    applications: applications.map(mapApplication),
  });
}

export async function POST(request: Request) {
  const auth = await verifyUser(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = (await request.json().catch(() => ({}))) as {
    ownerUid?: string;
    ownerNickname?: string;
    title?: string;
    city?: string;
    district?: string;
    venue?: string;
    date?: string;
    startTime?: string;
    endTime?: string;
    ntrpRequired?: string[];
    totalSlots?: number;
    note?: string;
    joinMode?: MatchJoinMode;
  };
  if (body.ownerUid !== auth.uid) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!body.title?.trim()) return NextResponse.json({ error: "標題不可為空" }, { status: 400 });
  if (!body.startTime || !body.endTime || !isTimeRangeValid(body.startTime, body.endTime)) {
    return NextResponse.json({ error: "結束時間必須晚於開始時間" }, { status: 400 });
  }
  const totalSlots = Number(body.totalSlots ?? 0);
  if (totalSlots < 1 || totalSlots > 8) {
    return NextResponse.json({ error: "人數需在 1-8 人之間" }, { status: 400 });
  }

  const joinMode = body.joinMode ?? "public";
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("matches")
    .insert({
      owner_uid: auth.uid,
      owner_nickname: body.ownerNickname ?? "球友",
      title: body.title.trim(),
      city: body.city ?? "",
      district: body.district ?? "",
      venue: body.venue ?? "",
      date: body.date ?? "",
      weekday: weekdayLabel(body.date ?? ""),
      start_time: body.startTime,
      end_time: body.endTime,
      ntrp_required: body.ntrpRequired ?? [],
      total_slots: totalSlots,
      filled_slots: 0,
      status: "open",
      note: body.note ?? "",
      join_mode: joinMode,
      join_code: joinMode === "private" ? generateJoinCode() : null,
    })
    .select("id,title,owner_uid")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!isAblyChatMode()) {
    await upsertRedisConversation({
      convId: `match_${data.id}`,
      type: "match",
      relatedId: data.id,
      participants: [auth.uid],
      name: data.title,
      ownerUid: auth.uid,
    }).catch((error) => console.warn("[matches] conversation metadata unavailable:", error));
  }

  return NextResponse.json({ id: data.id });
}

export async function PATCH(request: Request) {
  const auth = await verifyUser(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = (await request.json().catch(() => ({}))) as {
    action?: string;
    matchId?: string;
    applicantUid?: string;
    applicantNickname?: string;
    joinCode?: string;
    accept?: boolean;
    settings?: {
      city: string;
      district: string;
      venue: string;
      date: string;
      startTime: string;
      endTime: string;
      ntrpRequired: string[];
      totalSlots: number;
      joinMode: MatchJoinMode;
    };
  };
  if (!body.matchId) return NextResponse.json({ error: "Missing matchId" }, { status: 400 });

  try {
    const supabase = getSupabaseServiceClient();
    const match = await getMatch(body.matchId);
    if (!match || match.is_deleted || match.status === "cancelled") {
      return NextResponse.json({ ok: false, msg: "球局不存在或已取消" });
    }

    if (body.action === "apply") {
      const nickname = body.applicantNickname ?? "球友";
      if (body.applicantUid !== auth.uid) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const joinMode = match.join_mode ?? "approval";
      if (joinMode === "private" && match.join_code !== body.joinCode?.trim()) {
        return NextResponse.json({ ok: false, msg: "加入碼錯誤" });
      }
      if (joinMode === "public" || joinMode === "private") {
        return NextResponse.json(await joinAccepted(match, auth.uid, nickname));
      }

      const apps = await listApplications(match.id);
      const existing = apps.find((app) => app.applicant_uid === auth.uid);
      if (existing && !["declined", "removed"].includes(existing.status)) {
        return NextResponse.json({ ok: false, msg: "已申請過此球局" });
      }
      const payload = {
        match_id: match.id,
        applicant_uid: auth.uid,
        applicant_nickname: nickname,
        status: "pending" as const,
        is_deleted: false,
        updated_at: new Date().toISOString(),
      };
      const { error } = existing
        ? await supabase.from("match_applications").update(payload).eq("id", existing.id)
        : await supabase.from("match_applications").insert(payload);
      if (error) throw new Error(error.message);
      await addSystemMessage(`match_${match.id}`, `${nickname} 申請加入，等待主揪確認。`);
      return NextResponse.json({ ok: true, msg: "申請已送出" });
    }

    if (body.action === "settings") {
      await ensureOwner(match.id, auth.uid);
      const settings = body.settings;
      if (!settings) return NextResponse.json({ error: "Missing settings" }, { status: 400 });
      if (!isTimeRangeValid(settings.startTime, settings.endTime)) {
        return NextResponse.json({ ok: false, msg: "結束時間必須晚於開始時間" });
      }
      if (settings.totalSlots < match.filled_slots) {
        return NextResponse.json({ ok: false, msg: `人數不可小於已核准人數 ${match.filled_slots}` });
      }
      const { error } = await supabase
        .from("matches")
        .update({
          city: settings.city,
          district: settings.district,
          venue: settings.venue,
          date: settings.date,
          weekday: weekdayLabel(settings.date),
          start_time: settings.startTime,
          end_time: settings.endTime,
          ntrp_required: settings.ntrpRequired,
          total_slots: settings.totalSlots,
          join_mode: settings.joinMode,
          join_code: settings.joinMode === "private" ? match.join_code ?? generateJoinCode() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", match.id);
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, msg: "球局設定已更新" });
    }

    if (body.action === "respond") {
      await ensureOwner(match.id, auth.uid);
      if (!body.applicantUid) return NextResponse.json({ error: "Missing applicantUid" }, { status: 400 });
      const apps = await listApplications(match.id);
      const app = apps.find((item) => item.applicant_uid === body.applicantUid && item.status === "pending");
      if (!app) throw new Error("申請不存在或已處理");
      if (body.accept) {
        const { data, error } = await supabase.rpc("match_accept_application", {
          p_match_id: match.id,
          p_applicant_uid: app.applicant_uid,
        });
        if (error) throw new Error(error.message);
        const result = (data ?? {}) as MatchJoinResult;
        if (!result.ok) return NextResponse.json({ ok: false, msg: result.msg ?? "已達人數上限" });
        await addChatParticipant(`match_${match.id}`, app.applicant_uid);
      } else {
        const { error } = await supabase
          .from("match_applications")
          .update({ status: "declined", updated_at: new Date().toISOString() })
          .eq("id", app.id);
        if (error) throw new Error(error.message);
      }
      await addSystemMessage(
        `match_${match.id}`,
        body.accept
          ? `主揪已接受 ${app.applicant_nickname} 加入「${match.title}」`
          : `主揪已婉拒 ${app.applicant_nickname} 加入「${match.title}」`,
      );
      return NextResponse.json({ ok: true });
    }

    if (body.action === "remove") {
      await ensureOwner(match.id, auth.uid);
      if (!body.applicantUid) return NextResponse.json({ error: "Missing applicantUid" }, { status: 400 });
      const apps = await listApplications(match.id);
      const app = apps.find((item) => item.applicant_uid === body.applicantUid && item.status === "accepted");
      if (!app) throw new Error("找不到此球友的申請記錄");
      const { error } = await supabase
        .from("match_applications")
        .update({ status: "removed", updated_at: new Date().toISOString() })
        .eq("id", app.id);
      if (error) throw new Error(error.message);
      await recalculateMatchFill(match.id);
      await removeChatParticipant(`match_${match.id}`, app.applicant_uid);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "leave") {
      if (body.applicantUid !== auth.uid) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const apps = await listApplications(match.id);
      const app = apps.find((item) => item.applicant_uid === auth.uid && item.status === "accepted");
      if (!app) throw new Error("你尚未加入此球局");
      const { error } = await supabase
        .from("match_applications")
        .update({ status: "removed", updated_at: new Date().toISOString() })
        .eq("id", app.id);
      if (error) throw new Error(error.message);
      await recalculateMatchFill(match.id);
      await removeChatParticipant(`match_${match.id}`, auth.uid);
      await addSystemMessage(`match_${match.id}`, `${app.applicant_nickname} 已退出球局。`);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "transfer") {
      await ensureOwner(match.id, auth.uid);
      if (!body.applicantUid || !body.applicantNickname) {
        return NextResponse.json({ error: "Missing new owner" }, { status: 400 });
      }
      const apps = await listApplications(match.id);
      const app = apps.find((item) => item.applicant_uid === body.applicantUid && item.status === "accepted");
      if (!app) throw new Error("新主揪必須是已接受的球友");
      const { error } = await supabase
        .from("matches")
        .update({
          owner_uid: body.applicantUid,
          owner_nickname: body.applicantNickname,
          updated_at: new Date().toISOString(),
        })
        .eq("id", match.id);
      if (error) throw new Error(error.message);
      const { error: appError } = await supabase
        .from("match_applications")
        .update({ status: "removed", updated_at: new Date().toISOString() })
        .eq("id", app.id);
      if (appError) throw new Error(appError.message);
      await recalculateMatchFill(match.id);
      await addSystemMessage(`match_${match.id}`, `系統紀錄：主辦權已移交給 ${body.applicantNickname}。`);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "cancel") {
      await ensureOwner(match.id, auth.uid);
      const { error } = await supabase
        .from("matches")
        .update({
          status: "cancelled",
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", match.id);
      if (error) throw new Error(error.message);
      await addSystemMessage(`match_${match.id}`, `「${match.title}」已取消。感謝各位參與。`);
      const { error: appsError } = await supabase
        .from("match_applications")
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("match_id", match.id)
        .eq("is_deleted", false);
      if (appsError) throw new Error(appsError.message);
      await deleteChatConversation(`match_${match.id}`);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "close") {
      await ensureOwner(match.id, auth.uid);
      const { error } = await supabase
        .from("matches")
        .update({ status: "closed", updated_at: new Date().toISOString() })
        .eq("id", match.id);
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "undo") {
      await ensureOwner(match.id, auth.uid);
      if (!body.applicantUid) return NextResponse.json({ error: "Missing applicantUid" }, { status: 400 });
      const apps = await listApplications(match.id);
      const app = apps.find((item) => item.applicant_uid === body.applicantUid);
      if (app) {
        const { error } = await supabase
          .from("match_applications")
          .update({ status: "pending", updated_at: new Date().toISOString() })
          .eq("id", app.id);
        if (error) throw new Error(error.message);
      }
      await recalculateMatchFill(match.id);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Match API failed" },
      { status: 500 },
    );
  }
}
