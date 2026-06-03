"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { taiwanCities } from "@/data/cities";
import { useApp, type Match } from "@/context/AppContext";
import LoginPromptModal from "@/components/LoginPromptModal";
import { useUiStore } from "@/stores/useUiStore";
import PageHero from "@/components/PageHero";

function isMatchExpired(match: Match): boolean {
  if (!match.date || !match.endTime) return false;
  const [y, mo, d] = match.date.split(/[\/\-]/).map((n) => Number.parseInt(n, 10));
  const [h, mi] = match.endTime.split(":").map((n) => Number.parseInt(n, 10));
  if (!y || !mo || !d) return false;
  const end = new Date(y, mo - 1, d, h || 0, mi || 0).getTime();
  if (Number.isNaN(end)) return false;
  return Date.now() > end;
}

const ntrpOptions = ["不限", "1", "2", "3", "4", "5", "6–7"];

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

function parsePeople(value: string) {
  return Number.parseInt(value, 10) || 1;
}

function openDatePicker(input: HTMLInputElement | null) {
  try {
    input?.showPicker?.();
  } catch {
    input?.focus();
  }
}

export default function MatchBoard() {
  const router = useRouter();
  const { user, matches, addMatch, applyMatch, getOrCreateConversation } = useApp();
  const dateInputRef = useRef<HTMLInputElement | null>(null);
  if (typeof window !== "undefined") {
    console.log("目前 matches：", matches.length);
  }
  const [loading, setLoading] = useState(matches.length === 0);
  const [activeTab, setActiveTab] = useState<"find" | "create">("find");

  useEffect(() => {
    if (matches.length > 0) setLoading(false);
    const timer = window.setTimeout(() => setLoading(false), 2500);
    return () => window.clearTimeout(timer);
  }, [matches.length]);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const setNavHidden = useUiStore((s) => s.setNavHidden);
  useEffect(() => {
    setNavHidden(isSheetOpen);
    return () => setNavHidden(false);
  }, [isSheetOpen, setNavHidden]);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
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
    joinMode: "approval" as "approval" | "private",
  });
  const [joinPrompt, setJoinPrompt] = useState<Match | null>(null);
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joinBusy, setJoinBusy] = useState(false);

  function requireLogin(action: () => void) {
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }

    action();
  }

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
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }

    const startTime = `${padHour(draft.startHour)}:${padMinute(draft.startMinute)}`;
    const endTime = `${padHour(draft.endHour)}:${padMinute(draft.endMinute)}`;
    const selectedDate = draft.date ? draft.date.replaceAll("-", "/") : "";

    addMatch({
      title: draft.title || "新的揪球邀請",
      ownerUid: user.uid,
      ownerNickname: user.nickname,
      city: draft.city,
      district: draft.district || "地區待確認",
      venue: draft.courtName || `${draft.city}${draft.district || ""}球場待確認`,
      date: selectedDate || "日期待確認",
      weekday: getWeekday(draft.date) || "週期待確認",
      startTime,
      endTime,
      ntrpRequired: draft.ntrpLevels.includes("不限") ? ["不限"] : draft.ntrpLevels,
      totalSlots: parsePeople(draft.totalPlayers),
      note: draft.notes,
      joinMode: draft.joinMode,
    });
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

  async function joinMatch(match: Match, joinCode?: string) {
    if (joinBusy) {
      return;
    }

    if (!user) {
      setShowLoginPrompt(true);
      return;
    }

    const joinMode = match.joinMode ?? "approval";
    if (joinMode === "private" && !joinCode) {
      setJoinPrompt(match);
      setJoinCodeInput("");
      setJoinError("");
      return;
    }

    setJoinBusy(true);
    setJoinError("");
    const result = await applyMatch(match.id, joinCode).catch((error) => ({
      ok: false,
      msg: error instanceof Error ? error.message : "加入球局失敗，請稍後再試",
    }));
    setJoinBusy(false);

    if (!result.ok) {
      setJoinError(result.msg);
      if (joinMode === "private") {
        setJoinPrompt(match);
      }
      return;
    }

    setJoinPrompt(null);
    const conversationId = getOrCreateConversation(match.ownerUid, match.ownerNickname, {
      type: "match",
      relatedId: match.id,
      name: `揪球：${match.title}`,
      ownerUid: match.ownerUid,
      systemMessage:
        joinMode === "approval"
          ? `你已申請加入「${match.title}」，等待主揪回覆。\n請勿在平台外提前付款，謹防詐騙。`
          : `你已加入「${match.title}」！可以在聊天室討論集合資訊。\n請勿在平台外提前付款，謹防詐騙。`,
    });
    router.push(`/messages?conversation=${conversationId}&from=match`);
  }

  function openMatchConversation(match: Match) {
    if (isMatchExpired(match) || match.status === "closed") {
      return;
    }

    if (!user) {
      setShowLoginPrompt(true);
      return;
    }

    const conversationId = getOrCreateConversation(match.ownerUid, match.ownerNickname, {
      type: "match",
      relatedId: match.id,
      name: `揪球：${match.title}`,
      ownerUid: match.ownerUid,
    });
    router.push(`/messages?conversation=${conversationId}&from=match`);
  }

  return (
    <div>
      <PageHero
        settingsKey="match"
        eyebrow="Match"
        title="揪球友"
        description="用等級、地點和可打時間找到合適的球友，讓臨打和固定練球更容易。"
        image="/images/hero/match.png"
      >
          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={() => {
                setActiveTab("find");
                setIsSheetOpen(false);
              }}
              className={`flex-1 rounded-full px-5 py-3 text-sm font-bold transition ${
                activeTab === "find"
                  ? "bg-gold text-pine shadow-[0_12px_28px_rgba(201,168,76,0.25)]"
                  : "border border-white/25 bg-white/10 text-white"
              }`}
            >
              找球友
            </button>
            <button
              type="button"
              onClick={() => {
                requireLogin(() => {
                  setActiveTab("create");
                  setIsSheetOpen(true);
                });
              }}
              className={`flex-1 rounded-full px-5 py-3 text-sm font-bold transition ${
                activeTab === "create"
                  ? "bg-gold text-pine shadow-[0_12px_28px_rgba(201,168,76,0.25)]"
                  : "border border-white/25 bg-white/10 text-white"
              }`}
            >
              我要揪球
            </button>
          </div>
      </PageHero>

      <div className="mt-6 divide-y divide-pine/10 border-y border-pine/10 bg-white shadow-[0_16px_48px_rgba(30,61,47,0.07)]">
        {loading ? (
          <div className="flex min-h-[200px] items-center justify-center text-sm text-muted">
            載入中...
          </div>
        ) : matches.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-muted">目前沒有資料</div>
        ) : null}
        {!loading
          ? matches.map((match) => {
          const remaining = Math.max(match.totalSlots - match.filledSlots, 0);
          const isExpired = isMatchExpired(match);
          const isClosed = match.status === "closed" || isExpired;
          const isFull = remaining === 0;
          const myApplication = match.applicants.find((applicant) => applicant.uid === user?.uid);
          const hasApplied = Boolean(myApplication);
          const isOwner = user?.uid === match.ownerUid;
          return (
            <article
              key={match.id}
              onClick={isClosed ? undefined : () => openMatchConversation(match)}
              aria-disabled={isClosed}
              className={`px-5 py-5 ${isClosed ? "cursor-default opacity-75" : "cursor-pointer"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-bold text-pine">{match.title}</h2>
                  <p className="mt-1 text-sm text-muted">
                    {match.city}・{match.district || "地區待確認"}
                    {(match.joinMode ?? "approval") === "public"
                      ? " · 公開"
                      : (match.joinMode ?? "approval") === "private"
                        ? " · 私人"
                        : ""}
                  </p>
                </div>
                {isClosed ? (
                  <span className="rounded-full bg-muted/20 px-3 py-1 text-xs font-bold text-muted">
                    已結束
                  </span>
                ) : isFull ? (
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                    招募完成
                  </span>
                ) : null}
              </div>
              <div className="relative mt-3">
                <div className={!user ? "blur-sm" : undefined}>
                  <p className="text-sm leading-6 text-muted">
                    主揪：{match.ownerNickname}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-muted">
                    {match.weekday} {match.date}　{match.startTime}–{match.endTime}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    NTRP {match.ntrpRequired.join("、")}　{match.filledSlots}/
                    {match.totalSlots} 人・還差 {remaining} 人
                  </p>
                  {match.note ? (
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">
                      {match.note}
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
              {!isClosed ? (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      openMatchConversation(match);
                    }}
                    className="flex h-11 items-center justify-center rounded-lg border border-pine text-sm font-bold text-pine"
                  >
                    開啟聊天室
                  </button>
                  <button
                    type="button"
                    disabled={joinBusy || hasApplied || isOwner || isFull}
                    onClick={(event) => {
                      event.stopPropagation();
                      void joinMatch(match);
                    }}
                    className={`flex h-11 items-center justify-center rounded-lg text-sm font-bold text-white ${
                      joinBusy || hasApplied || isOwner || isFull ? "bg-muted" : "bg-clay"
                    }`}
                  >
                    {joinBusy
                      ? "處理中"
                      : myApplication?.status === "accepted"
                      ? "已加入"
                      : myApplication?.status === "pending"
                        ? "待主揪核准"
                        : hasApplied
                          ? "已申請"
                      : isOwner
                        ? "你是主揪"
                        : isFull
                          ? "招募已滿"
                          : "我要加入"}
                  </button>
                </div>
              ) : null}
            </article>
          );
          })
          : null}
      </div>

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
              ×
            </button>
            <h2 className="text-2xl font-bold text-pine">發起揪球邀請</h2>
            <p className="mt-1 text-sm text-muted">
              以 {user?.nickname ?? "你"} 的身份發起
            </p>

            <form onSubmit={handleCreatePost} className="mt-5 space-y-4">
              <label className="block">
                <span className="text-xs font-semibold text-muted">加入方式</span>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDraft((current) => ({ ...current, joinMode: "approval" }))}
                    className={`rounded-2xl border px-4 py-3 text-sm font-bold ${
                      draft.joinMode === "approval"
                        ? "border-clay bg-clay/10 text-clay"
                        : "border-parchment bg-ivory text-muted"
                    }`}
                  >
                    需核准
                    <span className="mt-1 block text-xs font-normal">主揪同意後加入</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraft((current) => ({ ...current, joinMode: "private" }))}
                    className={`rounded-2xl border px-4 py-3 text-sm font-bold ${
                      draft.joinMode === "private"
                        ? "border-clay bg-clay/10 text-clay"
                        : "border-parchment bg-ivory text-muted"
                    }`}
                  >
                    私人
                    <span className="mt-1 block text-xs font-normal">自動產生加入碼</span>
                  </button>
                </div>
              </label>

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
                    ref={dateInputRef}
                    required
                    type="date"
                    value={draft.date}
                    onClick={(event) => {
                      openDatePicker(event.currentTarget);
                    }}
                    onFocus={(event) => {
                      openDatePicker(event.currentTarget);
                    }}
                    onChange={(event) => updateDraft("date", event.target.value)}
                    className="w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay"
                  />
                  <button
                    type="button"
                    onClick={() => openDatePicker(dateInputRef.current)}
                    className="shrink-0 rounded-full border border-parchment px-3 py-2 text-xs font-bold text-clay"
                  >
                    日曆
                  </button>
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
                {draft.joinMode === "approval"
                  ? "需核准球局：球友申請後，需主揪同意才能發送聊天室訊息。"
                  : "私人球局：系統會產生 6 位數加入碼，分享給朋友即可加入。"}
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

      {joinPrompt ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-[1.5rem] bg-white p-6 shadow-lg">
            <h3 className="text-lg font-bold text-pine">輸入加入碼</h3>
            <p className="mt-2 text-sm text-muted">
              「{joinPrompt.title}」為私人球局，請向主揪索取 6 位數加入碼。
            </p>
            <input
              inputMode="numeric"
              maxLength={6}
              value={joinCodeInput}
              onChange={(event) => setJoinCodeInput(event.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="mt-4 w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-center text-lg tracking-[0.3em] outline-none focus:border-clay"
            />
            {joinError ? <p className="mt-2 text-sm text-red-600">{joinError}</p> : null}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setJoinPrompt(null);
                  setJoinError("");
                }}
                className="rounded-full border border-parchment px-4 py-3 text-sm font-bold text-muted"
              >
                取消
              </button>
              <button
                type="button"
                disabled={joinBusy || joinCodeInput.length !== 6}
                onClick={() => void joinMatch(joinPrompt, joinCodeInput)}
                className="rounded-full bg-clay px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                確認加入
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
