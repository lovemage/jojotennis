"use client";

import { useEffect, useMemo, useState } from "react";
import { taiwanCities } from "@/data/cities";
import type { MatchPost } from "@/data/matchPosts";
import { getUser, type JojoUser } from "@/lib/auth";
import { addMessage } from "@/lib/messageStore";
import {
  closeMatch,
  getMatches,
  saveMatches,
  type StoredMatchPost,
} from "@/lib/matchStore";
import LoginPromptModal from "@/components/LoginPromptModal";

type MatchBoardProps = {
  posts: MatchPost[];
};

type JoinModalState =
  | { step: "confirm"; post: StoredMatchPost }
  | { step: "success"; post: StoredMatchPost }
  | null;

const profileStorageKey = "tennis-tw-profile";
const ntrpOptions = ["不限", "1.0–1.5", "2.0–2.5", "3.0–3.5", "4.0–4.5", "5.0以上"];

function padHour(value: string) {
  const numberValue = Number(value);
  return String(Math.min(Math.max(Number.isNaN(numberValue) ? 0 : numberValue, 0), 23)).padStart(2, "0");
}

function padMinute(value: string) {
  const numberValue = Number(value);
  return String(Math.min(Math.max(Number.isNaN(numberValue) ? 0 : numberValue, 0), 59)).padStart(2, "0");
}

function getWeekday(date: string) {
  if (!date) {
    return "";
  }

  return ["週日", "週一", "週二", "週三", "週四", "週五", "週六"][
    new Date(`${date}T00:00:00`).getDay()
  ];
}

function formatDate(date: string) {
  return date ? `${getWeekday(date)} ${date.replaceAll("-", "/")}` : "日期待確認";
}

function parsePeople(value: string) {
  return Number.parseInt(value, 10) || 1;
}

