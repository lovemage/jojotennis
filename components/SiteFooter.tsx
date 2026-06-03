"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links: Array<{ href: string; label: string }> = [
  { href: "/", label: "首頁" },
  { href: "/match", label: "揪球" },
  { href: "/buddies", label: "球友列表" },
  { href: "/courts", label: "找球場" },
  { href: "/coach", label: "找教練" },
  { href: "/reviews", label: "球具評測" },
  { href: "/news", label: "網球新聞" },
  { href: "/ntrp", label: "NTRP 等級指南" },
];

export default function SiteFooter() {
  const pathname = usePathname();
  if (pathname !== "/") return null;
  const year = new Date().getFullYear();

  return (
    <footer className="mt-8 bg-pine pb-[calc(5.25rem+env(safe-area-inset-bottom))] pt-8 text-parchment">
      <div className="mx-auto max-w-md px-5">
        <div className="flex items-center gap-3">
          <img
            src="/icons/logo.png"
            alt="JoJo Tennis"
            className="h-9 w-auto object-contain"
          />
          <p className="text-lg font-black tracking-tight text-white">揪揪網球</p>
        </div>
        <p className="mt-3 text-xs leading-6 text-parchment/80">
          全台最大網球社群平台。找球場、揪球友、配教練，把每一次上場安排得更俐落。
        </p>

        <nav className="mt-6 grid grid-cols-2 gap-x-4 gap-y-3 text-sm font-bold text-white/90">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-gold">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-xs text-parchment/70">
          <a href="mailto:support@jojotennis.com" className="hover:text-gold">聯絡我們</a>
          <Link href="/privacy" className="hover:text-gold">隱私權政策</Link>
          <Link href="/terms" className="hover:text-gold">服務條款</Link>
        </div>

        <p className="mt-6 border-t border-parchment/15 pt-4 text-[11px] text-parchment/60">
          © {year} JoJo Tennis · 揪揪網球. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
