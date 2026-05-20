"use client";

import { useEffect, useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import { useApp } from "@/context/AppContext";
import {
  subscribeToCoachesAdmin,
  setCoachVerified,
  type AdminCoach,
} from "@/lib/coachService";

export default function AdminCoachesPage() {
  const { studentNeeds, updateStudentNeedStatus } = useApp();
  const [coaches, setCoaches] = useState<AdminCoach[]>([]);
  const [tab, setTab] = useState<"coaches" | "students">("coaches");
  const [busyId, setBusyId] = useState("");

  useEffect(() => subscribeToCoachesAdmin(setCoaches), []);

  async function toggleVerified(coach: AdminCoach) {
    setBusyId(coach.id);
    try {
      await setCoachVerified(coach.id, !coach.isVerified);
    } finally {
      setBusyId("");
    }
  }

  return (
    <AdminGuard>
      <section className="mx-auto max-w-md px-6 py-10">
        <div className="rounded-[2rem] bg-pine p-6 text-white shadow-lg">
          <p className="text-sm font-semibold text-gold">Admin</p>
          <h1 className="mt-2 text-3xl font-bold">教練管理</h1>
          <p className="mt-4 leading-7 text-parchment">切換教練驗證狀態，管理學員找教練需求。</p>
        </div>

        <div className="mt-6 flex gap-2">
          {(["coaches", "students"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`rounded-full px-4 py-2 text-sm font-bold ${
                tab === key ? "bg-pine text-white" : "bg-white text-pine ring-1 ring-parchment"
              }`}
            >
              {key === "coaches" ? "教練列表" : "學員需求"}
            </button>
          ))}
        </div>

        {tab === "coaches" ? (
          <div className="mt-6 space-y-4">
            {coaches.length === 0 ? (
              <p className="text-sm text-muted">尚無教練資料，可至後台首頁匯入種子資料。</p>
            ) : (
              coaches.map((coach) => (
                <article key={coach.id} className="rounded-[1.5rem] bg-white p-5 ring-1 ring-parchment">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-clay">{coach.city}</p>
                      <h2 className="mt-1 font-bold text-pine">{coach.name}</h2>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-[11px] font-bold ${
                        coach.isVerified ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {coach.isVerified ? "已驗證" : "未驗證"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted">
                    {coach.levelRange} · NT${coach.price}/hr · ⭐ {coach.rating}
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">{coach.bio}</p>
                  <button
                    type="button"
                    disabled={busyId === coach.id}
                    onClick={() => void toggleVerified(coach)}
                    className="mt-4 rounded-full bg-clay px-5 py-2 text-xs font-bold text-white disabled:opacity-50"
                  >
                    {coach.isVerified ? "取消驗證" : "標記為已驗證"}
                  </button>
                </article>
              ))
            )}
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {studentNeeds.map((need) => (
              <article key={need.id} className="rounded-[1.5rem] bg-white p-5 ring-1 ring-parchment">
                <p className="text-xs font-semibold text-clay">
                  {need.city} {need.district} · {need.status === "active" ? "開放中" : "已關閉"}
                </p>
                <h2 className="mt-1 font-bold text-pine">{need.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {need.targetLevel} · {need.preferredTime} · {need.budget}
                </p>
                <p className="mt-2 text-xs text-muted">發布者：{need.ownerNickname}</p>
                <button
                  type="button"
                  onClick={() =>
                    updateStudentNeedStatus(need.id, need.status === "active" ? "closed" : "active")
                  }
                  className="mt-4 rounded-full bg-clay px-5 py-2 text-xs font-bold text-white"
                >
                  {need.status === "active" ? "下架需求" : "重新開放"}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </AdminGuard>
  );
}
