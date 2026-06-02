"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useScrollHide } from "@/hooks/useScrollHide";
import { useUiStore } from "@/stores/useUiStore";

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true" className={active ? "text-pine" : "text-ink"}>
      <path d="M11.47 3.841a.75.75 0 0 1 1.06 0l8.69 8.69a.75.75 0 1 0 1.06-1.061l-8.689-8.69a2.25 2.25 0 0 0-3.182 0l-8.69 8.69a.75.75 0 1 0 1.061 1.06z" />
      <path d="m12 5.432 8.159 8.159q.045.044.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 0-.75-.75h-3a.75.75 0 0 0-.75.75V21a.75.75 0 0 1-.75.75H5.625a1.875 1.875 0 0 1-1.875-1.875v-6.198l.091-.086z" />
    </svg>
  );
}

function MatchIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="28"
      height="28"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={active ? "text-pine" : "text-ink"}
    >
      <path
        fill="none"
        d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.45 7.45 0 0 1-.982-3.172M9.497 14.25a7.45 7.45 0 0 0 .981-3.172M5.25 4.236q-1.473.215-2.916.52A6 6 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25s4.545.16 6.75.47v1.516M7.73 9.728a6.7 6.7 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46 46 0 0 1 2.916.52a6 6 0 0 1-5.395 4.972m0 0a6.7 6.7 0 0 1-2.749 1.35m0 0a6.8 6.8 0 0 1-3.044 0"
      />
    </svg>
  );
}

function DocumentIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true" className={active ? "text-pine" : "text-ink"}>
      <path fillRule="evenodd" d="M4.125 3C3.089 3 2.25 3.84 2.25 4.875V18a3 3 0 0 0 3 3h15a3 3 0 0 1-3-3V4.875C17.25 3.839 16.41 3 15.375 3zM12 9.75a.75.75 0 0 0 0 1.5h1.5a.75.75 0 0 0 0-1.5zm-.75-2.25a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5H12a.75.75 0 0 1-.75-.75M6 12.75a.75.75 0 0 0 0 1.5h7.5a.75.75 0 0 0 0-1.5zm-.75 3.75a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5H6a.75.75 0 0 1-.75-.75M6 6.75a.75.75 0 0 0-.75.75v3c0 .414.336.75.75.75h3a.75.75 0 0 0 .75-.75v-3A.75.75 0 0 0 9 6.75z" clipRule="evenodd" />
      <path d="M18.75 6.75h1.875c.621 0 1.125.504 1.125 1.125V18a1.5 1.5 0 0 1-3 0z" />
    </svg>
  );
}

function CourtCoachIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="28"
      height="28"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={active ? "text-pine" : "text-ink"}
    >
      <path
        fill="none"
        d="M9 12.75L11.25 15L15 9.75m-3-7.036A11.96 11.96 0 0 1 3.598 6A12 12 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623c5.176-1.332 9-6.03 9-11.622c0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285"
      />
    </svg>
  );
}

