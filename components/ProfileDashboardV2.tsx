"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import ProfileForm from "@/components/ProfileForm";
import { getUser, logout, type JojoUser } from "@/lib/auth";
import {
  getMessages,
  markMessageAsRead,
  saveMessages,
  type Message,
} from "@/lib/messageStore";
import { closeMatch, getMatches, type StoredMatchPost } from "@/lib/matchStore";
import type { MatchPost } from "@/data/matchPosts";
import type { TennisLevel } from "@/data/tennisLevels";

type ProfileDashboardProps = {
  cities: string[];
  tennisLevels: TennisLevel[];
  defaultMatches: MatchPost[];
};

type TabId = "profile" | "matches" | "clubs" | "coach" | "messages";

type JoinedClub = {
  id: string;
  name: string;
  city: string;
  tags: string[];
  joinedAt: string;
};

type Profile = {
  nickname?: string;
  yearsPlayed?: string;
  tennisLevel?: string;
  preferredCity?: string;
};

const joinedClubsStorageKey = "jojo-tennis-joined-clubs";
const profileStorageKey = "tennis-tw-profile";
const tabs: Array<{ id: TabId; label: string }> = [
  { id: "profile", label: "👤 我的資料" },
  { id: "matches", label: "🎾 我的揪球" },
  { id: "clubs", label: "👥 我的社團" },
  { id: "coach", label: "🎓 教練/學員" },
  { id: "messages", label: "💬 訊息" },
];

const messageIcons: Record<Message["type"], string> = {
  match_request: "🎾",
  match_accepted: "✅",
  match_declined: "❌",
  club_join: "👥",
  coach_message: "🎓",
  system: "📢",
};

