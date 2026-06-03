"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useApp, type Match, type Message } from "@/context/AppContext";
import type { TennisLevel } from "@/data/tennisLevels";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { toUiMatch } from "@/lib/mappers";
import type { Match as SchemaMatch, MatchApplication } from "@/lib/schema";
import UserStatsBadge from "@/components/UserStatsBadge";

type ProfileDashboardContextProps = {
  cities: string[];
  tennisLevels: TennisLevel[];
};

type TabId = "messages" | "profile" | "matches" | "coach";

const tabs: Array<{ id: TabId; label: string }> = [
  { id: "profile", label: "👤 我的資料" },
  { id: "matches", label: "🎾 我的揪球" },
  { id: "coach", label: "🎓 教練/學員" },
];

const messageIcons: Record<Message["type"], string> = {
  match_request: "🎾",
  match_accepted: "✅",
  match_declined: "❌",
  club_join: "👥",
  coach_msg: "🎓",
  system: "📢",
};

function remainingSlots(match: Match) {
  return Math.max(match.totalSlots - match.filledSlots, 0);
}

function getApplicantStatusLabel(status: string) {
  if (status === "accepted") {
    return "已接受 ✅";
  }

  if (status === "declined") {
    return "已婉拒";
  }

  return "等待主揪回覆";
}

function reportApplicantActionError(error: unknown) {
  const message = error instanceof Error ? error.message : "操作失敗";
  alert(message.includes("Quota exceeded") ? "Firebase 配額已用完，暫時無法更新核准狀態。" : message);
}