function NavButton({
  active,
  label,
  onClick,
  icon,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex min-w-0 flex-1 flex-col items-center justify-center rounded-full px-2 py-2 transition ${
        active ? "bg-gold/18" : "hover:bg-pine/5"
      }`}
    >
      {active ? <span className="absolute top-1 h-1 w-5 rounded-full bg-gold" /> : null}
      <span className="mt-1 grid h-7 place-items-center">{icon}</span>
      <span className={`mt-0.5 text-[10px] font-black leading-none ${active ? "text-pine" : "text-muted"}`}>{label}</span>
    </button>
  );
}

function DropdownNavButton({
  active,
  label,
  icon,
  links,
  align = "right",
  isOpen,
  onToggle,
  onClose,
}: {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  links: Array<{ href: string; label: string; tone: "pine" | "gold" }>;
  align?: "left" | "right" | "center";
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const positionClass =
    align === "left" ? "left-0" : align === "center" ? "left-1/2 -translate-x-1/2" : "right-0";
  return (
    <div className="relative min-w-0 flex-1">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={onToggle}
        className={`relative flex w-full cursor-pointer flex-col items-center justify-center rounded-full px-2 py-2 transition ${
          active || isOpen ? "bg-gold/18" : "hover:bg-pine/5"
        }`}
      >
        {active ? <span className="absolute top-1 h-1 w-5 rounded-full bg-gold" /> : null}
        <span className="mt-1 grid h-7 place-items-center">{icon}</span>
        <span className={`mt-0.5 text-[10px] font-black leading-none ${active ? "text-pine" : "text-muted"}`}>{label}</span>
      </button>

      {isOpen ? (
        <div
          className={`absolute bottom-[calc(100%+0.85rem)] ${positionClass} z-[90] flex w-48 justify-center gap-2 rounded-full border border-pine/10 bg-white p-2 shadow-[0_18px_50px_rgba(30,61,47,0.2)] backdrop-blur-xl`}
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose}
              className={`rounded-full px-5 py-2 text-xs font-black ${
                link.tone === "pine" ? "bg-pine text-white" : "bg-gold text-pine"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const hidden = useScrollHide();
  const forceHidden = useUiStore((s) => s.navHidden);
  const [openDropdown, setOpenDropdown] = useState<"reviews" | "courts" | null>(null);
  const navRef = useRef<HTMLDivElement | null>(null);

  const courtCoachActive = pathname === "/courts" || pathname === "/coach";
  const reviewsNewsActive =
    pathname === "/reviews" || pathname.startsWith("/reviews/") || pathname === "/news" || pathname.startsWith("/news/");

  useEffect(() => {
    setOpenDropdown(null);
  }, [pathname]);

  useEffect(() => {
    if (!openDropdown) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!navRef.current?.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [openDropdown]);

  if (pathname?.startsWith("/admin")) return null;

  return (
    <nav
      className={`fixed inset-x-0 bottom-0 z-[80] px-4 pb-[calc(0.9rem+env(safe-area-inset-bottom))] transition-transform duration-300 will-change-transform ${
        forceHidden || (hidden && !openDropdown) ? "translate-y-[calc(100%+1rem)]" : "translate-y-0"
      }`}
    >
      <div
        ref={navRef}
        className="mx-auto flex max-w-md items-center justify-between gap-1 rounded-full border border-pine/10 bg-white/96 p-2 shadow-[0_18px_60px_rgba(30,61,47,0.18)] backdrop-blur-xl"
      >
        <NavButton
          active={pathname === "/"}
          label="首頁"
          onClick={() => router.push("/")}
          icon={<HomeIcon active={pathname === "/"} />}
        />
        <NavButton
          active={pathname === "/match"}
          label="揪球"
          onClick={() => router.push("/match")}
          icon={<MatchIcon active={pathname === "/match"} />}
        />
        <DropdownNavButton
          active={reviewsNewsActive}
          label="評測/新聞"
          icon={<DocumentIcon active={reviewsNewsActive} />}
          align="center"
          isOpen={openDropdown === "reviews"}
          onToggle={() => setOpenDropdown((current) => (current === "reviews" ? null : "reviews"))}
          onClose={() => setOpenDropdown(null)}
          links={[
            { href: "/reviews", label: "評測", tone: "pine" },
            { href: "/news", label: "新聞", tone: "gold" },
          ]}
        />
        <DropdownNavButton
          active={courtCoachActive}
          label="球場/教練"
          icon={<CourtCoachIcon active={courtCoachActive} />}
          align="right"
          isOpen={openDropdown === "courts"}
          onToggle={() => setOpenDropdown((current) => (current === "courts" ? null : "courts"))}
          onClose={() => setOpenDropdown(null)}
          links={[
            { href: "/courts", label: "球場", tone: "pine" },
            { href: "/coach", label: "教練", tone: "gold" },
          ]}
        />
      </div>
    </nav>
  );
}
