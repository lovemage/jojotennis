"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ProfileForm from "@/components/ProfileForm";
import type { TennisLevel } from "@/data/tennisLevels";

type ProfileDashboardProps = {
  cities: string[];
  tennisLevels: TennisLevel[];
};

const tabs = ["👤 我的資料", "🎾 我的揪球", "👥 我的社團", "🎓 教練/學員"] as const;

type JoinedClub = {
  id: string;
  name: string;
  city: string;
  tags: string[];
  joinedAt: string;
};

type MatchItem = {
  id: string;
  title: string;
  city: string;
  date: string;
  time: string;
  host: string;
};

export default function ProfileDashboard({
  cities,
  tennisLevels,
}: ProfileDashboardProps) {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>(tabs[0]);
  const [joinedClubs, setJoinedClubs] = useState<JoinedClub[]>([]);
  const [createdMatches, setCreatedMatches] = useState<MatchItem[]>([]);
  const [endedMatchIds, setEndedMatchIds] = useState<string[]>([]);
  const [confirmLeaveClub, setConfirmLeaveClub] = useState<JoinedClub | null>(
    null,
  );

  useEffect(() => {
    setJoinedClubs(
      JSON.parse(
        window.localStorage.getItem("jojo-tennis-joined-clubs") ?? "[]",
      ) as JoinedClub[],
    );
    setCreatedMatches(
      JSON.parse(
        window.localStorage.getItem("jojo-tennis-match-posts") ?? "[]",
      ) as MatchItem[],
    );
  }, []);

  function leaveClub(clubId: string) {
    const nextClubs = joinedClubs.filter((club) => club.id !== clubId);

    setJoinedClubs(nextClubs);
    window.localStorage.setItem(
      "jojo-tennis-joined-clubs",
      JSON.stringify(nextClubs),
    );
    setConfirmLeaveClub(null);
  }

  return (
    <>
      <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ${
              activeTab === tab ? "bg-clay text-white" : "bg-parchment text-ink"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "👤 我的資料" ? (
        <>
          <ProfileForm cities={cities} tennisLevels={tennisLevels} />
          <div className="mt-6 rounded-[1.5rem] border border-parchment bg-white p-5 shadow-sm">
            <p className="text-sm leading-6 text-muted">
              你的等級對應的技術說明：{" "}
              <Link href="/ntrp" className="font-semibold text-clay underline">
                查看完整 NTRP 說明 →
              </Link>
            </p>
          </div>
        </>
      ) : null}

      {activeTab === "🎾 我的揪球" ? (
        <div className="mt-6 space-y-6">
          <section className="rounded-[1.5rem] bg-white p-5 ring-1 ring-parchment">
            <h2 className="text-xl font-bold text-pine">我發起的揪球</h2>
            <div className="mt-4 space-y-3">
              {createdMatches.length > 0 ? (
                createdMatches.map((match) => (
                  <article key={match.id} className="rounded-2xl bg-ivory p-4">
                    <h3 className="font-bold text-pine">{match.title}</h3>
                    <p className="mt-1 text-sm text-muted">
                      {match.city} · {match.date} {match.time}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        setEndedMatchIds((ids) =>
                          ids.includes(match.id) ? ids : [...ids, match.id],
                        )
                      }
                      className="mt-3 rounded-full border border-pine px-4 py-2 text-sm font-bold text-pine"
                    >
                      {endedMatchIds.includes(match.id) ? "已結束" : "結束招募"}
                    </button>
                  </article>
                ))
              ) : (
                <p className="text-sm text-muted">還沒有發起過揪球</p>
              )}
            </div>
            <Link
              href="/match"
              className="mt-4 flex rounded-full bg-clay px-4 py-3 text-center text-sm font-bold text-white"
            >
              <span className="w-full">立即揪球 →</span>
            </Link>
          </section>

          <section className="rounded-[1.5rem] bg-white p-5 ring-1 ring-parchment">
            <h2 className="text-xl font-bold text-pine">我加入的揪球</h2>
            <p className="mt-4 text-sm text-muted">還沒有加入過揪球</p>
            <p className="mt-2 text-xs text-muted">狀態：等待主揪回覆 / 已接受 ✅ / 已婉拒</p>
            <Link
              href="/match"
              className="mt-4 flex rounded-full bg-clay px-4 py-3 text-center text-sm font-bold text-white"
            >
              <span className="w-full">去找球友 →</span>
            </Link>
          </section>
        </div>
      ) : null}

      {activeTab === "👥 我的社團" ? (
        <section className="mt-6 rounded-[1.5rem] bg-white p-5 ring-1 ring-parchment">
          <h2 className="text-xl font-bold text-pine">我加入的社團</h2>
          <div className="mt-4 space-y-3">
            {joinedClubs.length > 0 ? (
              joinedClubs.map((club) => (
                <article key={club.id} className="rounded-2xl bg-ivory p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-pine">{club.name}</h3>
                      <p className="mt-1 text-sm text-muted">{club.city}</p>
                    </div>
                    <span className="rounded-full bg-gold/20 px-3 py-1 text-xs font-bold text-clay">
                      {club.tags[0] ?? "社團"}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-muted">加入時間：{club.joinedAt}</p>
                  <button
                    type="button"
                    onClick={() => setConfirmLeaveClub(club)}
                    className="mt-3 rounded-full border border-pine px-4 py-2 text-sm font-bold text-pine"
                  >
                    退出社團
                  </button>
                </article>
              ))
            ) : (
              <p className="text-sm text-muted">還沒有加入社團</p>
            )}
          </div>
          <Link
            href="/club"
            className="mt-4 flex rounded-full bg-clay px-4 py-3 text-center text-sm font-bold text-white"
          >
            <span className="w-full">探索社團 →</span>
          </Link>
        </section>
      ) : null}

      {activeTab === "🎓 教練/學員" ? (
        <div className="mt-6 space-y-6">
          <section className="rounded-[1.5rem] bg-white p-5 ring-1 ring-parchment">
            <h2 className="text-xl font-bold text-pine">我刊登的教練資訊</h2>
            <p className="mt-4 text-sm text-muted">尚未刊登教練資訊</p>
            <Link
              href="/coach/register"
              className="mt-4 flex rounded-full bg-clay px-4 py-3 text-center text-sm font-bold text-white"
            >
              <span className="w-full">免費刊登教練資訊 →</span>
            </Link>
          </section>

          <section className="rounded-[1.5rem] bg-white p-5 ring-1 ring-parchment">
            <h2 className="text-xl font-bold text-pine">我發布的學習需求</h2>
            <p className="mt-4 text-sm text-muted">尚未發布學習需求</p>
            <p className="mt-2 text-xs text-muted">收到 0 則教練私訊</p>
            <button
              type="button"
              className="mt-3 rounded-full border border-pine px-4 py-2 text-sm font-bold text-pine"
            >
              下架需求
            </button>
            <Link
              href="/coach/post"
              className="mt-4 flex rounded-full bg-clay px-4 py-3 text-center text-sm font-bold text-white"
            >
              <span className="w-full">發布學習需求 →</span>
            </Link>
          </section>
        </div>
      ) : null}

      {confirmLeaveClub ? (
        <div className="fixed inset-0 z-50 flex items-center bg-ink/50 p-4">
          <div className="mx-auto w-full max-w-md rounded-[1.5rem] bg-white p-5">
            <h2 className="text-xl font-bold text-pine">確認退出社團？</h2>
            <p className="mt-3 text-sm text-muted">{confirmLeaveClub.name}</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setConfirmLeaveClub(null)}
                className="rounded-full border border-pine px-4 py-3 text-sm font-bold text-pine"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => leaveClub(confirmLeaveClub.id)}
                className="rounded-full bg-clay px-4 py-3 text-sm font-bold text-white"
              >
                確認退出
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
