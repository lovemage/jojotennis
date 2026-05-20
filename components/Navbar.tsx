"use client";

import { usePathname, useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";

const navItems = [
  { href: "/", icon: "🏠", label: "首頁" },
  { href: "/courts", icon: "🗺", label: "找球場" },
  { href: "/match", icon: "🎾", label: "揪球友" },
  { href: "/club", icon: "👥", label: "社團" },
  { href: "/coach", icon: "🎓", label: "找教練" },
  { href: "/profile", icon: "👤", label: "個人" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useApp();

  return (
    <nav className="fixed inset-x-0 bottom-0 border-t border-parchment bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
      <div className="mx-auto mb-2 max-w-md px-2 text-xs font-bold text-pine">
        揪揪網球 <span className="text-muted">JoJo Tennis</span>
      </div>
      <div className="mx-auto flex max-w-md items-center justify-between gap-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <button
              key={item.href}
              type="button"
              onClick={() => {
                if (item.href === "/profile" && !user) {
                  router.push("/auth");
                  return;
                }

                router.push(item.href);
              }}
              className={`flex min-w-0 flex-1 flex-col items-center rounded-2xl px-1.5 py-1.5 text-[11px] font-medium leading-tight transition ${
                isActive ? "bg-pine text-white" : "text-muted hover:text-pine"
              }`}
            >
              <span className="text-xs leading-none">{item.icon}</span>
              <span className="mt-1 whitespace-nowrap">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
