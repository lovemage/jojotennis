"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { TennisLevel } from "@/data/tennisLevels";

type ProfileFormProps = {
  cities: string[];
  tennisLevels: TennisLevel[];
};

type Profile = {
  nickname: string;
  yearsPlayed: string;
  tennisLevel: string;
  preferredCity: string;
  bio: string;
};

const storageKey = "tennis-tw-profile";

const defaultProfile: Profile = {
  nickname: "",
  yearsPlayed: "",
  tennisLevel: "3.0",
  preferredCity: "台北市",
  bio: "",
};

function getTaiwanLevelDescription(level: string) {
  const numericLevel = Number(level);

  if (numericLevel <= 2) {
    return "約等於台灣 D 級（初學）";
  }

  if (numericLevel >= 2.5 && numericLevel <= 3.5) {
    return "約等於台灣 C 級（中級）";
  }

  if (numericLevel >= 3.5 && numericLevel <= 4.5) {
    return "約等於台灣 B 級（高級）";
  }

  if (numericLevel >= 4.5 && numericLevel <= 5.5) {
    return "約等於台灣 A 級（頂尖業餘）";
  }

  return "公開賽等級以上";
}

export default function ProfileForm({ cities, tennisLevels }: ProfileFormProps) {
  const [profile, setProfile] = useState(defaultProfile);
  const [savedAt, setSavedAt] = useState("");

  useEffect(() => {
    const savedProfile = window.localStorage.getItem(storageKey);

    if (savedProfile) {
      const parsedProfile = JSON.parse(savedProfile) as Profile;

      setProfile({
        ...parsedProfile,
        tennisLevel: parsedProfile.tennisLevel.replace("NTRP ", ""),
      });
    }
  }, []);

  function updateProfile(field: keyof Profile, value: string) {
    setProfile((currentProfile) => ({
      ...currentProfile,
      [field]: value,
    }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    window.localStorage.setItem(storageKey, JSON.stringify(profile));
    setSavedAt(new Date().toLocaleTimeString("zh-TW", { hour12: false }));
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-6 rounded-[1.5rem] border border-parchment bg-white p-5 shadow-sm"
    >
      <p className="text-sm font-semibold text-clay">個人資料</p>
      <h2 className="mt-2 text-2xl font-bold text-pine">建立球友名片</h2>
      <div className="mt-5 space-y-4">
        <label className="block">
          <span className="text-xs font-semibold text-muted">暱稱</span>
          <input
            value={profile.nickname}
            onChange={(event) => updateProfile("nickname", event.target.value)}
            placeholder="例如：Sabrina"
            className="mt-2 w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm text-ink outline-none placeholder:text-muted focus:border-clay"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label>
            <span className="text-xs font-semibold text-muted">球齡</span>
            <input
              value={profile.yearsPlayed}
              onChange={(event) =>
                updateProfile("yearsPlayed", event.target.value)
              }
              placeholder="例如：2 年"
              className="mt-2 w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm text-ink outline-none placeholder:text-muted focus:border-clay"
            />
          </label>

          <label>
            <span className="text-xs font-semibold text-muted">偏好地區</span>
            <select
              value={profile.preferredCity}
              onChange={(event) =>
                updateProfile("preferredCity", event.target.value)
              }
              className="mt-2 w-full rounded-2xl border border-parchment bg-ivory px-3 py-3 text-sm text-ink outline-none focus:border-clay"
            >
              {cities.map((city) => (
                <option key={city}>{city}</option>
              ))}
            </select>
          </label>
        </div>

        <label className="block">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-muted">網球等級</span>
            <Link
              href="/ntrp"
              target="_blank"
              className="text-xs font-semibold text-clay underline"
            >
              什麼是 NTRP？
            </Link>
          </div>
          <select
            value={profile.tennisLevel}
            onChange={(event) =>
              updateProfile("tennisLevel", event.target.value)
            }
            className="mt-2 w-full rounded-2xl border border-parchment bg-ivory px-3 py-3 text-sm text-ink outline-none focus:border-clay"
          >
            {tennisLevels.map((level) => (
              <option key={level.level} value={level.level}>
                {level.level} · {level.label}
              </option>
            ))}
          </select>
          <p className="mt-2 text-sm text-muted">
            {getTaiwanLevelDescription(profile.tennisLevel)}
          </p>
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-muted">自我介紹</span>
          <textarea
            value={profile.bio}
            onChange={(event) => updateProfile("bio", event.target.value)}
            placeholder="例如：平日晚上可打，想找穩定練球夥伴。"
            rows={4}
            className="mt-2 w-full resize-none rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm leading-6 text-ink outline-none placeholder:text-muted focus:border-clay"
          />
        </label>
      </div>

      <button
        type="submit"
        className="mt-5 w-full rounded-full bg-pine px-5 py-3 text-sm font-bold text-white transition hover:bg-clay"
      >
        儲存個人資料
      </button>

      {savedAt ? (
        <p className="mt-3 text-center text-sm font-medium text-clay">
          已於 {savedAt} 儲存
        </p>
      ) : null}
    </form>
  );
}
