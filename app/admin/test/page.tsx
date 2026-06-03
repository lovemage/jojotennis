"use client";

import { useState } from "react";
import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";

const steps = [
  {
    id: "a1",
    account: "帳號 A（test@jojo.tw）",
    text: "發起一場揪球（明天 10:00–12:00，2 人）",
    href: "/match",
  },
  {
    id: "a2",
    account: "帳號 A",
    text: "進入 /messages → 看到系統自動建立的球局聊天室",
    href: "/messages",
  },
  {
    id: "b1",
    account: "帳號 B（beginner@jojo.tw）",
    text: "在揪球頁找到 A 的球局 → 點「我要加入」",
    href: "/match",
  },
  {
    id: "b2",
    account: "帳號 B",
    text: "再點一次「我要加入」→ 應顯示「已申請過此球局」",
    href: "/match",
  },
  {
    id: "a3",
    account: "帳號 A",
    text: "在球局詳情頁接受 B 的申請",
    href: "/profile",
  },
  {
    id: "a4",
    account: "帳號 A",
    text: "確認「還差幾人」數字減少，聊天室出現「B 已加入」",
    href: "/messages",
  },
  {
    id: "b3",
    account: "帳號 B",
    text: "進入球局聊天室 → 可發文字訊息",
    href: "/messages",
  },
  {
    id: "ab",
    account: "A 與 B",
    text: "互傳訊息，確認兩方即時收到（不需刷新）",
    href: "/messages",
  },
  {
    id: "a5",
    account: "帳號 A",
    text: "在球局詳情按「取消活動」",
    href: "/matches",
  },
  {
    id: "b4",
    account: "帳號 B",
    text: "收到「球局已取消」通知，列表該筆消失",
    href: "/messages",
  },
  {
    id: "admin1",
    account: "管理員",
    text: "進入 /admin → 看到統計數字",
    href: "/admin",
  },
  {
    id: "admin2",
    account: "管理員",
    text: "在 /admin/users 停權帳號 B → B 寫入被 Rules 擋下 → 復權",
    href: "/admin/users",
  },
];

export default function AdminTestPage() {
  const [done, setDone] = useState<Record<string, boolean>>({});

  function toggle(id: string) {
    setDone((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  const completed = Object.values(done).filter(Boolean).length;

  return (
    <AdminGuard>
      <section className="mx-auto max-w-md px-6 py-10">
        <div className="rounded-[2rem] bg-pine p-6 text-white shadow-lg">
          <p className="text-sm font-semibold text-gold">STEP 15</p>
          <h1 className="mt-2 text-3xl font-bold">端到端測試清單</h1>
          <p className="mt-4 leading-7 text-parchment">
            開三個無痕視窗，分別登入不同帳號逐項驗收。進度：{completed}/{steps.length}
          </p>
        </div>

        <div className="mt-4 rounded-xl bg-white p-4 text-sm leading-6 text-muted ring-1 ring-parchment">
          <p className="font-semibold text-pine">測試帳號</p>
          <p className="mt-2">A：test@jojo.tw / test1234</p>
          <p>B：beginner@jojo.tw / begin1234</p>
          <p>管理員：test@gmail.com / test123</p>
          <p className="mt-1">或 sasabrinalu@gmail.com / adminUsers 授權 Email</p>
        </div>

        <ol className="mt-6 space-y-3">
          {steps.map((step, index) => (
            <li
              key={step.id}
              className={`rounded-[1.5rem] border p-4 ${
                done[step.id] ? "border-green-300 bg-green-50" : "border-parchment bg-white"
              }`}
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => toggle(step.id)}
                  aria-label="標記完成"
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${
                    done[step.id] ? "border-green-600 bg-green-600 text-white" : "border-pine text-pine"
                  }`}
                >
                  {done[step.id] ? "✓" : index + 1}
                </button>
                <div>
                  <p className="text-xs font-semibold text-clay">{step.account}</p>
                  <p className="mt-1 text-sm leading-6 text-pine">{step.text}</p>
                  <Link href={step.href} className="mt-2 inline-block text-xs font-bold text-clay underline">
                    前往測試 →
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-6 rounded-[1.5rem] bg-white p-5 text-sm leading-6 text-muted ring-1 ring-parchment">
          <p className="font-semibold text-pine">Firebase Console 確認</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>matches 的 isDeleted / filledSlots 正確</li>
            <li>conversations metadata 正確，聊天訊息寫入 Upstash Redis</li>
            <li>heart_records 不可重複（同一 matchId+fromUid+toUid）</li>
          </ul>
        </div>
      </section>
    </AdminGuard>
  );
}
