"use client";

import { useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import { useApp } from "@/context/AppContext";

export default function AdminPendingCourtsPage() {
  const { courtReports, reviewCourtReport } = useApp();
  const [busyId, setBusyId] = useState("");
  const pendingReports = courtReports.filter((report) => report.status === "pending");
  const reviewedReports = courtReports.filter((report) => report.status !== "pending");

  async function handleReview(reportId: string, status: "approved" | "rejected") {
    setBusyId(reportId);
    try {
      await reviewCourtReport(reportId, status);
    } finally {
      setBusyId("");
    }
  }

  return (
    <AdminGuard>
      <section className="mx-auto max-w-md px-6 py-10">
        <div className="rounded-[2rem] bg-pine p-6 text-white shadow-lg">
          <p className="text-sm font-semibold text-gold">球場回報</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">待審核球場</h1>
          <p className="mt-4 leading-7 text-parchment">
            核准後會自動寫入 `courts` 集合並在前台顯示。
          </p>
        </div>

        <div className="mt-6 space-y-4">
          {pendingReports.length > 0 ? (
            pendingReports.map((report) => (
              <article
                key={report.id}
                className="rounded-[1.5rem] border border-parchment bg-white p-5 shadow-sm"
              >
                <p className="text-xs font-bold text-clay">{report.reporterNickname} 回報</p>
                <h2 className="mt-2 text-xl font-bold text-pine">{report.name}</h2>
                <div className="mt-3 space-y-1 text-sm leading-6 text-muted">
                  <p>
                    {report.city}・{report.district || "行政區未填"}
                  </p>
                  <p>{report.address}</p>
                  <p>場地數：{report.courtCount || "未填"}</p>
                  <p>預約方式：{report.bookingMethod || "未填"}</p>
                  <p>補充：{report.note || "無"}</p>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={busyId === report.id}
                    onClick={() => void handleReview(report.id, "approved")}
                    className="rounded-full bg-green-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
                  >
                    核准上架
                  </button>
                  <button
                    type="button"
                    disabled={busyId === report.id}
                    onClick={() => void handleReview(report.id, "rejected")}
                    className="rounded-full border border-pine px-4 py-3 text-sm font-bold text-pine disabled:opacity-50"
                  >
                    拒絕
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-[1.5rem] bg-white p-5 text-sm text-muted ring-1 ring-parchment">
              目前沒有待審核球場回報。
            </div>
          )}
        </div>

        {reviewedReports.length > 0 ? (
          <div className="mt-6 rounded-[1.5rem] bg-white p-5 ring-1 ring-parchment">
            <h2 className="text-lg font-bold text-pine">已處理</h2>
            <div className="mt-3 space-y-2">
              {reviewedReports.slice(0, 10).map((report) => (
                <p key={report.id} className="text-sm text-muted">
                  {report.name} · {report.status === "approved" ? "已核准" : "已拒絕"}
                </p>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </AdminGuard>
  );
}
