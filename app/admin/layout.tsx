"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";

const adminLinks = [
  { href: "/admin", label: "總覽" },
  { href: "/admin/users", label: "會員管理" },
  { href: "/admin/matches", label: "約球管理" },
  { href: "/admin/pages", label: "分頁管理" },
  { href: "/admin/reviews", label: "球具評測" },
  { href: "/admin/courts", label: "球場管理" },
  { href: "/admin/pending", label: "球場審核" },
  { href: "/admin/coaches", label: "教練管理" },
  { href: "/admin/news", label: "新聞管理" },
  { href: "/admin/messages", label: "訊息管理" },
  { href: "/admin/announcements", label: "公告管理" },
  { href: "/admin/email-broadcast", label: "Email 廣播" },
  { href: "/admin/email-templates", label: "Email 模板" },
  { href: "/admin/test", label: "測試清單" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, authReady, isAdmin } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!authReady || loading) return;
    if (!user) {
      router.replace("/login?next=/admin");
      return;
    }
    if (!isAdmin) {
      router.replace("/");
    }
  }, [user, loading, authReady, isAdmin, router]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  if (!authReady || loading) {
    return (
      <section className="mx-auto max-w-md px-6 py-16 text-center">
        <p className="text-sm text-muted">正在確認管理權限...</p>
      </section>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-ivory pb-8">
      <header className="sticky top-0 z-50 border-b border-pine/10 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between px-5 py-3">
          <Link href="/admin" onClick={() => setMenuOpen(false)} className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-clay">Admin</p>
            <p className="truncate text-lg font-black text-pine">管理後台</p>
          </Link>

          <details
            open={menuOpen}
            onToggle={(event) => setMenuOpen(event.currentTarget.open)}
            className="relative"
          >
            <summary className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-full border border-pine/10 bg-ivory text-2xl font-black text-pine [&::-webkit-details-marker]:hidden">
              ≡
            </summary>
            <nav className="absolute right-0 top-[calc(100%+0.75rem)] grid w-56 gap-1 rounded-2xl border border-pine/10 bg-white p-2 shadow-[0_18px_60px_rgba(30,61,47,0.18)]">
              {adminLinks.map((link) => {
                const active =
                  pathname === link.href ||
                  (link.href !== "/admin" && pathname.startsWith(`${link.href}/`));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className={`rounded-xl px-4 py-3 text-sm font-bold ${
                      active ? "bg-pine text-white" : "text-pine hover:bg-parchment"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </details>
        </div>
      </header>

      {children}
    </div>
  );
}
