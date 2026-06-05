import { auth } from "./firebase";
import { isTimeRangeValid } from "./timeUtils";
import type { Match, MatchApplication, MatchJoinMode } from "./schema";

type MatchListPayload = {
  matches: Array<Match & { matchId: string }>;
  applications: MatchApplication[];
};

async function authHeaders(): Promise<Record<string, string>> {
  const token = await auth.currentUser?.getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function optionalAuthHeaders(): Promise<Record<string, string>> {
  const token = await auth.currentUser?.getIdToken().catch(() => null);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function matchApi<T>(init?: RequestInit): Promise<T> {
  const authHeader = init?.method && init.method !== "GET" ? await authHeaders() : await optionalAuthHeaders();
  const requestHeaders = new Headers(init?.headers);
  for (const [key, value] of Object.entries(authHeader)) {
    requestHeaders.set(key, value);
  }
  const response = await fetch("/api/matches", {
    ...init,
    headers: requestHeaders,
  });
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || "球局 API 失敗");
  return payload;
}

async function patchMatch<T>(body: Record<string, unknown>): Promise<T> {
  return matchApi<T>({
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function fetchMatches(): Promise<MatchListPayload> {
  return matchApi<MatchListPayload>();
}

export async function createMatch(data: {
  ownerUid: string;
  ownerNickname: string;
  title: string;
  city: string;
  district: string;
  venue: string;
  date: string;
  startTime: string;
  endTime: string;
  ntrpRequired: string[];
  totalSlots: number;
  note: string;
  joinMode?: MatchJoinMode;
}): Promise<string> {
  if (!isTimeRangeValid(data.startTime, data.endTime)) {
    throw new Error("結束時間必須晚於開始時間");
  }
  if (data.totalSlots < 1 || data.totalSlots > 8) throw new Error("人數需在 1-8 人之間");
  if (!data.title.trim()) throw new Error("標題不可為空");

  const result = await matchApi<{ id: string }>({
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return result.id;
}

export async function updateMatchSettings(
  matchId: string,
  ownerUid: string,
  data: {
    city: string;
    district: string;
    venue: string;
    date: string;
    startTime: string;
    endTime: string;
    ntrpRequired: string[];
    totalSlots: number;
    joinMode: MatchJoinMode;
  },
): Promise<{ ok: boolean; msg: string }> {
  void ownerUid;
  return patchMatch({ action: "settings", matchId, settings: data });
}

export function subscribeToMatches(cb: (m: Match[]) => void, cityFilter?: string) {
  let stopped = false;
  async function load() {
    try {
      const payload = await fetchMatches();
      if (stopped) return;
      const rows = payload.matches
        .filter((match) => match.isDeleted !== true && match.status === "open")
        .filter((match) => !cityFilter || match.city === cityFilter);
      cb(rows);
    } catch (error) {
      console.error("matches 讀取失敗：", error);
      if (!stopped) cb([]);
    }
  }
  void load();
  const timer = window.setInterval(() => void load(), 5000);
  return () => {
    stopped = true;
    window.clearInterval(timer);
  };
}

export function subscribeToAllMatches(cb: (m: Match[]) => void) {
  return subscribeToMatches(cb);
}

export function subscribeToMyMatches(
  uid: string,
  cb: (owned: Match[], joined: MatchApplication[]) => void,
) {
  let stopped = false;
  async function load() {
    try {
      const payload = await fetchMatches();
      if (stopped) return;
      cb(
        payload.matches.filter((match) => match.ownerUid === uid),
        payload.applications.filter((app) => app.applicantUid === uid),
      );
    } catch (error) {
      console.error("my matches 讀取失敗：", error);
      if (!stopped) cb([], []);
    }
  }
  void load();
  const timer = window.setInterval(() => void load(), 5000);
  return () => {
    stopped = true;
    window.clearInterval(timer);
  };
}

export async function applyToMatch(
  matchId: string,
  applicantUid: string,
  applicantNickname: string,
): Promise<{ ok: boolean; msg: string }> {
  return patchMatch({ action: "apply", matchId, applicantUid, applicantNickname });
}

export async function joinMatchWithCode(
  matchId: string,
  joinCode: string,
  applicantUid: string,
  applicantNickname: string,
): Promise<{ ok: boolean; msg: string }> {
  return patchMatch({ action: "apply", matchId, joinCode, applicantUid, applicantNickname });
}

export async function respondToApplication(
  appId: string,
  matchId: string,
  accept: boolean,
  applicantUid: string,
  applicantNickname: string,
): Promise<void> {
  void appId;
  void applicantNickname;
  await patchMatch({ action: "respond", matchId, accept, applicantUid });
}

export async function removeFromMatch(
  matchId: string,
  targetUid: string,
  targetNickname: string,
  matchTitle: string,
): Promise<void> {
  void targetNickname;
  void matchTitle;
  await patchMatch({ action: "remove", matchId, applicantUid: targetUid });
}

export async function transferMatchOwnership(
  matchId: string,
  currentOwnerUid: string,
  newOwnerUid: string,
  newOwnerNickname: string,
): Promise<void> {
  void currentOwnerUid;
  await patchMatch({
    action: "transfer",
    matchId,
    applicantUid: newOwnerUid,
    applicantNickname: newOwnerNickname,
  });
}

export async function leaveFromMatch(
  matchId: string,
  applicantUid: string,
  applicantNickname: string,
  matchTitle: string,
): Promise<void> {
  void applicantNickname;
  void matchTitle;
  await patchMatch({ action: "leave", matchId, applicantUid });
}

export async function cancelMatch(
  matchId: string,
  ownerUid: string,
  matchTitle: string,
): Promise<void> {
  void ownerUid;
  void matchTitle;
  await patchMatch({ action: "cancel", matchId });
}

export async function closeMatch(matchId: string): Promise<void> {
  await patchMatch({ action: "close", matchId });
}

export async function undoApplicationToPending(
  matchId: string,
  applicantUid: string,
  filledSlots: number,
): Promise<void> {
  void filledSlots;
  await patchMatch({ action: "undo", matchId, applicantUid });
}

export async function adminUpdateMatchStatus(
  matchId: string,
  status: Match["status"],
): Promise<void> {
  const headers = await authHeaders();
  const response = await fetch("/api/admin/matches", {
    method: "PATCH",
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ matchId, status }),
  });
  const payload = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new Error(payload.error || "更新球局狀態失敗");
}

export async function adminSoftDeleteMatch(matchId: string): Promise<void> {
  const headers = await authHeaders();
  const response = await fetch(`/api/admin/matches?matchId=${encodeURIComponent(matchId)}`, {
    method: "DELETE",
    headers,
  });
  const payload = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new Error(payload.error || "刪除球局失敗");
}
