"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";
import { auth } from "@/lib/firebase";

type AdminMatchRow = {
  id: string;
  title: string;
  ownerNickname: string;
  city: string;
  district: string;
  venue: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  isDeleted: boolean;
  applicantCount: number;
};

export default function AdminMatchesPage() {
  const [matches, setMatches] = useState<AdminMatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actingMatchId, setActingMatchId] = useState<string | null>(null);

  async function getAuthHeaders() {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("請重新登入管理員帳號");
    return { Authorization: `Bearer ${token}` };
  }

  const loadMatches = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const headers = await getAuthHeaders();
      const response = await fetch("/api/admin/matches", { headers });
      const payload = (await response.json().catch(() => ({}))) as {
        matches?: AdminMatchRow[];
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error || "讀取球局失敗");
      setMatches(payload.matches ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "讀取球局失敗");
    } finally {
      setLoading(false);
    }
  }, []);

  async function runMatchAction(matchId: string, action: () => Promise<void>) {
    setActingMatchId(matchId);
    try {
      await action();
      await loadMatches();
    } catch (error) {
      const message = error instanceof Error ? error.message : "操作失敗，請稍後再試";
      alert(message);
    } finally {
      setActingMatchId(null);
    }
  }

  async function updateMatchStatus(matchId: string, status: string) {
    const headers = await getAuthHeaders();
    const response = await fetch("/api/admin/matches", {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, status }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) throw new Error(payload.error || "更新球局狀態失敗");
  }

  async function deleteMatch(matchId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`/api/admin/matches?matchId=${encodeURIComponent(matchId)}`, {
      method: "DELETE",
      headers,
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) throw new Error(payload.error || "軟刪除球局失敗");
  }

  useEffect(() => {
    void loadMatches();
  }, [loadMatches]);

  return (
    <AdminGuard>
      <section className="mx-auto max-w-md px-6 py-10">
        <div className="rounded-[2rem] bg-pine p-6 text-white shadow-lg">
          <p className="text-sm font-semibold text-gold">Admin</p>
          <h1 className="mt-2 text-3xl font-bold">約球管理</h1>
          <p className="mt-4 leading-7 text-parchment">含已取消/已刪除揪球，可調整狀態或軟刪除。</p>
        </div>

        {loading ? <p className="mt-6 text-center text-sm text-muted">載入球局中…</p> : null}
        {error ? <p className="mt-6 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-600">{error}</p> : null}

        <div className="mt-6 space-y-4">
          {matches.map((match) => (
            <article key={match.id} className="rounded-[1.5rem] bg-white p-5 ring-1 ring-parchment">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-semibold text-clay">
                  {match.city} {match.district}
                </p>
                <span className="text-[11px] font-bold text-muted">
                  {match.isDeleted ? "已刪除" : match.status}
                </span>
              </div>
              <h2 className="mt-1 font-bold text-pine">{match.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                {match.venue} · {match.date} {match.startTime}–{match.endTime}
              </p>
              <p className="mt-2 text-xs text-muted">
                主揪：{match.ownerNickname} · 申請數：{match.applicantCount}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={`/matches/${match.id}`}
                  className="rounded-full border border-pine px-4 py-2 text-xs font-bold text-pine"
                >
                  查看詳情
                </Link>
                {!match.isDeleted ? (
                  <>
                    <button
                      type="button"
                      disabled={actingMatchId === match.id}
                      onClick={() =>
                        void runMatchAction(match.id, () =>
                          updateMatchStatus(match.id, match.status === "open" ? "closed" : "open"),
                        )
                      }
                      className="rounded-full bg-pine px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
                    >
                      {actingMatchId === match.id ? "更新中" : match.status === "open" ? "設為結束" : "重新開放"}
                    </button>
                    <button
                      type="button"
                      disabled={actingMatchId === match.id}
                      onClick={() => {
                        if (window.confirm(`確定刪除「${match.title}」？`)) {
                          void runMatchAction(match.id, () => deleteMatch(match.id));
                        }
                      }}
                      className="rounded-full bg-ivory px-4 py-2 text-xs font-bold text-clay disabled:opacity-50"
                    >
                      {actingMatchId === match.id ? "刪除中" : "軟刪除"}
                    </button>
                  </>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>
    </AdminGuard>
  );
}
