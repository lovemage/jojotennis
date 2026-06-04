"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";
import AdminHeroImagePanel from "@/components/AdminHeroImagePanel";
import { useApp } from "@/context/AppContext";
import { fetchAdminDashboardCounts, type AdminDashboardCounts } from "@/lib/adminService";
import { USE_SUPABASE } from "@/lib/config";

export default function AdminPage() {
  const { addAdminUser } = useApp();
  const [adminEmail, setAdminEmail] = useState("");
  const [counts, setCounts] = useState<AdminDashboardCounts | null>(null);
  const [loading, setLoading] = useState(USE_SUPABASE);

  useEffect(() => {
    if (!USE_SUPABASE) {
      setLoading(false);
      return;
    }
    void fetchAdminDashboardCounts()
      .then(setCounts)
      .finally(() => setLoading(false));
  }, []);

  const adminStats = [
    { label: "會員數", value: counts?.users ?? "—" },
    { label: "開放揪球", value: counts?.openMatches ?? "—" },
    { label: "評測內容", value: "—" },
    { label: "待審球場", value: counts?.pendingCourts ?? "—" },
    { label: "新聞數", value: counts?.news ?? "—" },
    { label: "教練數", value: counts?.coaches ?? "—" },
    { label: "學員需求", value: counts?.studentPosts ?? "—" },
  ];

  const modules = [
    ["/admin/users", "會員管理"],
    ["/admin/matches", "約球管理"],
    ["/admin/pages", "分頁管理"],
    ["/admin/reviews", "球具評測管理"],
    ["/admin/courts", "球場管理"],
    ["/admin/pending", "球場回報審核"],
    ["/admin/coaches", "教練管理"],
    ["/admin/news", "新聞管理"],
    ["/admin/messages", "訊息管理"],
    ["/admin/announcements", "公告管理"],
    ["/admin/legal", "隱私權／服務條款"],
    ["/admin/email-broadcast", "Email 廣播"],
    ["/admin/email-templates", "Email 模板"],
    ["/admin/test", "E2E 測試清單"],
  ];

  function grantAdmin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    addAdminUser(adminEmail);
    setAdminEmail("");
  }

  return (
    <AdminGuard>
      <section className="mx-auto max-w-md px-6 py-10">
        <div className="rounded-[2rem] bg-pine p-6 text-white shadow-lg">
          <p className="text-sm font-semibold text-gold">管理者</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">管理後台</h1>
          <p className="mt-4 leading-7 text-parchment">
            即時統計與內容管理，資料來自 Supabase。
          </p>
        </div>

        {loading ? (
          <p className="mt-6 text-center text-sm text-muted">載入統計中…</p>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-3">
            {adminStats.map((stat) => (
              <div key={stat.label} className="rounded-2xl bg-white p-4 ring-1 ring-parchment">
                <p className="text-2xl font-bold text-pine">{stat.value}</p>
                <p className="mt-1 text-xs font-medium text-muted">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-3">
          {modules.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="rounded-2xl bg-white p-4 text-sm font-bold text-pine ring-1 ring-parchment"
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="mt-6 rounded-[1.5rem] border border-parchment bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-clay">管理者授權</p>
          <form onSubmit={grantAdmin} className="mt-4 space-y-3">
            <input
              type="email"
              value={adminEmail}
              onChange={(event) => setAdminEmail(event.target.value)}
              placeholder="輸入要授權的 Email"
              className="w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay"
            />
            <button
              type="submit"
              className="w-full rounded-full bg-clay px-4 py-3 text-sm font-bold text-white"
            >
              新增管理者
            </button>
          </form>
        </div>

        <AdminHeroImagePanel />

      </section>
    </AdminGuard>
  );
}
