"use client";

import { useState } from "react";
import PageHero from "@/components/PageHero";
import { taiwanCities } from "@/data/cities";

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
  const [intro, setIntro] = useState("");

  return (
    <section className="mx-auto max-w-md px-6 py-10">
      <PageHero
        eyebrow="Student Need"
        title="發布學習需求"
        description="讓教練了解你的程度、預算與學習目標。"
      />

      <form className="mt-6 space-y-4 rounded-[1.5rem] border border-parchment bg-white p-5 shadow-sm">
        <input
          placeholder="初學者找啟蒙教練"
          className="w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay"
        />
        <select className="w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay">
          {taiwanCities.map((city) => (
            <option key={city}>{city}</option>
          ))}
        </select>
        <input
          placeholder="地區，例如：大安區"
          className="w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay"
        />
        <select className="w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay">
          {ntrpOptions.map((level) => (
            <option key={level}>NTRP {level}</option>
          ))}
        </select>

        <div>
          <p className="text-xs font-semibold text-muted">偏好上課時間</p>
          <div className="mt-2 space-y-2">
            {timeOptions.map((option) => (
              <label key={option} className="flex items-center gap-2 text-sm text-pine">
                <input type="checkbox" />
                {option}
              </label>
            ))}
          </div>
        </div>

        <select className="w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay">
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

        <button
          type="button"
          className="w-full rounded-full bg-clay px-5 py-3 text-sm font-bold text-white"
        >
          發布學習需求
        </button>
      </form>
    </section>
  );
}
