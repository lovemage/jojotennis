"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useApp, type Match } from "@/context/AppContext";
import type { TennisLevel } from "@/data/tennisLevels";
import { uploadAvatarImage } from "@/lib/avatarUpload";
import { getAttendanceStats } from "@/lib/reviewService";
import { NICKNAME_CHANGE_LIMIT, updateUserProfile } from "@/lib/userService";
import { subscribeMyCoach, type MyCoachState } from "@/lib/coachService";
import UserStatsBadge from "@/components/UserStatsBadge";
import { MatchCapacityProgress } from "@/components/MatchStatusIndicators";

type ProfileDashboardContextProps = {
  cities: string[];
  tennisLevels: TennisLevel[];
};

type TabId = "records" | "profile" | "matches" | "coach";

const tabs: Array<{ id: TabId; label: string }> = [
  { id: "records", label: "💬 揪團紀錄" },
  { id: "profile", label: "👤 我的資料" },
  { id: "matches", label: "🎾 我的揪球" },
  { id: "coach", label: "🎓 教練/學員" },
];

function remainingSlots(match: Match) {
  return Math.max(match.totalSlots - match.filledSlots, 0);
}

function isMatchCompleted(match: Match) {
  if (match.status === "closed") return true;
  if (!match.date || !match.endTime) return false;
  const [y, m, d] = match.date.split(/[\/\-]/).map((n) => Number.parseInt(n, 10));
  const [h, mi] = match.endTime.split(":").map((n) => Number.parseInt(n, 10));
  if (!y || !m || !d) return false;
  const end = new Date(y, m - 1, d, h || 0, mi || 0).getTime();
  if (Number.isNaN(end)) return false;
  return Date.now() > end;
}

