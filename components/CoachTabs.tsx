"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { taiwanCities } from "@/data/cities";
import type { Coach, StudentNeed } from "@/data/coaches";
import { useApp, type StudentNeedRecord } from "@/context/AppContext";
import LoginPromptModal from "@/components/LoginPromptModal";

type CoachTabsProps = {
  coaches: Coach[];
  studentNeeds: StudentNeed[];
  activeTab?: "coaches" | "students";
  onTabChange?: (tab: "coaches" | "students") => void;
};

type DisplayStudentNeed = StudentNeed & {
  ownerUid?: string;
  ownerNickname?: string;
  createdAt?: number;
  status?: StudentNeedRecord["status"];
};

const allCitiesLabel = "全部縣市";
const allLevelsLabel = "全部等級";

export default function CoachTabs({
  coaches = [],
  studentNeeds = [],
  activeTab: activeTabProp,
  onTabChange,
}: CoachTabsProps) {
  const { user, sendMessage, studentNeeds: dynamicStudentNeeds = [] } = useApp();
  const [internalTab, setInternalTab] = useState<"coaches" | "students">("coaches");
  const activeTab = activeTabProp ?? internalTab;
  const setActiveTab = onTabChange ?? setInternalTab;
  const [city, setCity] = useState(allCitiesLabel);
  const [level, setLevel] = useState(allLevelsLabel);
  const [messageTarget, setMessageTarget] = useState("");
  const [messageTargetUid, setMessageTargetUid] = useState("");
  const [messageRelatedId, setMessageRelatedId] = useState("");
  const [message, setMessage] = useState("");
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const levels = useMemo(
    () => [
      allLevelsLabel,
      "NTRP 1.0–2.5",
      "NTRP 2.0–3.5",
      "NTRP 3.0–4.5",
      "NTRP 2.0",
      "NTRP 3.0",
      "NTRP 4.0",
    ],
    [],
  );
  const [shuffleVersion, setShuffleVersion] = useState(0);
  const prevTabRef = useRef(activeTab);
  useEffect(() => {
    if (activeTab === "coaches" && prevTabRef.current !== "coaches") {
      setShuffleVersion((v) => v + 1);
    }
    prevTabRef.current = activeTab;
  }, [activeTab]);

  const shuffledCoaches = useMemo(() => {
    const arr = [...coaches];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coaches, shuffleVersion]);

  const filteredCoaches = shuffledCoaches.filter(
    (coach) =>
      (city === allCitiesLabel || coach.city === city) &&
      (level === allLevelsLabel || coach.levelRange === level),
  );
  const combinedStudentNeeds: DisplayStudentNeed[] = useMemo(
    () => [
      ...dynamicStudentNeeds
        .filter((need) => need.status === "active")
        .map((need) => ({
          id: need.id,
          title: need.title,
          city: need.city,
          district: need.district,
          targetLevel: need.targetLevel,
          preferredTime: need.preferredTime,
          budget: need.budget,
          intro: need.intro,
          ownerUid: need.ownerUid,
          ownerNickname: need.ownerNickname,
          createdAt: need.createdAt,
          status: need.status,
        })),
      ...studentNeeds,
    ],
    [dynamicStudentNeeds, studentNeeds],
  );
  const filteredStudents = combinedStudentNeeds.filter(
    (need) =>
      (city === allCitiesLabel || need.city === city) &&
      (level === allLevelsLabel || need.targetLevel === level),
  );

  function openMessageModal(target: string, relatedId: string, toUid: string) {
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }

    setMessageTarget(target);
    setMessageTargetUid(toUid);
    setMessageRelatedId(relatedId);
    setMessage("");
  }

  function handleSendMessage() {
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }

    sendMessage({
      type: "coach_msg",
      fromUid: user.uid,
      fromNickname: user.nickname,
      toUid: messageTargetUid || "u002",
      content: `${user?.nickname ?? "你"} 傳訊息給你：${message.slice(0, 30)}...`,
      relatedId: messageRelatedId,
    });
    setMessageTarget("");
    setMessageTargetUid("");
  }

  return (
    <>
      <div className="rounded-[1.5rem] border border-parchment bg-white p-5 shadow-sm">
        {activeTab === "students" ? (
          <div className="mb-4 rounded-2xl bg-parchment p-4 text-sm leading-6 text-pine">
            <p>瀏覽學員學習需求，主動私訊媒合，完全免費。</p>
            <p className="mt-2 text-muted">
              尚未登錄教練？{" "}
              <Link href="/coach/register" className="font-semibold text-clay underline">
                請先申請成為平台教練
              </Link>
            </p>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <label>
            <span className="text-xs font-semibold text-muted">縣市</span>
            <select
              value={city}
              onChange={(event) => setCity(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-parchment bg-ivory px-3 py-3 text-sm text-ink outline-none focus:border-clay"
            >
              {[allCitiesLabel, ...taiwanCities].map((cityOption) => (
                <option key={cityOption}>{cityOption}</option>
              ))}
            </select>
          </label>

          <label>
            <span className="text-xs font-semibold text-muted">
              {activeTab === "coaches" ? "NTRP適合等級" : "NTRP需求等級"}
            </span>
            <select
              value={level}
              onChange={(event) => setLevel(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-parchment bg-ivory px-3 py-3 text-sm text-ink outline-none focus:border-clay"
            >
              {levels.map((levelOption) => (
                <option key={levelOption}>{levelOption}</option>
              ))}
            </select>
          </label>
        </div>

      </div>

      <div className="mt-6 space-y-4">
        {activeTab === "coaches"
          ? filteredCoaches.map((coach) => (
              <article
                key={coach.id}
                className="rounded-[1.5rem] border border-parchment bg-white p-5 shadow-sm"
              >
                <div className="flex gap-4">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-pine text-xl font-bold text-white">
                    {coach.name.slice(0, 1)}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-pine">{coach.name}</h2>
                    <p className="text-sm font-semibold text-gold">⭐ {coach.rating}</p>
                    <p className="mt-1 text-sm text-muted">{coach.tagline}</p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-muted">
                  📍{coach.city} 🎾{coach.levelRange} 💰NT${coach.price}/堂起
                </p>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted">
                  {coach.bio}
                </p>
                <button
                  type="button"
                  onClick={() => openMessageModal(coach.name, coach.id, "u002")}
                  className="mt-4 w-full rounded-full bg-clay px-4 py-3 text-sm font-bold text-white"
                >
                  傳訊息給教練
                </button>
              </article>
            ))
          : (
              <>
                <div className="rounded-xl bg-parchment p-4">
                  <h2 className="font-bold text-pine">
                    你是正在找教練的學員嗎？
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    發布你的學習需求，讓適合的教練主動聯繫你
                  </p>
                  <Link
                    href="/coach/post"
                    className="mt-4 flex w-full items-center justify-center rounded-full bg-clay px-4 py-3 text-sm font-bold text-white"
                  >
                    發布我的學習需求 →
                  </Link>
                  <p className="mt-2 text-xs text-red-600">
                    ⚠️ 請勿在平台外提前付款，謹防詐騙。
                  </p>
                </div>

                {filteredStudents.map((need) => (
              <article
                key={need.id}
                className="rounded-[1.5rem] border border-parchment bg-white p-5 shadow-sm"
              >
                <h2 className="text-lg font-bold text-pine">{need.title}</h2>
                <p className="mt-3 text-sm leading-6 text-muted">
                  📍{need.city}{need.district} 🎾{need.targetLevel} ⏰
                  {need.preferredTime} 💰{need.budget}
                </p>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted">
                  {need.intro}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    openMessageModal(
                      need.ownerNickname ? `${need.ownerNickname}（學員）` : "這位學員",
                      need.id,
                      need.ownerUid || "u001",
                    )
                  }
                  className="mt-4 w-full rounded-full bg-clay px-4 py-3 text-sm font-bold text-white"
                >
                  我想教這位學員
                </button>
              </article>
                ))}
              </>
            )}
      </div>

      <div className="mt-6 rounded-[1.5rem] bg-parchment p-5 text-center">
        <h2 className="text-2xl font-bold text-pine">你是網球教練嗎？</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          免費刊登你的教練資訊，讓更多學員找到你
        </p>
        <Link
          href="/coach/register"
          className="mt-4 inline-flex rounded-full bg-gold px-5 py-3 text-sm font-bold text-pine"
        >
          免費登錄教練資訊 →
        </Link>
        <p className="mt-2 text-xs text-muted">目前完全免費・無刊登費用</p>
        <p className="mt-4 whitespace-pre-line text-center text-xs leading-5 text-muted">
          {`揪揪網球僅提供教練與學員資訊媒合平台，不介入任何交易行為。
課程費用、上課安排請由雙方自行協議。
平台對媒合結果、課程品質及任何場外糾紛不負法律責任。
⚠️ 請勿預先轉帳，謹防詐騙。如遇可疑情況請向警方報案。`}
        </p>
      </div>

      {messageTarget ? (
        <div className="fixed inset-0 z-50 flex items-end bg-ink/40 p-4">
          <div className="mx-auto w-full max-w-md rounded-[1.5rem] bg-white p-5">
            <h2 className="text-xl font-bold text-pine">
              傳訊息給 {messageTarget}
            </h2>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={5}
              placeholder={
                messageTarget === "這位學員"
                  ? "請介紹你的教學經驗和風格..."
                  : "請簡單介紹你的程度和學習目標..."
              }
              className="mt-4 w-full resize-none rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm leading-6 outline-none focus:border-clay"
            />
            <p className="mt-2 text-xs text-red-600">
              ⚠️ 安全提醒：請勿在平台外提前轉帳，謹防詐騙。
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMessageTarget("")}
                className="rounded-full border border-pine px-4 py-3 text-sm font-bold text-pine"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSendMessage}
                className="rounded-full bg-clay px-4 py-3 text-sm font-bold text-white"
              >
                送出訊息
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <LoginPromptModal
        isOpen={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
      />
    </>
  );
}
