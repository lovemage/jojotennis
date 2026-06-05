"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { taiwanCities } from "@/data/cities";
import { useApp, type Match } from "@/context/AppContext";
import LoginPromptModal from "@/components/LoginPromptModal";
import { useUiStore } from "@/stores/useUiStore";
import PageHero from "@/components/PageHero";
import { MatchCapacityProgress, MatchStartCountdown } from "@/components/MatchStatusIndicators";

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
const allCityFilterLabel = "全部縣市";

type MatchBoardProps = {
  initialCityFilter?: string;
  initialTitleFilter?: string;
  initialTimeFilter?: string;
};

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

function canOpenMatchConversation(match: Match, uid?: string) {
  if (!uid) return false;
  if (match.ownerUid === uid) return true;
  return match.applicants.some((applicant) => applicant.uid === uid && applicant.status === "accepted");
}

function isFirebaseQuotaError(message: string) {
  return message.includes("Quota exceeded") || message.includes("resource-exhausted");
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), timeoutMs);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function getMatchConversationBlockedMessage(match: Match, uid?: string) {
  const application = match.applicants.find((applicant) => applicant.uid === uid);
  if (application?.status === "pending") {
    return "主揪核准前，暫時無法開啟聊天室。";
  }
  return "加入球局並經主揪核准後才能開啟聊天室。";
}