function formatMatchDate(match: Pick<Match, "city" | "weekday" | "date">) {
  return `${match.city} · ${match.weekday} ${match.date}`;
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
    matches,
    messages,
    conversations,
    studentNeeds,
    logout,
    updateProfile,
    closeMatch,
    respondToApplicant,
  } = useApp();
  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const [nicknameDraft, setNicknameDraft] = useState(user?.nickname ?? "");
  const [attendanceRate, setAttendanceRate] = useState(0);
  const [nicknameSaving, setNicknameSaving] = useState(false);
  const [nicknameSaveStatus, setNicknameSaveStatus] = useState("");
  const [nicknameSaveError, setNicknameSaveError] = useState<string | null>(null);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarSaveStatus, setAvatarSaveStatus] = useState("");
  const [avatarSaveError, setAvatarSaveError] = useState<string | null>(null);
  const [myCoach, setMyCoach] = useState<MyCoachState | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    setNicknameDraft(user?.nickname ?? "");
  }, [user?.nickname]);
  const [expandedMatchId, setExpandedMatchId] = useState("");
  const attendancePercent = Math.max(0, Math.min(100, Math.round(attendanceRate * 100)));
  const nicknameChangesRemaining = Math.max(
    NICKNAME_CHANGE_LIMIT - (user?.nicknameChangesUsed ?? 0),
    0,
  );
  const loginMethodLabel =
    user?.provider === "google" ? "Google" : user?.provider === "line" ? "LINE" : "Email";
  const coachVerifiedStatus = myCoach
    ? myCoach.isVerified
      ? "已驗證"
      : "未驗證"
    : "尚未申請";

  useEffect(() => {
    if (!user?.uid) return;
    let active = true;
    getAttendanceStats(user.uid)
      .then((stats) => {
        if (active) setAttendanceRate(stats.attendanceRate);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) {
      setMyCoach(null);
      return;
    }

    const unsub = subscribeMyCoach(user.uid, setMyCoach);
    return () => unsub();
  }, [user?.uid]);

  const myCreatedMatches = useMemo(() => {
    if (!user?.uid) return [];
    return matches.filter((m) => m.ownerUid === user.uid);
  }, [matches, user?.uid]);

  const myAppliedMatches = useMemo(() => {
    if (!user?.uid) return [];
    return matches.filter((m) => m.applicants.some((a) => a.uid === user.uid));
  }, [matches, user?.uid]);
  const matchConversationIds = useMemo(
    () =>
      new Set(
        conversations
          .filter((conversation) => conversation.type === "match")
          .map((conversation) => conversation.relatedId)
          .filter((id): id is string => Boolean(id)),
      ),
    [conversations],
  );
  const hostMatchRecords = useMemo(
    () => myCreatedMatches.filter((match) => isMatchCompleted(match)),
    [myCreatedMatches],
  );
  const playerMatchRecords = useMemo(
    () =>
      myAppliedMatches.filter((match) =>
        isMatchCompleted(match) &&
        match.applicants.some((applicant) => applicant.uid === user?.uid && applicant.status === "accepted"),
      ),
    [myAppliedMatches, user?.uid],
  );
  const totalMatchRecords = useMemo(
    () => [
      ...hostMatchRecords,
      ...playerMatchRecords.filter(
        (match) => !hostMatchRecords.some((hostMatch) => hostMatch.id === match.id),
      ),
    ],
    [hostMatchRecords, playerMatchRecords],
  );
  const myStudentNeeds = useMemo(
    () => studentNeeds.filter((need) => need.ownerUid === user?.uid),
    [studentNeeds, user?.uid],
  );

  async function saveNickname() {
    const nextNickname = nicknameDraft.trim();
    if (!user) return;
    if (!nextNickname) return;
    if (nextNickname === user.nickname) return;
    if (nicknameChangesRemaining <= 0) {
      setNicknameSaveError("已用完三次暱稱更改機會，請聯繫管理員");
      return;
    }

    setNicknameSaving(true);
    setNicknameSaveStatus("");
    setNicknameSaveError(null);
    try {
      await updateUserProfile(user.uid, { nickname: nextNickname });
      updateProfile({
        nickname: nextNickname,
        avatarInitial: nextNickname[0] || user.avatarInitial,
      });
      setNicknameSaveStatus("已儲存");
    } catch (error) {
      setNicknameSaveError(
        error instanceof Error ? error.message : "更新失敗，請稍後再試",
      );
    } finally {
      setNicknameSaving(false);
    }
  }

  async function uploadAvatar(file: File | null | undefined) {
    if (!file || !user) return;
    setAvatarSaving(true);
    setAvatarSaveStatus("");
    setAvatarSaveError(null);
    try {
      const avatarUrl = await uploadAvatarImage(file, user.uid);
      await updateUserProfile(user.uid, { avatarUrl });
      updateProfile({ avatarUrl });
      setAvatarSaveStatus("頭像更新完成（Cloudinary）");
    } catch (error) {
      setAvatarSaveError(error instanceof Error ? error.message : "頭像更新失敗，請稍後再試");
    } finally {
      setAvatarSaving(false);
    }
  }

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
          </button>
        ))}
      </div>

      {activeTab === "records" ? (
        <section className="mt-6 space-y-3">
          <div className="rounded-[1.5rem] bg-white p-5 ring-1 ring-parchment">
            <p className="text-sm text-muted">
              主揪：{hostMatchRecords.length} 場 · 參加：{playerMatchRecords.length} 場
            </p>
          </div>
          <div className="mt-3 space-y-3">
            {totalMatchRecords.length > 0 ? (
              [...totalMatchRecords]
                .sort((a, b) => {
                  const keyA = new Date(a.date).getTime();
                  const keyB = new Date(b.date).getTime();
                  return keyB - keyA;
                })
                .map((match) => {
                  const isHost = match.ownerUid === user.uid;
                  const hasConversation = matchConversationIds.has(match.id);
                  const canOpenChat = hasConversation && isMatchCompleted(match);
                  return (
                    <article
                      key={match.id}
                      className="rounded-2xl border border-parchment bg-ivory p-4"
                    >
                      <p className="font-bold text-pine">{match.title}</p>
                      <p className="mt-1 text-sm text-muted">{formatMatchDate(match)}</p>
                      <p className="mt-1 text-sm text-muted">
                        角色：{isHost ? "主揪" : "參與者"}
                      </p>
                      {canOpenChat ? (
                        <Link
                          href={`/messages?conversation=match_${match.id}&from=match`}
                          className="mt-3 inline-flex rounded-full bg-clay px-4 py-2 text-xs font-bold text-white"
                        >
                          前往聊天室
                        </Link>
                      ) : (
                        <p className="mt-3 text-xs text-muted">
                          目前沒有聊天室（到期/刪除後將自動隱藏）
                        </p>
                      )}
                    </article>
                  );
                })
            ) : (
              <p className="rounded-[1.5rem] bg-white p-5 text-center text-sm text-muted ring-1 ring-parchment">
                還沒有參加過的揪球紀錄
              </p>
            )}
          </div>
        </section>
      ) : null}

      {activeTab === "profile" ? (
        <section className="mt-6 rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-parchment">
          <p className="text-sm font-semibold text-clay">個人資料</p>
          <h2 className="mt-2 text-2xl font-bold text-pine">更新球友名片</h2>
          <div className="mt-5 rounded-2xl border border-parchment bg-ivory p-4">
            <p className="text-xs font-semibold text-muted">頭像</p>
            <div className="mt-3 flex items-center gap-3">
              <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-pine text-lg font-black text-white">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  user.avatarInitial
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-pine">更換頭像（Cloudinary 上傳）</p>
                <p className="mt-1 text-xs text-muted">
                  建議上傳 1:1 圖片，系統會裁切並轉為 WebP。
                </p>
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarSaving}
                  className="mt-3 rounded-full border border-pine/20 bg-white px-4 py-2 text-xs font-bold text-pine disabled:opacity-50"
                >
                  {avatarSaving ? "上傳中..." : "上傳頭像"}
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    void uploadAvatar(file);
                  }}
                  className="sr-only"
                />
              </div>
            </div>
            {avatarSaveStatus ? (
              <p className="mt-3 text-xs text-pine">{avatarSaveStatus}</p>
            ) : null}
            {avatarSaveError ? (
              <p className="mt-3 text-xs text-clay">{avatarSaveError}</p>
            ) : null}
          </div>
          <div className="mt-4 space-y-2 rounded-2xl border border-parchment bg-ivory p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">信箱/登入方式</span>
              <span className="font-bold text-pine">
                {user.email || "-"} / {loginMethodLabel}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">教練驗證狀態</span>
              <span className="font-bold text-pine">{coachVerifiedStatus}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">參加率</span>
              <span className="font-bold text-pine">{attendancePercent}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">揪團紀錄</span>
              <span className="font-bold text-pine">
                主揪 {hostMatchRecords.length} 場 · 參加 {playerMatchRecords.length} 場
              </span>
            </div>
          </div>
          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="text-xs font-semibold text-muted">暱稱</span>
              <input
                value={nicknameDraft}
                onChange={(event) => setNicknameDraft(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay"
              />
            </label>
            <p className="text-xs text-muted">
              已使用 {Math.max(0, NICKNAME_CHANGE_LIMIT - nicknameChangesRemaining)} / {NICKNAME_CHANGE_LIMIT}{" "}
              次修改（剩餘 {nicknameChangesRemaining} 次）
            </p>
            <button
              type="button"
              onClick={() => {
                void saveNickname();
              }}
              disabled={
                nicknameSaving ||
                !nicknameDraft.trim() ||
                nicknameDraft.trim() === user.nickname
              }
              className="w-full rounded-full bg-pine px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-muted/40"
            >
              {nicknameSaving ? "儲存中..." : "儲存暱稱"}
            </button>
            {nicknameSaveStatus ? (
              <p className="text-xs text-pine">{nicknameSaveStatus}</p>
            ) : null}
            {nicknameSaveError ? (
              <p className="text-xs text-clay">{nicknameSaveError}</p>
            ) : null}
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
                            {match.city} · {match.weekday} {match.date}
                          </p>
                          <MatchCapacityProgress
                            current={match.filledSlots}
                            total={match.totalSlots}
                            className="mt-2"
                          />
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
