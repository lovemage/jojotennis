"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import { useApp } from "@/context/AppContext";
import { subscribeToCourts, saveCourt, softDeleteCourt } from "@/lib/courtService";
import type { Court } from "@/data/courts";

export default function AdminCourtsPage() {
  const { courtReports, reviewCourtReport } = useApp();
  const [courts, setCourts] = useState<Court[]>([]);
  const [busyId, setBusyId] = useState("");
  const pendingReports = courtReports.filter((report) => report.status === "pending");

  const [draft, setDraft] = useState({
    name: "",
    city: "台北市",
    district: "",
    address: "",
    totalCourts: "4",
    openHours: "",
    phone: "",
  });

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
    await saveCourt({
      courtId,
      name: draft.name.trim(),
      city: draft.city,
      district: draft.district,
      address: draft.address,
      lat: 0,
      lng: 0,
      surfaceType: "hard",
      indoor: "outdoor",
      totalCourts: Number.parseInt(draft.totalCourts, 10) || 1,
      hasNightLight: false,
      phone: draft.phone,
      bookingUrl: "",
      openHours: draft.openHours || "—",
      status: "active",
      isDeleted: false,
      deletedAt: null,
    });
    setDraft({ name: "", city: "台北市", district: "", address: "", totalCourts: "4", openHours: "", phone: "" });
  }

  return (
    <AdminGuard>
      <section className="mx-auto max-w-md px-6 py-10">
        <div className="rounded-[2rem] bg-pine p-6 text-white shadow-lg">
          <p className="text-sm font-semibold text-gold">Admin</p>
          <h1 className="mt-2 text-3xl font-bold">球場管理</h1>
          <p className="mt-4 leading-7 text-parchment">
            即時球場列表、新增球場、審核會員回報。
          </p>
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
            placeholder="球場名稱"
            className="w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              value={draft.city}
              onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))}
              placeholder="縣市"
              className="rounded-2xl border border-parchment bg-ivory px-3 py-2 text-sm outline-none focus:border-clay"
            />
            <input
              value={draft.district}
              onChange={(e) => setDraft((d) => ({ ...d, district: e.target.value }))}
              placeholder="行政區"
              className="rounded-2xl border border-parchment bg-ivory px-3 py-2 text-sm outline-none focus:border-clay"
            />
          </div>
          <input
            value={draft.address}
            onChange={(e) => setDraft((d) => ({ ...d, address: e.target.value }))}
            placeholder="地址"
            className="w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay"
          />
          <button type="submit" className="w-full rounded-full bg-clay px-4 py-3 text-sm font-bold text-white">
            新增至 Firestore
          </button>
        </form>

        <h2 className="mt-8 text-lg font-bold text-pine">已上架球場（{courts.length}）</h2>
        <div className="mt-3 space-y-3">
          {courts.map((court) => (
            <article key={court.id} className="rounded-[1.5rem] bg-white p-5 ring-1 ring-parchment">
              <p className="text-xs font-semibold text-clay">
                {court.city} {court.district}
              </p>
              <h3 className="mt-1 font-bold text-pine">{court.name}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{court.address}</p>
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