export default function ProfileDashboardContext({
  cities,
  tennisLevels,
}: ProfileDashboardContextProps) {
  const router = useRouter();
  const {
    user,
    messages,
    studentNeeds,
    unreadCount,
    logout,
    updateProfile,
    markAllRead,
    closeMatch,
    respondToApplicant,
  } = useApp();
  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const [nicknameDraft, setNicknameDraft] = useState(user?.nickname ?? "");
  useEffect(() => {
    setNicknameDraft(user?.nickname ?? "");
  }, [user?.nickname]);
  const [expandedMatchId, setExpandedMatchId] = useState("");
  const [expandedMessageId, setExpandedMessageId] = useState("");
  const [profileMatches, setProfileMatches] = useState<(SchemaMatch & { matchId: string })[]>(
    [],
  );
  const [profileApps, setProfileApps] = useState<MatchApplication[]>([]);

  useEffect(() => {
    if (activeTab === "messages") {
      markAllRead();
    }
  }, [activeTab, markAllRead]);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(
      collection(db, "matches"),
      (snap) => {
        const rows = snap.docs
          .map((d) => ({ matchId: d.id, ...d.data() }) as SchemaMatch & { matchId: string })
          .filter((m) => m.isDeleted !== true);
        rows.sort((a, b) => {
          const ta = (a.createdAt as { toMillis?: () => number })?.toMillis?.() ?? 0;
          const tb = (b.createdAt as { toMillis?: () => number })?.toMillis?.() ?? 0;
          return tb - ta;
        });
        setProfileMatches(rows);
      },
      (err) => console.error("[matches] 監聽失敗：", err.code, err.message),
    );
    return () => unsub();
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(
      collection(db, "match_applications"),
      (snap) => {
        const rows = snap.docs
          .map((d) => ({ appId: d.id, ...d.data() }) as MatchApplication)
          .filter((a) => a.applicantUid === user.uid && a.isDeleted !== true);
        setProfileApps(rows);
      },
      (err) => console.error("[match_applications] 監聽失敗：", err.code, err.message),
    );
    return () => unsub();
  }, [user?.uid]);

  const myCreatedMatches = useMemo(() => {
    if (!user?.uid) return [];
    return profileMatches
      .filter((m) => m.ownerUid === user.uid)
      .map((m) => toUiMatch(m, m.matchId, profileApps));
  }, [profileMatches, profileApps, user?.uid]);

  const myAppliedMatches = useMemo(() => {
    if (!user?.uid) return [];
    const joinedIds = new Set(
      profileApps.filter((a) => a.applicantUid === user.uid).map((a) => a.matchId),
    );
    return profileMatches
      .filter((m) => joinedIds.has(m.matchId))
      .map((m) => toUiMatch(m, m.matchId, profileApps));
  }, [profileMatches, profileApps, user?.uid]);
  const inboxMessages = useMemo(
    () => messages.filter((message) => message.toUid === user?.uid),
    [messages, user?.uid],
  );
  const myStudentNeeds = useMemo(
    () => studentNeeds.filter((need) => need.ownerUid === user?.uid),
    [studentNeeds, user?.uid],
  );

  function handleLogout() {
    logout();
    router.push("/");
  }

  if (!user) {
    return (
      <>
        <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-parchment">
          <h1 className="text-3xl font-bold tracking-tight text-pine">
            建立你的球友名片
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            登入後管理你的揪球、社團與教練資訊
          </p>
          <Link
            href="/login"
            className="mt-5 flex w-full items-center justify-center rounded-full bg-clay px-4 py-3 text-sm font-bold text-white"
          >
            登入 / 免費註冊
          </Link>
        </div>
        <div className="mt-6 rounded-[1.5rem] bg-white p-5 text-sm text-muted ring-1 ring-parchment">
          登入後即可查看訊息、管理揪球與更新個人資料。
        </div>
      </>
    );
  }

  return (
    <>
      <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-parchment">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-sm font-bold text-clay">
              👋 歡迎回來，{user.nickname}！
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-pine">
              {user.nickname} 的球友名片
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted">
              NTRP {user.ntrp} · {user.region} · 球齡 {user.yearsPlaying} 年
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="shrink-0 text-xs font-bold text-muted underline"
          >
            登出
          </button>
        </div>
      </div>

      <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`relative shrink-0 rounded-full px-4 py-2 text-sm font-bold ${
              activeTab === tab.id ? "bg-clay text-white" : "bg-parchment text-ink"
            }`}
          >
            {tab.label}
            {tab.id === "messages" && unreadCount > 0 ? (
              <span className="ml-2 rounded-full bg-red-600 px-1.5 py-0.5 text-[11px] text-white">
                {unreadCount}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {activeTab === "messages" ? (
        <section className="mt-6 space-y-3">
          {inboxMessages.length > 0 ? (
            inboxMessages.map((message) => (
              <article
                key={message.id}
                className={`rounded-[1.5rem] border border-parchment p-4 shadow-sm ${
                  message.isRead ? "bg-white" : "bg-parchment/70"
                }`}
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpandedMessageId(
                      expandedMessageId === message.id ? "" : message.id,
                    )
                  }
                  className="flex w-full items-start gap-3 text-left"
                >
                  {!message.isRead ? (
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-clay" />
                  ) : (
                    <span className="mt-2 h-2 w-2 shrink-0" />
                  )}
                  <span className="text-xl">{messageIcons[message.type]}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="block min-w-0 flex-1 truncate text-sm font-bold text-pine">
                        {message.fromNickname} · {message.content}
                      </span>
                      {message.isHandled ? (
                        <span className="shrink-0 rounded-full bg-muted/15 px-2 py-0.5 text-[11px] font-bold text-muted">
                          {message.handledStatus === "accepted"
                            ? "已接受"
                            : "已婉拒"}
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-1 block text-right text-xs text-muted">
                      {new Date(message.timestamp).toLocaleString("zh-TW", {
                        hour12: false,
                      })}
                    </span>
                  </span>
                </button>
                {expandedMessageId === message.id ? (
                  <div className="mt-3 rounded-2xl bg-white/70 p-4 text-sm leading-6 text-muted">
                    {message.content}
                    {message.isHandled ? (
                      <p className="mt-4 rounded-2xl bg-ivory p-3 text-center text-sm font-bold text-muted">
                        已處理：
                        {message.handledStatus === "accepted"
                          ? "已接受這位球友"
                          : "已婉拒這位球友"}
                      </p>
                    ) : null}
                    {message.type === "match_request" &&
                    message.relatedId &&
                    !message.isHandled ? (
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            void Promise.resolve(
                              respondToApplicant(message.relatedId!, message.fromUid, true),
                            ).catch(reportApplicantActionError);
                          }}
                          className="rounded-full bg-green-600 px-4 py-2 text-sm font-bold text-white"
                        >
                          接受
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            void Promise.resolve(
                              respondToApplicant(message.relatedId!, message.fromUid, false),
                            ).catch(reportApplicantActionError);
                          }}
                          className="rounded-full border border-pine px-4 py-2 text-sm font-bold text-pine"
                        >
                          婉拒
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </article>
            ))
          ) : (
            <div className="rounded-[1.5rem] bg-white p-5 text-center text-sm text-muted ring-1 ring-parchment">
              目前沒有訊息
            </div>
          )}
        </section>
      ) : null}

      {activeTab === "profile" ? (
        <section className="mt-6 rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-parchment">
          <p className="text-sm font-semibold text-clay">個人資料</p>
          <h2 className="mt-2 text-2xl font-bold text-pine">更新球友名片</h2>
          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="text-xs font-semibold text-muted">暱稱</span>
              <input
                value={nicknameDraft}
                onChange={(event) => setNicknameDraft(event.target.value)}
                onBlur={() => {
                  const next = nicknameDraft.trim();
                  if (!next || next === user.nickname) return;
                  updateProfile({
                    nickname: next,
                    avatarInitial: next[0] || user.avatarInitial,
                  });
                }}
                className="mt-2 w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label>
                <span className="text-xs font-semibold text-muted">球齡</span>
                <div className="mt-2 flex items-center rounded-2xl border border-parchment bg-ivory px-4 focus-within:border-clay">
                  <input
                    type="number"
                    min="0"
                    value={user.yearsPlaying}
                    onChange={(event) =>
                      updateProfile({ yearsPlaying: Number(event.target.value) || 0 })
                    }
                    className="w-full bg-transparent py-3 text-sm outline-none"
                  />
                  <span className="shrink-0 text-sm font-semibold text-muted">年</span>
                </div>
              </label>
              <label>
                <span className="text-xs font-semibold text-muted">偏好地區</span>
                <select
                  value={user.region}
                  onChange={(event) => updateProfile({ region: event.target.value })}
                  className="mt-2 w-full rounded-2xl border border-parchment bg-ivory px-3 py-3 text-sm outline-none focus:border-clay"
                >
                  {cities.map((city) => (
                    <option key={city}>{city}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block">
              <span className="text-xs font-semibold text-muted">NTRP 等級</span>
              <select
                value={user.ntrp}
                onChange={(event) => updateProfile({ ntrp: event.target.value })}
                className="mt-2 w-full rounded-2xl border border-parchment bg-ivory px-3 py-3 text-sm outline-none focus:border-clay"
              >
                {tennisLevels.map((level) => (
                  <option key={level.level} value={level.level}>
                    {level.level} · {level.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>
      ) : null}

      {activeTab === "matches" ? (
        <div className="mt-6 space-y-6">
          <section className="rounded-[1.5rem] bg-white p-5 ring-1 ring-parchment">
            <h2 className="text-xl font-bold text-pine">我發起的揪球</h2>
            <div className="mt-4 space-y-3">
              {myCreatedMatches.length > 0 ? (
                myCreatedMatches.map((match) => {
                  const pendingApplicants = match.applicants.filter(
                    (applicant) => applicant.status === "pending",
                  );
                  const remaining = remainingSlots(match);

                  return (
                    <article key={match.id} className="rounded-2xl bg-ivory p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-bold text-pine">{match.title}</h3>
                          <p className="mt-1 text-sm text-muted">
                            {match.city} · {match.weekday} {match.date} · 還差 {remaining} 人
                          </p>
                        </div>
                        {remaining === 0 ? (
                          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                            ✅ 招募完成
                          </span>
                        ) : pendingApplicants.length > 0 ? (
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedMatchId(
                                expandedMatchId === match.id ? "" : match.id,
                              )
                            }
                            className="rounded-full bg-gold/20 px-3 py-1 text-xs font-bold text-clay"
                          >
                            🔔 {pendingApplicants.length} 人想加入
                          </button>
                        ) : null}
                      </div>
                      {expandedMatchId === match.id ? (
                        <div className="mt-4 space-y-3 rounded-2xl bg-white p-4">
                          {pendingApplicants.map((applicant) => (
                            <div key={applicant.uid}>
                              <p className="text-sm font-semibold text-pine">
                                {applicant.nickname} · 申請加入
                              </p>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-bold text-muted">
                                <span className="rounded-full bg-parchment px-2 py-0.5">
                                  UID: {applicant.uid.slice(0, 6)}
                                </span>
                                <UserStatsBadge uid={applicant.uid} />
                              </div>
                              <div className="mt-2 grid grid-cols-2 gap-3">
                                <button
                                  type="button"
                                  onClick={() => {
                                    void Promise.resolve(
                                      respondToApplicant(match.id, applicant.uid, true),
                                    ).catch(reportApplicantActionError);
                                  }}
                                  className="rounded-full bg-green-600 px-4 py-2 text-sm font-bold text-white"
                                >
                                  接受
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    void Promise.resolve(
                                      respondToApplicant(match.id, applicant.uid, false),
                                    ).catch(reportApplicantActionError);
                                  }}
                                  className="rounded-full border border-pine px-4 py-2 text-sm font-bold text-pine"
                                >
                                  婉拒
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                      <button
                        type="button"
                        disabled={match.status === "closed"}
                        onClick={() => closeMatch(match.id)}
                        className={`mt-4 rounded-full px-4 py-2 text-sm font-bold ${
                          match.status === "closed"
                            ? "bg-muted/20 text-muted"
                            : "border border-pine text-pine"
                        }`}
                      >
                        {match.status === "closed" ? "已結束" : "結束招募"}
                      </button>
                    </article>
                  );
                })
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
            <div className="mt-4 space-y-3">
              {myAppliedMatches.length > 0 ? (
                myAppliedMatches.map((match) => {
                  const applicant = match.applicants.find(
                    (item) => item.uid === user.uid,
                  );

                  return (
                    <article key={match.id} className="rounded-2xl bg-ivory p-4">
                      <h3 className="font-bold text-pine">{match.title}</h3>
                      <p className="mt-1 text-sm text-muted">
                        {match.city} · {match.weekday} {match.date}
                      </p>
                      <p className="mt-2 text-sm font-bold text-clay">
                        {getApplicantStatusLabel(applicant?.status ?? "pending")}
                      </p>
                    </article>
                  );
                })
              ) : (
                <p className="text-sm text-muted">還沒有加入過揪球</p>
              )}
            </div>
            <Link
              href="/match"
              className="mt-4 flex rounded-full bg-clay px-4 py-3 text-center text-sm font-bold text-white"
            >
              <span className="w-full">去找球友 →</span>
            </Link>
          </section>
        </div>
      ) : null}

      {activeTab === "coach" ? (
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
            <div className="mt-4 space-y-3">
              {myStudentNeeds.length > 0 ? (
                myStudentNeeds.map((need) => (
                  <article key={need.id} className="rounded-2xl bg-ivory p-4">
                    <h3 className="font-bold text-pine">{need.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-muted">
                      {need.city} · {need.district} · {need.targetLevel}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted">
                      {need.preferredTime} · {need.budget}
                    </p>
                    <p className="mt-2 text-sm font-bold text-clay">
                      收到{" "}
                      {
                        messages.filter(
                          (message) =>
                            message.type === "coach_msg" &&
                            message.relatedId === need.id &&
                            message.toUid === user.uid,
                        ).length
                      }{" "}
                      則教練私訊
                    </p>
                  </article>
                ))
              ) : (
                <p className="text-sm text-muted">尚未發布學習需求</p>
              )}
            </div>
            <Link
              href="/coach/post"
              className="mt-4 flex rounded-full bg-clay px-4 py-3 text-center text-sm font-bold text-white"
            >
              <span className="w-full">發布學習需求 →</span>
            </Link>
          </section>
        </div>
      ) : null}

    </>
  );
}
