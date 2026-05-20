"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";
import { useApp } from "@/context/AppContext";
import { subscribeToAllMatches } from "@/lib/matchService";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
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
                      onClick={() =>
                        updateMatchStatus(match.id, match.status === "open" ? "closed" : "open")
                      }
                      className="rounded-full bg-pine px-4 py-2 text-xs font-bold text-white"
                    >
                      {match.status === "open" ? "設為結束" : "重新開放"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`確定刪除「${match.title}」？`)) {
                          deleteMatch(match.id);
                        }
                      }}
                      className="rounded-full bg-ivory px-4 py-2 text-xs font-bold text-clay"
                    >
                      軟刪除
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
