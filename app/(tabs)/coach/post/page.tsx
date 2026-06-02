"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PageHero from "@/components/PageHero";
import { taiwanCities } from "@/data/cities";
import { useApp } from "@/context/AppContext";

const ntrpOptions = [
  "1.0",
  "1.5",
  "2.0",
  "2.5",
  "3.0",
  "3.5",
  "4.0",
  "4.5",
  "5.0",
  "5.5",
  "6.0",
  "6.5",
  "7.0",
];
const timeOptions = [
  "週一至五白天",
  "週一至五晚上",
  "週末上午",
  "週末下午",
  "彈性配合",
];
const budgetOptions = [
  "NT$500 以下",
  "NT$500–1,000",
  "NT$1,000–1,500",
  "NT$1,500–2,000",
  "NT$2,000–2,500",
  "NT$2,500 以上",
  "面議",
];

export default function CoachPostPage() {
  const router = useRouter();
  const { user, addStudentNeed } = useApp();
  const [title, setTitle] = useState("");
  const [city, setCity] = useState("台北市");
  const [district, setDistrict] = useState("");
  const [targetLevel, setTargetLevel] = useState("NTRP 2.0");
  const [preferredTimes, setPreferredTimes] = useState<string[]>([]);
  const [budget, setBudget] = useState("NT$1,000–1,500");
  const [intro, setIntro] = useState("");
  const [status, setStatus] = useState("");

  function toggleTime(option: string) {
    setPreferredTimes((current) =>
      current.includes(option)
        ? current.filter((item) => item !== option)
        : [...current, option],
    );
  }

  function submitNeed(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) {
      router.push("/login");
      return;
    }

    addStudentNeed({
      title: title.trim() || "學員尋找網球教練",
      city,
      district: district.trim() || "地區彈性",
      targetLevel,
      preferredTime: preferredTimes.length > 0 ? preferredTimes.join("、") : "彈性配合",
      budget,
      intro: intro.trim() || "希望找到適合的教練協助安排課程。",
    });
    setStatus("學習需求已發布，教練可以在找學生列表看到你的需求。");
    setTitle("");
    setDistrict("");
    setPreferredTimes([]);
    setIntro("");
  }

  return (
    <section className="mx-auto max-w-md px-6 py-10">
      <PageHero
        settingsKey="studentNeed"
        eyebrow="Student Need"
        title="發布學習需求"
        description="讓教練了解你的程度、預算與學習目標。"
      />

      <form
        onSubmit={submitNeed}
        className="mt-6 space-y-4 rounded-[1.5rem] border border-parchment bg-white p-5 shadow-sm"
      >
        <input
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="初學者找啟蒙教練"
          className="w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay"
        />
        <select
          value={city}
          onChange={(event) => setCity(event.target.value)}
          className="w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay"
        >
          {taiwanCities.map((city) => (
            <option key={city}>{city}</option>
          ))}
        </select>
        <input
          value={district}
          onChange={(event) => setDistrict(event.target.value)}
          placeholder="地區，例如：大安區"
          className="w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay"
        />
        <select
          value={targetLevel}
          onChange={(event) => setTargetLevel(event.target.value)}
          className="w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay"
        >
          {ntrpOptions.map((level) => (
            <option key={level}>NTRP {level}</option>
          ))}
        </select>

        <div>
          <p className="text-xs font-semibold text-muted">偏好上課時間</p>
          <div className="mt-2 space-y-2">
            {timeOptions.map((option) => (
              <label key={option} className="flex items-center gap-2 text-sm text-pine">
                <input
                  type="checkbox"
                  checked={preferredTimes.includes(option)}
                  onChange={() => toggleTime(option)}
                />
                {option}
              </label>
            ))}
          </div>
        </div>

        <select
          value={budget}
          onChange={(event) => setBudget(event.target.value)}
          className="w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay"
        >
          {budgetOptions.map((budget) => (
            <option key={budget}>{budget}</option>
          ))}
        </select>

        <label className="block">
          <textarea
            value={intro}
            onChange={(event) => setIntro(event.target.value.slice(0, 200))}
            rows={5}
            placeholder="自我介紹 / 學習目標"
            className="w-full resize-none rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm leading-6 outline-none focus:border-clay"
          />
          <span className="text-xs text-muted">{intro.length}/200</span>
        </label>

        <div className="space-y-1">
          <p className="text-xs text-muted">
            ✉️ 教練將透過站內私訊與你聯繫，你的個人資訊不會公開顯示。
          </p>
          <p className="text-xs text-red-600">
            ⚠️ 安全提醒：請勿在平台外提前轉帳或付款，謹防詐騙。揪揪網球不會要求你預付任何費用。
          </p>
        </div>

        {status ? (
          <p className="rounded-2xl bg-ivory p-4 text-sm font-bold text-pine">
            {status}
          </p>
        ) : null}

        <button
          type="submit"
          className="w-full rounded-full bg-clay px-5 py-3 text-sm font-bold text-white"
        >
          {user ? "發布學習需求" : "登入後發布學習需求"}
        </button>
      </form>
    </section>
  );
}