export default function ProfileDashboardV2({
  cities,
  tennisLevels,
  defaultMatches,
}: ProfileDashboardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const [user, setUser] = useState<JojoUser | null>(null);
  const [profile, setProfile] = useState<Profile>({});
  const [joinedClubs, setJoinedClubs] = useState<JoinedClub[]>([]);
  const [matches, setMatches] = useState<StoredMatchPost[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [expandedMessageId, setExpandedMessageId] = useState("");
  const [confirmLeaveClub, setConfirmLeaveClub] = useState<JoinedClub | null>(
    null,
  );
  const [closingMatch, setClosingMatch] = useState<StoredMatchPost | null>(null);

  const unreadCount = useMemo(
    () => messages.filter((message) => !message.isRead).length,
    [messages],
  );

  useEffect(() => {
    if (window.location.search.includes("tab=messages")) {
      setActiveTab("messages");
    }

    setUser(getUser());
    setJoinedClubs(
      JSON.parse(
        window.localStorage.getItem(joinedClubsStorageKey) ?? "[]",
      ) as JoinedClub[],
    );
    setMatches(getMatches(defaultMatches));
    setMessages(getMessages());

    const savedProfile = window.localStorage.getItem(profileStorageKey);

    if (savedProfile) {
      setProfile(JSON.parse(savedProfile) as Profile);
    }
  }, [defaultMatches]);

  function handleLogout() {
    logout();
    router.push("/");
  }

  function leaveClub(clubId: string) {
    const nextClubs = joinedClubs.filter((club) => club.id !== clubId);

    setJoinedClubs(nextClubs);
    window.localStorage.setItem(joinedClubsStorageKey, JSON.stringify(nextClubs));
    setConfirmLeaveClub(null);
  }

  function confirmCloseMatch() {
    if (!closingMatch) {
      return;
    }

    setMatches(closeMatch(closingMatch.id, defaultMatches));
    setClosingMatch(null);
  }

  function openMessage(message: Message) {
    setExpandedMessageId(expandedMessageId === message.id ? "" : message.id);

    if (!message.isRead) {
      markMessageAsRead(message.id);
      setMessages(getMessages());
    }
  }

  function answerMatchRequest(message: Message, accepted: boolean) {
    const nextMessages = [
      {
        id: `message-${Date.now()}`,
        type: accepted ? "match_accepted" : "match_declined",
        from: user?.nickname ?? "你",
        content: accepted
          ? `✅ 你的申請已被接受！${user?.nickname ?? "你"} 接受了你的約球申請。`
          : "你申請加入的約球未被接受，歡迎繼續尋找其他約球。",
        timestamp: new Date().toLocaleString("zh-TW", { hour12: false }),
        isRead: false,
        relatedId: message.relatedId,
      } satisfies Message,
      ...getMessages(),
    ];

    saveMessages(nextMessages);
    setMessages(nextMessages);
  }

  const myMatches = matches.filter((match) => match.host === (user?.nickname ?? "你"));
  const heroTitle = user
    ? `${user.nickname} 的球友名片`
    : "建立你的球友名片";
  const heroDescription = user
    ? `${profile.tennisLevel ? `NTRP ${profile.tennisLevel}` : "NTRP 待補"} · ${
        profile.preferredCity ?? "偏好地區待補"
      } · 球齡 ${profile.yearsPlayed || "0"} 年`
    : "登入後管理你的揪球、社團與教練資訊";

  return (
    <>
      <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-parchment">
        <div className="flex items-start justify-between gap-4">
          <div>
            {user ? (
              <p className="mb-2 text-sm font-bold text-clay">
                👋 歡迎回來，{user.nickname}！
              </p>
            ) : null}
            <h1 className="text-3xl font-bold tracking-tight text-pine">
              {heroTitle}
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted">{heroDescription}</p>
          </div>
          {user ? (
            <button
              type="button"
              onClick={handleLogout}
              className="shrink-0 text-xs font-bold text-muted underline"
            >
              登出
            </button>
          ) : null}
        </div>
        {!user ? (
          <Link
            href="/auth"
            className="mt-5 flex w-full items-center justify-center rounded-full bg-clay px-4 py-3 text-sm font-bold text-white"
          >
            登入 / 免費註冊
          </Link>
        ) : null}
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

      {activeTab === "profile" ? (
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

      {activeTab === "matches" ? (
        <div className="mt-6 space-y-6">
          <section className="rounded-[1.5rem] bg-white p-5 ring-1 ring-parchment">
            <h2 className="text-xl font-bold text-pine">我發起的揪球</h2>
            <div className="mt-4 space-y-3">
              {myMatches.length > 0 ? (
                myMatches.map((match) => {
                  const isClosed =
                    match.status === "closed" || match.status === "full";

                  return (
                    <article key={match.id} className="rounded-2xl bg-ivory p-4">
                      <h3 className="font-bold text-pine">{match.title}</h3>
                      <p className="mt-1 text-sm text-muted">
                        {match.city} · {match.date} {match.time}
                      </p>
                      <button
                        type="button"
                        disabled={isClosed}
                        onClick={() => setClosingMatch(match)}
                        className={`mt-3 rounded-full px-4 py-2 text-sm font-bold ${
                          isClosed
                            ? "bg-muted/20 text-muted"
                            : "border border-pine text-pine"
                        }`}
                      >
                        {isClosed ? "已結束" : "結束招募"}
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
            <p className="mt-4 text-sm text-muted">還沒有加入過揪球</p>
            <p className="mt-2 text-xs text-muted">
              狀態：等待主揪回覆 / 已接受 ✅ / 已婉拒
            </p>
            <Link
              href="/match"
              className="mt-4 flex rounded-full bg-clay px-4 py-3 text-center text-sm font-bold text-white"
            >
              <span className="w-full">去找球友 →</span>
            </Link>
          </section>
        </div>
      ) : null}

      {activeTab === "clubs" ? (
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

      {activeTab === "messages" ? (
        <section className="mt-6 space-y-3">
          {messages.length > 0 ? (
            messages.map((message) => (
              <article
                key={message.id}
                className={`rounded-[1.5rem] border border-parchment p-4 shadow-sm ${
                  message.isRead ? "bg-white" : "bg-parchment/70"
                }`}
              >
                <button
                  type="button"
                  onClick={() => openMessage(message)}
                  className="flex w-full items-start gap-3 text-left"
                >
                  {!message.isRead ? (
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-clay" />
                  ) : (
                    <span className="mt-2 h-2 w-2 shrink-0" />
                  )}
                  <span className="text-xl">{messageIcons[message.type]}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-pine">
                      {message.from} · {message.content}
                    </span>
                    <span className="mt-1 block text-right text-xs text-muted">
                      {message.timestamp}
                    </span>
                  </span>
                </button>
                {expandedMessageId === message.id ? (
                  <div className="mt-3 rounded-2xl bg-white/70 p-4 text-sm leading-6 text-muted">
                    {message.content}
                    {message.type === "match_request" ? (
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => answerMatchRequest(message, true)}
                          className="rounded-full bg-green-600 px-4 py-2 text-sm font-bold text-white"
                        >
                          接受
                        </button>
                        <button
                          type="button"
                          onClick={() => answerMatchRequest(message, false)}
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

      {closingMatch ? (
        <div className="fixed inset-0 z-50 flex items-center bg-ink/50 p-4">
          <div className="mx-auto w-full max-w-md rounded-[1.5rem] bg-white p-5">
            <h2 className="text-xl font-bold text-pine">確定要結束這場招募嗎？</h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              結束後將不再接受新的加入申請。
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setClosingMatch(null)}
                className="rounded-full border border-pine px-4 py-3 text-sm font-bold text-pine"
              >
                再想想
              </button>
              <button
                type="button"
                onClick={confirmCloseMatch}
                className="rounded-full bg-clay px-4 py-3 text-sm font-bold text-white"
              >
                確定結束
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
