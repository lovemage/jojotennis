"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { taiwanCities } from "@/data/cities";
import type { Club } from "@/data/clubs";
import { useApp } from "@/context/AppContext";
import LoginPromptModal from "@/components/LoginPromptModal";

type ClubExplorerProps = {
  clubs: Club[];
};

const clubTypes = ["地區社團", "固定團練", "新手友善", "賽事交流"];
const ntrpOptions = ["不限", "1", "2", "3", "4", "5", "6–7"];
const joinedClubsStorageKey = "jojo-tennis-joined-clubs";

export default function ClubExplorer({ clubs }: ClubExplorerProps) {
  const { user, sendMessage, getOrCreateConversation } = useApp();
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [joinedClubIds, setJoinedClubIds] = useState<string[]>([]);
  const [intro, setIntro] = useState("");
  const [selectedCreateTypes, setSelectedCreateTypes] = useState<string[]>([]);
  const [selectedNtrp, setSelectedNtrp] = useState<string[]>(["不限"]);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedClubs = JSON.parse(
      window.localStorage.getItem(joinedClubsStorageKey) ?? "[]",
    ) as Array<{ id: string }>;

    setJoinedClubIds(savedClubs.map((club) => club.id));
  }, []);

  const filteredClubs = useMemo(
    () =>
      selectedTypes.length === 0
        ? clubs
        : clubs.filter((club) =>
            club.tags.some((tag) => selectedTypes.includes(tag)),
          ),
    [clubs, selectedTypes],
  );

  function requireLogin(action: () => void) {
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }

    action();
  }

  function toggleType(type: string) {
    setSelectedTypes((currentTypes) =>
      currentTypes.includes(type)
        ? currentTypes.filter((item) => item !== type)
        : [...currentTypes, type],
    );
  }

  function toggleCreateType(type: string) {
    setSelectedCreateTypes((currentTypes) =>
      currentTypes.includes(type)
        ? currentTypes.filter((item) => item !== type)
        : [...currentTypes, type],
    );
  }

  function toggleNtrp(option: string) {
    setSelectedNtrp((currentLevels) => {
      if (option === "不限") {
        return ["不限"];
      }

      const withoutAny = currentLevels.filter((level) => level !== "不限");
      const nextLevels = withoutAny.includes(option)
        ? withoutAny.filter((level) => level !== option)
        : [...withoutAny, option];

      return nextLevels.length > 0 ? nextLevels : ["不限"];
    });
  }

  function joinClub(club: Club) {
    requireLogin(() => {
      const nextJoinedIds = joinedClubIds.includes(club.id)
        ? joinedClubIds
        : [...joinedClubIds, club.id];
      const savedClubs = JSON.parse(
        window.localStorage.getItem(joinedClubsStorageKey) ?? "[]",
      ) as Array<{ id: string }>;
      const nextSavedClubs = [
        ...savedClubs.filter((item) => item.id !== club.id),
        {
          id: club.id,
          name: club.name,
          city: club.city,
          tags: club.tags,
          joinedAt: new Date().toLocaleDateString("zh-TW"),
        },
      ];

      setJoinedClubIds(nextJoinedIds);
      window.localStorage.setItem(
        joinedClubsStorageKey,
        JSON.stringify(nextSavedClubs),
      );
      sendMessage({
        type: "club_join",
        fromUid: user?.uid ?? "system",
        fromNickname: user?.nickname ?? "你",
        toUid: "system",
        content: `${user?.nickname ?? "你"} 申請加入你的「${club.name}」`,
        relatedId: club.id,
      });
      getOrCreateConversation("system", club.name, {
        type: "club",
        relatedId: club.id,
        name: club.name,
        ownerUid: "system",
        participants: [user?.uid ?? ""],
        systemMessage: `你已加入「${club.name}」社團聊天室，可以在這裡和成員討論練球與活動。`,
      });
    });
  }

  return (
    <>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => requireLogin(() => setIsSheetOpen(true))}
          className="rounded-xl bg-pine p-4 text-left text-white"
        >
          <span className="text-2xl font-bold">＋</span>
          <h2 className="mt-2 font-bold">建立社團</h2>
          <p className="mt-1 text-xs leading-5 text-ivory">召集同好，一起練球</p>
        </button>
        <button
          type="button"
          onClick={() => listRef.current?.scrollIntoView({ behavior: "smooth" })}
          className="rounded-xl bg-clay p-4 text-left text-white"
        >
          <span className="text-2xl">🔍</span>
          <h2 className="mt-2 font-bold">找社團加入</h2>
          <p className="mt-1 text-xs leading-5 text-ivory">找到你的球友圈</p>
        </button>
      </div>

      <div className="mt-6 rounded-[1.5rem] border border-parchment bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-clay">社團類型</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {clubTypes.map((type) => {
            const isSelected = selectedTypes.includes(type);

            return (
              <button
                key={type}
                type="button"
                onClick={() => toggleType(type)}
                className={`rounded-2xl p-4 text-center text-sm font-semibold ${
                  isSelected ? "bg-clay text-white" : "bg-parchment text-ink"
                }`}
              >
                {type}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-4 rounded-xl bg-parchment p-4">
        <div>
          <h2 className="font-bold text-pine">找不到合適的社團？</h2>
          <p className="mt-1 text-sm text-muted">自己建立一個，吸引同好加入</p>
        </div>
        <button
          type="button"
          onClick={() => requireLogin(() => setIsSheetOpen(true))}
          className="shrink-0 rounded-full bg-clay px-4 py-2 text-sm font-bold text-white"
        >
          建立社團 +
        </button>
      </div>

      <div ref={listRef} className="mt-6 space-y-3 scroll-mt-4">
        {filteredClubs.map((club) => {
          const hasJoined = joinedClubIds.includes(club.id);

          return (
            <article
              key={club.id}
              className="rounded-[1.5rem] border border-parchment bg-white p-5 shadow-sm"
            >
              <p className="text-xs font-semibold text-clay">
                {club.city} · {club.levelRange}
              </p>
              <h2 className="mt-1 text-lg font-bold text-pine">{club.name}</h2>
              <p className="mt-3 text-sm leading-6 text-muted">
                {club.description}
              </p>
              <div className="mt-4 text-sm leading-6 text-muted">
                <p>主場：{club.baseCourt}</p>
                <p>時間：{club.schedule}</p>
                <p>成員：{club.memberCount} 人</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {club.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-ivory px-3 py-1 text-xs font-medium text-pine"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <button
                type="button"
                disabled={hasJoined}
                onClick={() => joinClub(club)}
                className={`mt-4 flex h-11 w-full items-center justify-center rounded-lg text-sm font-bold text-white ${
                  hasJoined ? "bg-pine" : "bg-clay"
                }`}
              >
                {hasJoined ? "✅ 已申請加入" : "加入社團"}
              </button>
            </article>
          );
        })}
      </div>

      {isSheetOpen ? (
        <div className="fixed inset-0 z-40 bg-ink/40" onClick={() => setIsSheetOpen(false)}>
          <div
            className="absolute inset-x-0 bottom-0 mx-auto max-h-[88vh] max-w-md overflow-y-auto rounded-t-[2rem] bg-white p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsSheetOpen(false)}
              className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-parchment text-sm font-bold text-muted"
            >
              ✕
            </button>
            <h2 className="text-2xl font-bold text-pine">建立社團</h2>
            <form className="mt-5 space-y-4">
              <input
                required
                placeholder="例：台北夜貓網球團"
                className="w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay"
              />
              <div>
                <p className="text-xs font-semibold text-muted">社團類型</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {clubTypes.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleCreateType(type)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold ${
                        selectedCreateTypes.includes(type)
                          ? "bg-clay text-white"
                          : "bg-parchment text-ink"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              <select className="w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay">
                {taiwanCities.map((city) => (
                  <option key={city}>{city}</option>
                ))}
              </select>
              <div>
                <p className="text-xs font-semibold text-muted">適合 NTRP 等級</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {ntrpOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => toggleNtrp(option)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold ${
                        selectedNtrp.includes(option)
                          ? "bg-clay text-white"
                          : "bg-parchment text-ink"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
              <label className="block">
                <span className="text-xs font-semibold text-muted">常用球場</span>
                <input
                  placeholder="例：大安森林公園網球場、青年公園網球場"
                  className="mt-2 w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay"
                />
              </label>
              <input
                placeholder="例：週二、週四 19:00"
                className="w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay"
              />
              <label className="block">
                <textarea
                  value={intro}
                  onChange={(event) => setIntro(event.target.value.slice(0, 200))}
                  rows={4}
                  placeholder="社團介紹"
                  className="w-full resize-none rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm leading-6 outline-none focus:border-clay"
                />
                <span className="text-xs text-muted">{intro.length}/200</span>
              </label>
              <label className="block">
                <input
                  placeholder="LINE 群組連結或 LINE ID"
                  className="w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay"
                />
                <span className="mt-2 block text-xs text-red-600">
                  ⚠️ 請勿要求成員預先付費，謹防詐騙
                </span>
              </label>
              <button
                type="button"
                onClick={() => {
                  if (user) {
                    getOrCreateConversation(user.uid, "新社團", {
                      type: "club",
                      relatedId: `club-${Date.now()}`,
                      name: "新建立的社團",
                      ownerUid: user.uid,
                      participants: [user.uid],
                      systemMessage: "📢 社團聊天室已建立，社長可以輸入「公告：」發布公告。",
                    });
                  }
                  setIsSheetOpen(false);
                }}
                className="w-full rounded-full bg-clay px-5 py-3 text-sm font-bold text-white"
              >
                建立社團
              </button>
            </form>
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
