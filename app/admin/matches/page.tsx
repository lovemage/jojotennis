"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";
import { useApp } from "@/context/AppContext";
import { subscribeToAllMatches } from "@/lib/matchService";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import type { Match as SchemaMatch, MatchApplication } from "@/lib/schema";

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
  const { updateMatchStatus, deleteMatch } = useApp();
  const [rawMatches, setRawMatches] = useState<(SchemaMatch & { matchId?: string })[]>([]);
  const [applications, setApplications] = useState<MatchApplication[]>([]);
  const [fixing, setFixing] = useState(false);
  const [actingMatchId, setActingMatchId] = useState<string | null>(null);

  async function runMatchAction(matchId: string, action: () => Promise<void>) {
    setActingMatchId(matchId);
    try {
      await action();
    } catch (error) {
      const message = error instanceof Error ? error.message : "操作失敗，請稍後再試";
      alert(message.includes("Quota exceeded") || message.includes("resource-exhausted")
        ? "Firebase 配額已用完，暫時無法更新球局狀態。"
        : message);
    } finally {
      setActingMatchId(null);
    }
  }

  async function fixMissingFields() {
    setFixing(true);
    try {
      const snap = await getDocs(collection(db, "matches"));
      let count = 0;
      for (const d of snap.docs) {
        const data = d.data();
        const updates: Record<string, unknown> = {};
        if (data.isDeleted === undefined) updates.isDeleted = false;
        if (data.deletedAt === undefined) updates.deletedAt = null;
        if (data.updatedAt === undefined) updates.updatedAt = serverTimestamp();
        if (Object.keys(updates).length > 0) {
          await updateDoc(doc(db, "matches", d.id), updates);
          count++;
        }
      }
      alert(`修復完成，共 ${count} 筆`);
    } catch (err) {
      console.error("修復失敗：", err);
      alert("修復失敗，請稍後再試");
    } finally {
      setFixing(false);
    }
  }

  useEffect(() => subscribeToAllMatches(setRawMatches), []);

  useEffect(() => {
    return onSnapshot(
      query(collection(db, "match_applications"), where("isDeleted", "==", false)),
      (snap) => {
        setApplications(
          snap.docs.map((d) => ({ appId: d.id, ...d.data() }) as MatchApplication),
        );
      },
    );
  }, []);

  const matches: AdminMatchRow[] = useMemo(
    () =>
      rawMatches.map((m) => {
        const id = m.matchId ?? "";
        return {
          id,
          title: m.title,
          ownerNickname: m.ownerNickname,
          city: m.city,
          district: m.district,
          venue: m.venue,
          date: m.date,
          startTime: m.startTime,
          endTime: m.endTime,
          status: m.status,
          isDeleted: Boolean(m.isDeleted),
          applicantCount: applications.filter((a) => a.matchId === id).length,
        };
      }),
    [rawMatches, applications],
  );

  return (
    <AdminGuard>
      <section className="mx-auto max-w-md px-6 py-10">
        <div className="rounded-[2rem] bg-pine p-6 text-white shadow-lg">
          <p className="text-sm font-semibold text-gold">Admin</p>
          <h1 className="mt-2 text-3xl font-bold">約球管理</h1>
          <p className="mt-4 leading-7 text-parchment">含已取消/已刪除揪球，可調整狀態或軟刪除。</p>
        </div>

        <button
          type="button"
          disabled={fixing}
          onClick={() => void fixMissingFields()}
          className="mt-6 w-full rounded-full border border-clay px-4 py-3 text-sm font-bold text-clay disabled:opacity-50"
        >
          {fixing ? "修復中…" : "修復舊資料缺少欄位（一次性）"}
        </button>

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