export default function MatchBoard({ posts }: MatchBoardProps) {
  const [activeTab, setActiveTab] = useState<"find" | "create">("find");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [allPosts, setAllPosts] = useState<StoredMatchPost[]>(
    posts as StoredMatchPost[],
  );
  const [nickname, setNickname] = useState("你");
  const [user, setUser] = useState<JojoUser | null>(null);
  const [joinModal, setJoinModal] = useState<JoinModalState>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [closingPost, setClosingPost] = useState<StoredMatchPost | null>(null);
  const [expandedApplications, setExpandedApplications] = useState("");
  const [applications, setApplications] = useState<Record<string, number>>({});
  const [draft, setDraft] = useState({
    title: "",
    city: "台北市",
    district: "",
    courtName: "",
    date: "",
    startHour: "09",
    startMinute: "00",
    endHour: "11",
    endMinute: "00",
    ntrpLevels: ["不限"],
    totalPlayers: "4人",
    spotsNeeded: "2人",
    notes: "",
  });

  useEffect(() => {
    const savedProfile = window.localStorage.getItem(profileStorageKey);
    const currentUser = getUser();

    setAllPosts(getMatches(posts));
    setUser(currentUser);

    if (savedProfile) {
      const profile = JSON.parse(savedProfile) as { nickname?: string };
      setNickname(profile.nickname || "你");
    }

    if (currentUser) {
      setNickname(currentUser.nickname || "你");
    }
  }, [posts]);

  function requireLogin(action: () => void) {
    if (!getUser()) {
      setShowLoginPrompt(true);
      return;
    }

    action();
  }

  const myPosts = useMemo(
    () => allPosts.filter((post) => post.host === nickname || applications[post.id]),
    [allPosts, applications, nickname],
  );

  function updateDraft(field: keyof typeof draft, value: string) {
    setDraft((currentDraft) => ({ ...currentDraft, [field]: value }));
  }

  function closeSheet() {
    setIsSheetOpen(false);
    setActiveTab("find");
  }

  function handleDragEnd(event: React.PointerEvent<HTMLButtonElement>) {
    const startY = Number(event.currentTarget.dataset.startY ?? 0);
    const movedY = event.clientY - startY;

    if (movedY > 100) {
      closeSheet();
    }
  }

  function toggleNtrpLevel(option: string) {
    setDraft((currentDraft) => {
      if (option === "不限") {
        return { ...currentDraft, ntrpLevels: ["不限"] };
      }

      const withoutAny = currentDraft.ntrpLevels.filter(
        (level) => level !== "不限",
      );
      const nextLevels = withoutAny.includes(option)
        ? withoutAny.filter((level) => level !== option)
        : [...withoutAny, option];

      return {
        ...currentDraft,
        ntrpLevels: nextLevels.length > 0 ? nextLevels : ["不限"],
      };
    });
  }

  function handleCreatePost(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const startTime = `${padHour(draft.startHour)}:${padMinute(draft.startMinute)}`;
    const endTime = `${padHour(draft.endHour)}:${padMinute(draft.endMinute)}`;
    const post: StoredMatchPost = {
      id: `match-${Date.now()}`,
      title: draft.title || "新的揪球邀請",
      city: draft.city,
      district: draft.district,
      courtName: draft.courtName || `${draft.city}${draft.district || ""}球場待確認`,
      date: formatDate(draft.date),
      time: `${startTime}–${endTime}`,
      level: draft.ntrpLevels.includes("不限")
        ? "不限"
        : `NTRP ${draft.ntrpLevels.join("、")}`,
      spotsNeeded: parsePeople(draft.spotsNeeded),
      format: `總人數 ${draft.totalPlayers}`,
      status: "open",
      host: nickname,
      notes: draft.notes,
    };
    const nextPosts = [post, ...allPosts];

    setAllPosts(nextPosts);
    saveMatches(nextPosts);
    setDraft((currentDraft) => ({
      ...currentDraft,
      title: "",
      district: "",
      courtName: "",
      date: "",
      notes: "",
    }));
    closeSheet();
  }

  function confirmJoin(post: StoredMatchPost) {
    setApplications((current) => ({
      ...current,
      [post.id]: (current[post.id] ?? 0) + 1,
    }));
    addMessage({
      type: "match_request",
      from: user?.nickname ?? "你",
      content: `${user?.nickname ?? "你"} 申請加入你的「${post.title}」`,
      relatedId: post.id,
    });
    setJoinModal({ step: "success", post });
  }

  function finishClosingRecruitment() {
    if (!closingPost) {
      return;
    }

    setAllPosts(closeMatch(closingPost.id, posts));
    setClosingPost(null);
  }

  return (
    <div className="mt-6">
      <div className="flex justify-center gap-3">
        <button
          type="button"
          onClick={() => {
            setActiveTab("find");
            setIsSheetOpen(false);
          }}
          className={`rounded-full px-5 py-3 text-sm font-bold ${
            activeTab === "find" ? "bg-clay text-white" : "bg-parchment text-ink"
          }`}
        >
          🎾 找球友
        </button>
        <button
          type="button"
          onClick={() => {
            requireLogin(() => {
              setActiveTab("create");
              setIsSheetOpen(true);
            });
          }}
          className={`rounded-full px-5 py-3 text-sm font-bold ${
            activeTab === "create" ? "bg-clay text-white" : "bg-parchment text-ink"
          }`}
        >
          ✚ 我要揪球
        </button>
      </div>

      <div className="mt-6 space-y-3">
        {allPosts.map((post) => {
          const isClosed = post.status === "closed" || post.status === "full";

          return (
            <article
              key={post.id}
              className="rounded-[1.5rem] border border-parchment bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-bold text-pine">{post.title}</h2>
                  <p className="mt-1 text-sm text-muted">
                    {post.city}・{post.district || "地區待確認"}
                  </p>
                </div>
                {isClosed ? (
                  <span className="rounded-full bg-muted/20 px-3 py-1 text-xs font-bold text-muted">
                    已結束
                  </span>
                ) : null}
              </div>
              <div className="relative mt-3">
                <div className={!user ? "blur-sm" : undefined}>
                  <p className="text-sm leading-6 text-muted">
                    主揪：{post.host}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-muted">
                    📅 {post.date}　⏰ {post.time}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    🎾 {post.level}　👥 還差 {post.spotsNeeded} 人
                  </p>
                  {post.notes ? (
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">
                      {post.notes}
                    </p>
                  ) : null}
                </div>
                {!user ? (
                  <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/70">
                    <button
                      type="button"
                      onClick={() => setShowLoginPrompt(true)}
                      className="text-sm font-bold text-clay underline"
                    >
                      登入後查看完整資訊
                    </button>
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                disabled={isClosed}
                onClick={() =>
                  requireLogin(() => setJoinModal({ step: "confirm", post }))
                }
                className={`mt-4 flex h-11 w-full items-center justify-center rounded-lg text-sm font-bold text-white ${
                  isClosed ? "bg-muted" : "bg-clay"
                }`}
              >
                {isClosed ? "招募已結束" : "我要加入"}
              </button>
            </article>
          );
        })}
      </div>

      <section className="mt-8">
        <h2 className="text-xl font-bold text-pine">我的約球</h2>
        <div className="mt-4 space-y-3">
          {myPosts.map((post) => {
            const isClosed = post.status === "closed" || post.status === "full";

            return (
            <article
              key={`my-${post.id}`}
              className="rounded-[1.5rem] border border-parchment bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-pine">{post.title}</h3>
                  <p className="mt-1 text-sm text-muted">
                    {post.date} · {post.time}
                  </p>
                </div>
                {applications[post.id] ? (
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedApplications(
                        expandedApplications === post.id ? "" : post.id,
                      )
                    }
                    className="rounded-full bg-gold/20 px-3 py-1 text-xs font-bold text-clay"
                  >
                    🔔 {applications[post.id]} 人想加入
                  </button>
                ) : null}
              </div>

              {expandedApplications === post.id ? (
                <div className="mt-4 rounded-2xl bg-ivory p-4">
                  <p className="text-sm font-semibold text-pine">
                    球友小林 · 剛剛送出申請
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        addMessage({
                          type: "match_accepted",
                          from: nickname,
                          content: `✅ 你的申請已被接受！${nickname} 接受了你加入「${post.title}」`,
                          relatedId: post.id,
                        })
                      }
                      className="rounded-full bg-green-600 px-4 py-2 text-sm font-bold text-white"
                    >
                      接受
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        addMessage({
                          type: "match_declined",
                          from: nickname,
                          content: `你申請加入「${post.title}」未被接受，歡迎繼續尋找其他約球。`,
                          relatedId: post.id,
                        })
                      }
                      className="rounded-full border border-pine px-4 py-2 text-sm font-bold text-pine"
                    >
                      婉拒
                    </button>
                  </div>
                </div>
              ) : null}
              <button
                type="button"
                disabled={isClosed}
                onClick={() => setClosingPost(post)}
                className={`mt-4 rounded-full px-4 py-2 text-sm font-bold ${
                  isClosed
                    ? "bg-muted/20 text-muted"
                    : "border border-pine text-pine"
                }`}
              >
                {isClosed ? "已結束" : "結束招募"}
              </button>
            </article>
            );
          })}
        </div>
      </section>

      {isSheetOpen ? (
        <div className="fixed inset-0 z-40 bg-ink/40" onClick={closeSheet}>
          <div
            className="absolute inset-x-0 bottom-0 mx-auto max-h-[88vh] max-w-md overflow-y-auto rounded-t-[2rem] bg-white p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              aria-label="關閉表單"
              onPointerDown={(event) => {
                event.currentTarget.dataset.startY = String(event.clientY);
              }}
              onPointerUp={handleDragEnd}
              onClick={(event) => event.stopPropagation()}
              className="mx-auto mb-4 block h-1.5 w-12 rounded-full bg-muted/40"
            />
            <button
              type="button"
              aria-label="關閉"
              onClick={closeSheet}
              className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-parchment text-sm font-bold text-muted"
            >
              ✕
            </button>
            <h2 className="text-2xl font-bold text-pine">發起揪球邀請</h2>
            <p className="mt-1 text-sm text-muted">以 {nickname} 的身份發起</p>

            <form onSubmit={handleCreatePost} className="mt-5 space-y-4">
              <label className="block">
                <span className="text-xs font-semibold text-muted">標題</span>
                <input
                  required
                  value={draft.title}
                  onChange={(event) => updateDraft("title", event.target.value)}
                  placeholder="例：週末雙打缺二，歡迎新手"
                  className="mt-2 w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay"
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-muted">縣市</span>
                <select
                  required
                  value={draft.city}
                  onChange={(event) => updateDraft("city", event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay"
                >
                  {taiwanCities.map((city) => (
                    <option key={city}>{city}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-muted">地區</span>
                <input
                  value={draft.district}
                  onChange={(event) => updateDraft("district", event.target.value)}
                  placeholder="例：大安區"
                  className="mt-2 w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay"
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-muted">球場名稱</span>
                <input
                  value={draft.courtName}
                  onChange={(event) => updateDraft("courtName", event.target.value)}
                  placeholder="例：大安森林公園網球場"
                  className="mt-2 w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay"
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-muted">日期</span>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    required
                    type="date"
                    value={draft.date}
                    onChange={(event) => updateDraft("date", event.target.value)}
                    className="w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay"
                  />
                  <span className="shrink-0 text-sm font-bold text-clay">
                    {getWeekday(draft.date)}
                  </span>
                </div>
              </label>

              <div>
                <span className="text-xs font-semibold text-muted">
                  開始 → 結束時間
                </span>
                <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  {(["start", "end"] as const).map((side, index) => (
                    <div key={side} className="contents">
                      {index === 1 ? <span className="text-muted">→</span> : null}
                      <div className="flex rounded-2xl border border-parchment bg-ivory px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          max="23"
                          value={side === "start" ? draft.startHour : draft.endHour}
                          onChange={(event) =>
                            updateDraft(
                              side === "start" ? "startHour" : "endHour",
                              event.target.value,
                            )
                          }
                          placeholder="09"
                          className="w-full bg-transparent text-center text-sm outline-none"
                        />
                        <span className="text-muted">:</span>
                        <input
                          type="number"
                          min="0"
                          max="59"
                          value={
                            side === "start"
                              ? draft.startMinute
                              : draft.endMinute
                          }
                          onChange={(event) =>
                            updateDraft(
                              side === "start" ? "startMinute" : "endMinute",
                              event.target.value,
                            )
                          }
                          placeholder="00"
                          className="w-full bg-transparent text-center text-sm outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-muted">
                  NTRP 等級需求（可複選）
                </span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {ntrpOptions.map((option) => {
                    const isSelected = draft.ntrpLevels.includes(option);

                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => toggleNtrpLevel(option)}
                        className={`rounded-[20px] border px-[14px] py-1.5 text-sm font-semibold ${
                          isSelected
                            ? "border-clay bg-clay text-white"
                            : "border-[#DDDDDD] bg-parchment text-ink"
                        }`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs leading-5 text-muted">
                  1＝初學  2＝入門  3＝中級  4＝中高級  5＝高級  6–7＝職業
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-semibold text-muted">總人數</span>
                  <select
                    required
                    value={draft.totalPlayers}
                    onChange={(event) =>
                      updateDraft("totalPlayers", event.target.value)
                    }
                    className="mt-2 w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay"
                  >
                    <option>2人</option>
                    <option>3人</option>
                    <option>4人</option>
                    <option>5人</option>
                    <option>6人</option>
                    <option>6人以上</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs font-semibold text-muted">還差幾人</span>
                  <select
                    required
                    value={draft.spotsNeeded}
                    onChange={(event) =>
                      updateDraft("spotsNeeded", event.target.value)
                    }
                    className="mt-2 w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay"
                  >
                    <option>1人</option>
                    <option>2人</option>
                    <option>3人</option>
                    <option>4人</option>
                    <option>5人</option>
                    <option>6人以上</option>
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="text-xs font-semibold text-muted">備註</span>
                <textarea
                  value={draft.notes}
                  onChange={(event) =>
                    updateDraft("notes", event.target.value.slice(0, 100))
                  }
                  rows={4}
                  placeholder="例：找雙打搭檔、歡迎單打互練、新手友善、穩定對打優先..."
                  className="mt-2 w-full resize-none rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm leading-6 outline-none focus:border-clay"
                />
                <span className="float-right text-xs text-muted">
                  {draft.notes.length}/100
                </span>
              </label>

              <p className="pt-2 text-center text-xs text-muted">
                發布後有球友送出加入申請，由你決定是否接受。
              </p>
              <button
                type="submit"
                className="flex h-12 w-full items-center justify-center rounded-lg bg-clay text-sm font-bold text-white"
              >
                發布揪球邀請
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {joinModal ? (
        <div className="fixed inset-0 z-50 flex items-center bg-ink/50 p-4">
          <div className="mx-auto w-full max-w-md rounded-[1.5rem] bg-white p-5">
            {joinModal.step === "confirm" ? (
              <>
                <h2 className="text-xl font-bold text-pine">確認加入這場約球？</h2>
                <div className="mt-4 rounded-2xl bg-ivory p-4 text-sm leading-7 text-muted">
                  <p>時間：{joinModal.post.date} {joinModal.post.time}</p>
                  <p>地點：{joinModal.post.courtName}</p>
                  <p>主揪：{joinModal.post.host}</p>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setJoinModal(null)}
                    className="rounded-full border border-pine px-4 py-3 text-sm font-bold text-pine"
                  >
                    再想想
                  </button>
                  <button
                    type="button"
                    onClick={() => confirmJoin(joinModal.post)}
                    className="rounded-full bg-clay px-4 py-3 text-sm font-bold text-white"
                  >
                    確認加入
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-center text-5xl">✅</p>
                <h2 className="mt-4 text-center text-xl font-bold text-pine">
                  已送出加入申請！
                </h2>
                <p className="mt-3 text-center text-sm leading-6 text-muted">
                  已通知主揪，請耐心等待對方回覆。
                </p>
                <p className="mt-4 text-xs leading-6 text-red-600">
                  ⚠️ 安全提醒：請勿在平台外提前付款或轉帳，謹防詐騙。
                  揪揪網球不對場外行為及媒合結果負責。
                </p>
                <button
                  type="button"
                  onClick={() => setJoinModal(null)}
                  className="mt-5 w-full rounded-full bg-clay px-4 py-3 text-sm font-bold text-white"
                >
                  返回找球友
                </button>
              </>
            )}
          </div>
        </div>
      ) : null}
      {closingPost ? (
        <div className="fixed inset-0 z-50 flex items-center bg-ink/50 p-4">
          <div className="mx-auto w-full max-w-md rounded-[1.5rem] bg-white p-5">
            <h2 className="text-xl font-bold text-pine">確定要結束這場招募嗎？</h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              結束後將不再接受新的加入申請。
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setClosingPost(null)}
                className="rounded-full border border-pine px-4 py-3 text-sm font-bold text-pine"
              >
                再想想
              </button>
              <button
                type="button"
                onClick={finishClosingRecruitment}
                className="rounded-full bg-clay px-4 py-3 text-sm font-bold text-white"
              >
                確定結束
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <LoginPromptModal
        isOpen={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
      />
    </div>
  );
}
