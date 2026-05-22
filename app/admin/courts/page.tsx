"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import { useApp } from "@/context/AppContext";
import { subscribeToCourts, saveCourt, softDeleteCourt, type CourtFormInput } from "@/lib/courtService";
import { taiwanCities } from "@/data/cities";
import type { Court } from "@/data/courts";

const emptyDraft = {
  name: "",
  city: "台北市",
  district: "",
  address: "",
  indoor: "outdoor" as "indoor" | "outdoor",
  surfaceType: "hard" as "hard" | "clay" | "grass",
  totalCourts: "4",
  hasNightLight: false,
  openHours: "",
  phone: "",
  bookingMethod: "",
  bookingUrl: "",
  notes: "",
  lat: "",
  lng: "",
};

export default function AdminCourtsPage() {
  const { courtReports, reviewCourtReport } = useApp();
  const [courts, setCourts] = useState<Court[]>([]);
  const [busyId, setBusyId] = useState("");
  const [draft, setDraft] = useState(emptyDraft);
  const pendingReports = courtReports.filter((report) => report.status === "pending");

  useEffect(() => subscribeToCourts(setCourts), []);

  async function runReview(reportId: string, status: "approved" | "rejected") {
    setBusyId(reportId);
    try {
      await reviewCourtReport(reportId, status);
    } finally {
      setBusyId("");
    }
  }

  async function addCourt(event: React.FormEvent) {
    event.preventDefault();
    const courtId = `court-${Date.now()}`;
    const payload: CourtFormInput = {
      name: draft.name,
      city: draft.city,
      district: draft.district,
      address: draft.address,
      lat: draft.lat ? Number.parseFloat(draft.lat) : 0,
      lng: draft.lng ? Number.parseFloat(draft.lng) : 0,
      indoor: draft.indoor,
      surfaceType: draft.surfaceType,
      totalCourts: Math.min(50, Math.max(1, Number.parseInt(draft.totalCourts, 10) || 1)),
      hasNightLight: draft.hasNightLight,
      openHours: draft.openHours,
      phone: draft.phone,
      bookingMethod: draft.bookingMethod,
      bookingUrl: draft.bookingUrl,
      notes: draft.notes.slice(0, 300),
      status: "active",
    };
    await saveCourt(courtId, payload);
    setDraft(emptyDraft);
  }

  return (
    <AdminGuard>
      <section className="mx-auto max-w-md px-6 py-10">
        <div className="rounded-[2rem] bg-pine p-6 text-white shadow-lg">
          <p className="text-sm font-semibold text-gold">Admin</p>
          <h1 className="mt-2 text-3xl font-bold">球場管理</h1>
          <p className="mt-4 leading-7 text-parchment">即時球場列表、新增球場、審核會員回報。</p>
        </div>

        <Link
          href="/admin/pending"
          className="mt-6 flex h-12 items-center justify-center rounded-full bg-clay px-5 text-sm font-bold text-white"
        >
          完整審核頁（{pendingReports.length} 待審）
        </Link>

        <h2 className="mt-8 text-lg font-bold text-pine">待審回報</h2>
        <div className="mt-3 space-y-3">
          {pendingReports.length === 0 ? (
            <p className="text-sm text-muted">目前沒有待審球場。</p>
          ) : (
            pendingReports.map((report) => (
              <article key={report.id} className="rounded-[1.5rem] bg-white p-5 ring-1 ring-parchment">
                <p className="text-xs font-semibold text-clay">
                  {report.city} {report.district}
                </p>
                <h3 className="mt-1 font-bold text-pine">{report.name}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{report.address}</p>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    disabled={busyId === report.id}
                    onClick={() => void runReview(report.id, "approved")}
                    className="rounded-full bg-pine px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
                  >
                    核准並上架
                  </button>
                  <button
                    type="button"
                    disabled={busyId === report.id}
                    onClick={() => void runReview(report.id, "rejected")}
                    className="rounded-full bg-ivory px-4 py-2 text-xs font-bold text-clay disabled:opacity-50"
                  >
                    拒絕
                  </button>
                </div>
              </article>
            ))
          )}
        </div>

        <h2 className="mt-8 text-lg font-bold text-pine">新增球場</h2>
        <form onSubmit={(e) => void addCourt(e)} className="mt-3 space-y-3 rounded-[1.5rem] bg-white p-5 ring-1 ring-parchment">
          <input
            required
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            placeholder="① 球場名稱（必填）"
            className="w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay"
          />
          <select
            required
            value={draft.city}
            onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))}
            className="w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay"
          >
            {taiwanCities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            required
            value={draft.district}
            onChange={(e) => setDraft((d) => ({ ...d, district: e.target.value }))}
            placeholder="③ 行政區（必填）"
            className="w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay"
          />
          <input
            required
            value={draft.address}
            onChange={(e) => setDraft((d) => ({ ...d, address: e.target.value }))}
            placeholder="④ 地址（必填）"
            className="w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay"
          />
          <select
            required
            value={draft.indoor}
            onChange={(e) => setDraft((d) => ({ ...d, indoor: e.target.value as "indoor" | "outdoor" }))}
            className="w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay"
          >
            <option value="outdoor">室外</option>
            <option value="indoor">室內</option>
          </select>
          <select
            required
            value={draft.surfaceType}
            onChange={(e) =>
              setDraft((d) => ({ ...d, surfaceType: e.target.value as "hard" | "clay" | "grass" }))
            }
            className="w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay"
          >
            <option value="hard">硬地</option>
            <option value="clay">紅土</option>
            <option value="grass">草地</option>
          </select>
          <input
            required
            type="number"
            min={1}
            max={50}
            value={draft.totalCourts}
            onChange={(e) => setDraft((d) => ({ ...d, totalCourts: e.target.value }))}
            placeholder="⑦ 場地面數"
            className="w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay"
          />
          <label className="flex items-center justify-between rounded-2xl bg-ivory px-4 py-3 text-sm font-semibold text-pine">
            ⑧ 夜間照明
            <input
              type="checkbox"
              checked={draft.hasNightLight}
              onChange={(e) => setDraft((d) => ({ ...d, hasNightLight: e.target.checked }))}
              className="h-5 w-5 accent-clay"
            />
          </label>
          <input
            required
            value={draft.openHours}
            onChange={(e) => setDraft((d) => ({ ...d, openHours: e.target.value }))}
            placeholder="⑨ 開放時間（例：平日 06:00–22:00）"
            className="w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay"
          />
          <input
            type="tel"
            value={draft.phone}
            onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
            placeholder="⑩ 電話"
            className="w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay"
          />
          <input
            value={draft.bookingMethod}
            onChange={(e) => setDraft((d) => ({ ...d, bookingMethod: e.target.value }))}
            placeholder="⑪ 預約方式（電話/線上/現場）"
            className="w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay"
          />
          <input
            type="url"
            value={draft.bookingUrl}
            onChange={(e) => setDraft((d) => ({ ...d, bookingUrl: e.target.value }))}
            placeholder="⑫ 預約網址"
            className="w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay"
          />
          <textarea
            maxLength={300}
            value={draft.notes}
            onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
            placeholder="⑬ 備註（300 字上限）"
            rows={3}
            className="w-full resize-none rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              step="any"
              value={draft.lat}
              onChange={(e) => setDraft((d) => ({ ...d, lat: e.target.value }))}
              placeholder="緯度（選填）"
              className="rounded-2xl border border-parchment bg-ivory px-3 py-2 text-sm outline-none focus:border-clay"
            />
            <input
              type="number"
              step="any"
              value={draft.lng}
              onChange={(e) => setDraft((d) => ({ ...d, lng: e.target.value }))}
              placeholder="經度（選填）"
              className="rounded-2xl border border-parchment bg-ivory px-3 py-2 text-sm outline-none focus:border-clay"
            />
          </div>
          <button type="submit" className="w-full rounded-full bg-clay px-4 py-3 text-sm font-bold text-white">
            新增至 Firestore
          </button>
        </form>

        <h2 className="mt-8 text-lg font-bold text-pine">已上架球場（{courts.length}）</h2>
        <div className="mt-3 space-y-3">
          {courts.map((court) => (
            <article key={court.id} className="rounded-[1.5rem] bg-white p-5 ring-1 ring-parchment">
              <p className="text-xs font-semibold text-clay">
                {court.city} {court.district} · {court.environment} · {court.surface}
              </p>
              <h3 className="mt-1 font-bold text-pine">{court.name}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{court.address}</p>
              {court.weekdayHours ? (
                <p className="mt-1 text-xs text-muted">開放：{court.weekdayHours}</p>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`確定下架「${court.name}」？`)) {
                    void softDeleteCourt(court.id);
                  }
                }}
                className="mt-4 rounded-full bg-ivory px-4 py-2 text-xs font-bold text-clay"
              >
                軟刪除
              </button>
            </article>
          ))}
        </div>
      </section>
    </AdminGuard>
  );
}