export default function MatchBoard({
  initialCityFilter = "",
  initialTitleFilter = "",
  initialTimeFilter = "",
}: MatchBoardProps) {
  const router = useRouter();
  const { user, matches, addMatch, updateMatchSettings, applyMatch, getOrCreateConversation } = useApp();
  const dateInputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(matches.length === 0);
  const [activeTab, setActiveTab] = useState<"find" | "create">("find");
  const [cityFilter, setCityFilter] = useState(() =>
    initialCityFilter && (taiwanCities as readonly string[]).includes(initialCityFilter)
      ? initialCityFilter
      : allCityFilterLabel,
  );
  const [titleFilter, setTitleFilter] = useState(initialTitleFilter);
  const [timeFilter, setTimeFilter] = useState(initialTimeFilter);

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
  const [joiningMatchId, setJoiningMatchId] = useState<string | null>(null);
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState("");
  const [chatSettingsMatch, setChatSettingsMatch] = useState<Match | null>(null);
  const [chatSettingsSaving, setChatSettingsSaving] = useState(false);
  const [chatSettingsError, setChatSettingsError] = useState("");
  const [chatSettings, setChatSettings] = useState({
    name: "",
    city: "台北市",
    district: "",
    venue: "",
    date: "",
    startHour: "09",
    startMinute: "00",
    endHour: "11",
    endMinute: "00",
    totalSlots: "4",
    ntrpRequired: ["不限"],
    joinMode: "approval" as "approval" | "private",
    message: "",
  });

  const filteredMatches = useMemo(() => {
    const keyword = titleFilter.trim().toLowerCase();
    const targetDate = timeFilter.trim().replaceAll("/", "-");

    return matches.filter((match) => {
      if (cityFilter !== allCityFilterLabel && match.city !== cityFilter) return false;

      if (keyword) {
        const haystack = `${match.title} ${match.city} ${match.district} ${match.ownerNickname} ${match.ntrpRequired.join(" ")}`.toLowerCase();
        if (!haystack.includes(keyword)) return false;
      }

      if (targetDate) {
        if (match.date.replaceAll("/", "-") !== targetDate) return false;
      }

      return true;
    });
  }, [cityFilter, matches, timeFilter, titleFilter]);

  const hasActiveFilter =
    cityFilter !== allCityFilterLabel || titleFilter.trim().length > 0 || timeFilter.trim().length > 0;

  function clearMatchFilters() {
    setCityFilter(allCityFilterLabel);
    setTitleFilter("");
    setTimeFilter("");
  }

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

  function updateChatSettings(field: keyof typeof chatSettings, value: string) {
    setChatSettings((current) => ({ ...current, [field]: value }));
  }

  function toggleChatNtrpLevel(option: string) {
    setChatSettings((current) => {
      if (option === "不限") {
        return { ...current, ntrpRequired: ["不限"] };
      }

      const withoutAny = current.ntrpRequired.filter((level) => level !== "不限");
      const nextLevels = withoutAny.includes(option)
        ? withoutAny.filter((level) => level !== option)
        : [...withoutAny, option];

      return {
        ...current,
        ntrpRequired: nextLevels.length > 0 ? nextLevels : ["不限"],
      };
    });
  }

  async function handleCreatePost(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (createBusy) return;
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }

    const startTime = `${padHour(draft.startHour)}:${padMinute(draft.startMinute)}`;
    const endTime = `${padHour(draft.endHour)}:${padMinute(draft.endMinute)}`;
    const selectedDate = draft.date ? draft.date.replaceAll("-", "/") : "";

    setCreateBusy(true);
    setCreateError("");
    try {
      const title = draft.title || "新的揪球邀請";
      const matchId = await withTimeout(
        addMatch({
          title,
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
        }),
        15000,
        "Firebase 配額已用完或連線逾時，暫時無法確認球局是否建立成功。請稍後重新整理確認。",
      );
      const conversationId = getOrCreateConversation(user.uid, user.nickname, {
        type: "match",
        relatedId: matchId,
        name: `揪球：${title}`,
        ownerUid: user.uid,
        systemMessage: `主揪已開啟「${title}」聊天室，請在這裡確認集合地點、費用與注意事項。\n請勿在平台外提前付款，謹防詐騙。`,
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
      router.push(`/messages?conversation=${conversationId || `match_${matchId}`}&from=match`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "建立球局失敗，請稍後再試";
      setCreateError(
        isFirebaseQuotaError(message)
          ? "Firebase 配額已用完，暫時無法建立球局。請稍後再試或升級/重置 Firestore 配額。"
          : message,
      );
    } finally {
      setCreateBusy(false);
    }
  }

  async function joinMatch(match: Match, joinCode?: string) {
    if (joiningMatchId) {
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

    setJoiningMatchId(match.id);
    setJoinError("");
    const result = await applyMatch(match.id, joinCode).catch((error) => ({
      ok: false,
      msg: error instanceof Error ? error.message : "加入球局失敗，請稍後再試",
    }));
    setJoiningMatchId(null);

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

  function openMatchChatSettings(match: Match) {
    if (isMatchExpired(match) || match.status === "closed") {
      return;
    }

    if (!user) {
      setShowLoginPrompt(true);
      return;
    }

    const [startHour = "09", startMinute = "00"] = match.startTime.split(":");
    const [endHour = "11", endMinute = "00"] = match.endTime.split(":");
    setChatSettingsMatch(match);
    setChatSettingsError("");
    setChatSettings({
      name: `揪球：${match.title}`,
      city: match.city,
      district: match.district,
      venue: match.venue,
      date: match.date.replaceAll("/", "-"),
      startHour,
      startMinute,
      endHour,
      endMinute,
      totalSlots: String(match.totalSlots),
      ntrpRequired: match.ntrpRequired.length > 0 ? match.ntrpRequired : ["不限"],
      joinMode: match.joinMode === "private" ? "private" : "approval",
      message: `主揪已開啟「${match.title}」聊天室，請在這裡確認集合地點、費用與注意事項。\n請勿在平台外提前付款，謹防詐騙。`,
    });
  }

  function openMatchConversation(match: Match) {
    if (isMatchExpired(match) || match.status === "closed") {
      return;
    }

    if (!user) {
      setShowLoginPrompt(true);
      return;
    }

    if (!canOpenMatchConversation(match, user.uid)) {
      alert(getMatchConversationBlockedMessage(match, user.uid));
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

  async function confirmMatchConversationSettings() {
    if (!chatSettingsMatch || !user) return;

    const match = chatSettingsMatch;
    const startTime = `${padHour(chatSettings.startHour)}:${padMinute(chatSettings.startMinute)}`;
    const endTime = `${padHour(chatSettings.endHour)}:${padMinute(chatSettings.endMinute)}`;
    const selectedDate = chatSettings.date ? chatSettings.date.replaceAll("-", "/") : match.date;
    const totalSlots = parsePeople(chatSettings.totalSlots);

    setChatSettingsSaving(true);
    setChatSettingsError("");
    const result = await updateMatchSettings(match.id, {
      city: chatSettings.city,
      district: chatSettings.district || "地區待確認",
      venue: chatSettings.venue || `${chatSettings.city}${chatSettings.district || ""}球場待確認`,
      date: selectedDate,
      startTime,
      endTime,
      ntrpRequired: chatSettings.ntrpRequired,
      totalSlots,
      joinMode: chatSettings.joinMode,
    });
    setChatSettingsSaving(false);

    if (!result.ok) {
      setChatSettingsError(result.msg);
      return;
    }

    const conversationId = getOrCreateConversation(match.ownerUid, match.ownerNickname, {
      type: "match",
      relatedId: match.id,
      name: chatSettings.name.trim() || `揪球：${match.title}`,
      ownerUid: match.ownerUid,
      systemMessage: chatSettings.message.trim() || undefined,
    });
    setChatSettingsMatch(null);
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
        <div className="px-5 py-4">
          <p className="text-sm font-bold text-pine">快速篩選（3 欄）</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <label>
              <span className="text-xs font-semibold text-muted">縣市</span>
              <select
                value={cityFilter}
                onChange={(event) => setCityFilter(event.target.value)}
                className="mt-2 w-full rounded-full border border-pine/20 bg-ivory px-3 py-3 text-sm text-ink outline-none focus:border-clay"
              >
                <option>{allCityFilterLabel}</option>
                {taiwanCities.map((city) => (
                  <option key={city}>{city}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="text-xs font-semibold text-muted">標題</span>
              <input
                value={titleFilter}
                onChange={(event) => setTitleFilter(event.target.value)}
                placeholder="輸入球局關鍵字"
                className="mt-2 w-full rounded-full border border-pine/20 bg-ivory px-4 py-3 text-sm outline-none placeholder:text-muted focus:border-clay"
              />
            </label>
            <label>
              <span className="text-xs font-semibold text-muted">時間</span>
              <input
                type="date"
                value={timeFilter}
                onChange={(event) => setTimeFilter(event.target.value)}
                className="mt-2 w-full rounded-full border border-pine/20 bg-ivory px-4 py-3 text-sm outline-none focus:border-clay"
              />
            </label>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-muted">
              目前
              <span className="mx-1 font-bold text-pine">{filteredMatches.length}</span>
              筆
            </p>
            <button
              type="button"
              onClick={clearMatchFilters}
              disabled={!hasActiveFilter}
              className="rounded-full border border-pine px-3 py-1.5 text-xs font-bold text-pine disabled:cursor-not-allowed disabled:opacity-50"
            >
              清除
            </button>
          </div>
        </div>
        {loading ? (
          <div className="flex min-h-[200px] items-center justify-center text-sm text-muted">
            載入中...
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-muted">目前沒有資料</div>
        ) : null}
        {!loading
          ? filteredMatches.map((match) => {
          const remaining = Math.max(match.totalSlots - match.filledSlots, 0);
          const isExpired = isMatchExpired(match);
          const isClosed = match.status === "closed" || isExpired;
          const isFull = remaining === 0;
          const myApplication = match.applicants.find((applicant) => applicant.uid === user?.uid);
          const hasApplied = Boolean(myApplication);
          const isOwner = user?.uid === match.ownerUid;
          const canOpenChat = canOpenMatchConversation(match, user?.uid);
          const isPendingApproval = myApplication?.status === "pending";
          const isAccepted = myApplication?.status === "accepted";
          const actionColumns = isOwner ? "grid-cols-2" : "grid-cols-1";
          const isJoiningThisMatch = joiningMatchId === match.id;
          return (
            <article
              key={match.id}
              onClick={isClosed ? undefined : () => openMatchConversation(match)}
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
                    NTRP {match.ntrpRequired.join("、")}
                  </p>
                  <MatchCapacityProgress
                    current={match.filledSlots}
                    total={match.totalSlots}
                    className="mt-2"
                  />
                  <MatchStartCountdown
                    date={match.date}
                    startTime={match.startTime}
                    live
                    compact
                    className="mt-1.5"
                  />
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
                <div className={`mt-4 grid gap-3 ${actionColumns}`}>
                  {canOpenChat ? (
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
                  ) : isPendingApproval ? (
                    <button
                      type="button"
                      disabled
                      onClick={(event) => event.stopPropagation()}
                      className="flex h-11 items-center justify-center rounded-lg border border-muted/30 text-sm font-bold text-muted"
                    >
                      等待核准
                    </button>
                  ) : null}
                  {isOwner ? (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        openMatchChatSettings(match);
                      }}
                      className="flex h-11 items-center justify-center rounded-lg border border-parchment text-sm font-bold text-pine"
                    >
                      設定球局
                    </button>
                  ) : null}
                  {!hasApplied && !isOwner && !isAccepted ? (
                    <button
                      type="button"
                      disabled={isJoiningThisMatch || isFull}
                      onClick={(event) => {
                        event.stopPropagation();
                        void joinMatch(match);
                      }}
                      className={`flex h-11 items-center justify-center rounded-lg text-sm font-bold text-white ${
                        isJoiningThisMatch || isFull ? "bg-muted" : "bg-clay"
                      }`}
                    >
                      {isJoiningThisMatch ? "申請中" : isFull ? "招募已滿" : "我要加入"}
                    </button>
                  ) : null}
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
              {createError ? <p className="text-sm font-bold text-red-600">{createError}</p> : null}
              <button
                type="submit"
                disabled={createBusy}
                className="flex h-12 w-full items-center justify-center rounded-lg bg-clay text-sm font-bold text-white disabled:opacity-50"
              >
                {createBusy ? "建立中" : "發布揪球邀請"}
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
                disabled={joiningMatchId === joinPrompt.id || joinCodeInput.length !== 6}
                onClick={() => void joinMatch(joinPrompt, joinCodeInput)}
                className="rounded-full bg-clay px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {joiningMatchId === joinPrompt.id ? "申請中" : "確認加入"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {chatSettingsMatch ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[1.5rem] bg-white p-6 shadow-lg">
            <h3 className="text-lg font-bold text-pine">球局聊天室設定</h3>
            <p className="mt-2 text-sm leading-6 text-muted">開啟「{chatSettingsMatch.title}」前，先確認球局資訊。</p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="text-xs font-semibold text-muted">聊天室名稱</span>
                <input
                  value={chatSettings.name}
                  onChange={(event) => updateChatSettings("name", event.target.value.slice(0, 40))}
                  className="mt-2 w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay"
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-muted">城市</span>
                <select
                  value={chatSettings.city}
                  onChange={(event) => updateChatSettings("city", event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-parchment bg-ivory px-3 py-3 text-sm outline-none focus:border-clay"
                >
                  {taiwanCities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-muted">地區</span>
                <input
                  value={chatSettings.district}
                  onChange={(event) => updateChatSettings("district", event.target.value.slice(0, 20))}
                  placeholder="地區待確認"
                  className="mt-2 w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay"
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="text-xs font-semibold text-muted">地點</span>
                <input
                  value={chatSettings.venue}
                  onChange={(event) => updateChatSettings("venue", event.target.value.slice(0, 50))}
                  className="mt-2 w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay"
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-muted">日期</span>
                <input
                  type="date"
                  value={chatSettings.date}
                  onChange={(event) => updateChatSettings("date", event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-parchment bg-ivory px-3 py-3 text-sm outline-none focus:border-clay"
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-muted">人數</span>
                <select
                  value={chatSettings.totalSlots}
                  onChange={(event) => updateChatSettings("totalSlots", event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-parchment bg-ivory px-3 py-3 text-sm outline-none focus:border-clay"
                >
                  {Array.from({ length: 8 }, (_, index) => String(index + 1)).map((count) => (
                    <option key={count} value={count}>
                      {count}人
                    </option>
                  ))}
                </select>
              </label>

              <div className="sm:col-span-2 grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-semibold text-muted">開始時間</span>
                  <div className="mt-2 grid grid-cols-2 gap-2 rounded-2xl border border-parchment bg-ivory px-3 py-2">
                    <input
                      inputMode="numeric"
                      value={chatSettings.startHour}
                      onChange={(event) => updateChatSettings("startHour", event.target.value.replace(/\D/g, "").slice(0, 2))}
                      className="w-full bg-transparent text-center text-sm outline-none"
                    />
                    <input
                      inputMode="numeric"
                      value={chatSettings.startMinute}
                      onChange={(event) => updateChatSettings("startMinute", event.target.value.replace(/\D/g, "").slice(0, 2))}
                      className="w-full bg-transparent text-center text-sm outline-none"
                    />
                  </div>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-muted">結束時間</span>
                  <div className="mt-2 grid grid-cols-2 gap-2 rounded-2xl border border-parchment bg-ivory px-3 py-2">
                    <input
                      inputMode="numeric"
                      value={chatSettings.endHour}
                      onChange={(event) => updateChatSettings("endHour", event.target.value.replace(/\D/g, "").slice(0, 2))}
                      className="w-full bg-transparent text-center text-sm outline-none"
                    />
                    <input
                      inputMode="numeric"
                      value={chatSettings.endMinute}
                      onChange={(event) => updateChatSettings("endMinute", event.target.value.replace(/\D/g, "").slice(0, 2))}
                      className="w-full bg-transparent text-center text-sm outline-none"
                    />
                  </div>
                </label>
              </div>

              <div className="sm:col-span-2">
                <span className="text-xs font-semibold text-muted">NTRP 等級</span>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {ntrpOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => toggleChatNtrpLevel(option)}
                      className={`rounded-full border px-3 py-2 text-xs font-bold ${
                        chatSettings.ntrpRequired.includes(option)
                          ? "border-clay bg-clay text-white"
                          : "border-parchment bg-ivory text-muted"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div className="sm:col-span-2">
                <span className="text-xs font-semibold text-muted">公開與否</span>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  {[
                    { value: "approval", label: "公開申請" },
                    { value: "private", label: "私人加入碼" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateChatSettings("joinMode", option.value)}
                      className={`rounded-2xl border px-3 py-3 text-sm font-bold ${
                        chatSettings.joinMode === option.value
                          ? "border-clay bg-clay text-white"
                          : "border-parchment bg-ivory text-muted"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="block sm:col-span-2">
                <span className="text-xs font-semibold text-muted">開場訊息</span>
                <textarea
                  value={chatSettings.message}
                  onChange={(event) => updateChatSettings("message", event.target.value.slice(0, 180))}
                  rows={4}
                  className="mt-2 w-full resize-none rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm leading-6 outline-none focus:border-clay"
                />
                <span className="float-right text-xs text-muted">{chatSettings.message.length}/180</span>
              </label>
            </div>

            {chatSettingsError ? <p className="mt-4 text-sm font-bold text-red-600">{chatSettingsError}</p> : null}
            <div className="mt-8 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setChatSettingsMatch(null)}
                className="rounded-full border border-parchment px-4 py-3 text-sm font-bold text-muted"
              >
                取消
              </button>
              <button
                type="button"
                disabled={chatSettingsSaving}
                onClick={() => void confirmMatchConversationSettings()}
                className="rounded-full bg-clay px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {chatSettingsSaving ? "儲存中" : "開啟聊天室"}
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
