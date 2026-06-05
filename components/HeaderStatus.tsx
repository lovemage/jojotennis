"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { useUiStore } from "@/stores/useUiStore";
import { getAttendanceStats } from "@/lib/reviewService";
import { useScrollHide } from "@/hooks/useScrollHide";
import {
  subscribeMyCoach,
  setCoachPublished,
  type MyCoachState,
} from "@/lib/coachService";

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
      <path d="M5.85 17.1h12.3a.75.75 0 0 0 .53-1.28l-.82-.82V10a5.87 5.87 0 0 0-4.36-5.67V3.75a1.5 1.5 0 0 0-3 0v.58A5.87 5.87 0 0 0 6.14 10v5l-.82.82a.75.75 0 0 0 .53 1.28ZM9.75 18.25a2.25 2.25 0 0 0 4.5 0z" />
    </svg>
  );
}

export default function HeaderStatus() {
  const { user, logout } = useApp();
  const unreadCount = useNotificationStore((s) => s.unreadTotal);
  const [open, setOpen] = useState(false);
  const [attendanceRate, setAttendanceRate] = useState(0.75);
  const [myCoach, setMyCoach] = useState<MyCoachState | null>(null);
  const [coachToggleBusy, setCoachToggleBusy] = useState(false);
  const [coachToggleError, setCoachToggleError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const hidden = useScrollHide();
  const announcementHeight = useUiStore((s) => s.announcementHeight);
  const attendancePercent = Math.max(0, Math.min(100, Math.round(attendanceRate * 100)));

  useEffect(() => {
    if (!user?.uid) return;
    let active = true;
    getAttendanceStats(user.uid)
      .then((stats) => {
        if (active) setAttendanceRate(stats.attendanceRate);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [user?.uid]);

  useEffect(() => {
    setMyCoach(null);
    setCoachToggleBusy(false);
    setCoachToggleError(null);
    if (!user?.uid) return;
    const unsub = subscribeMyCoach(user.uid, setMyCoach);
    return () => unsub();
  }, [user?.uid]);

  async function toggleCoachPublished() {
    if (!myCoach || coachToggleBusy) return;
    setCoachToggleBusy(true);
    setCoachToggleError(null);
    try {
      await setCoachPublished(myCoach.id, !myCoach.isPublished);
    } catch (error) {
      setCoachToggleError(
        error instanceof Error ? error.message : "切換失敗，請稍後再試",
      );
    } finally {
      setCoachToggleBusy(false);
    }
  }

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  return (
    <header
      className={`sticky z-50 border-b border-pine/10 bg-ivory/88 px-4 py-2 backdrop-blur-xl transition-transform duration-300 will-change-transform ${
        hidden && !open ? "-translate-y-full" : "translate-y-0"
      }`}
      style={{ top: announcementHeight }}
    >
      <div className="mx-auto flex h-[52px] max-w-md items-center justify-between gap-3">
        <Link href="/" className="flex h-[52px] items-center" aria-label="JoJo Tennis 首頁">
          <img
            src="/icons/logo.png"
            alt="JoJo Tennis"
            className="h-[45px] w-auto max-w-[11rem] object-contain"
          />
        </Link>
        {user ? (
          <div ref={panelRef} className="relative flex items-center gap-2">
            <Link href="/match" aria-label="查看揪球聊天室" className="relative grid h-9 w-9 place-items-center rounded-full border border-pine/10 bg-white text-pine">
              <BellIcon />
              {unreadCount > 0 ? (
                <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-clay px-1 text-center text-[11px] font-bold leading-5 text-white">
                  {unreadCount}
                </span>
              ) : null}
            </Link>
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className="grid h-9 w-9 place-items-center overflow-hidden rounded-full border border-pine/10 bg-pine text-sm font-black text-white"
              aria-label="開啟個人選單"
            >
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                user.avatarInitial
              )}
            </button>
            {open ? (
              <div className="absolute right-0 top-12 w-72 rounded-[1.5rem] border border-pine/10 bg-white p-4 shadow-[0_24px_70px_rgba(30,61,47,0.22)]">
                <div className="flex items-center gap-3">
                  <Link
                    href="/profile"
                    className="relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full bg-pine text-lg font-black text-white"
                    aria-label="前往我的資料"
                  >
                    {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" /> : user.avatarInitial}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-muted">暱稱</p>
                    <p className="mt-1 text-sm font-bold text-pine">{user.nickname}</p>
                    <p className="mt-1 text-xs text-muted">
                      帳號：{user.email || "-"}
                    </p>
                    <div className="mt-3">
                      <Link
                        href="/profile"
                        className="inline-flex rounded-full border border-pine/20 bg-white px-4 py-2 text-xs font-black text-pine"
                      >
                        進入我的資料
                      </Link>
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs font-bold text-pine">
                    <span>參加率</span>
                    <span>{attendancePercent}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-parchment">
                    <div className="h-full rounded-full bg-gold" style={{ width: `${attendancePercent}%` }} />
                  </div>
                </div>
                {myCoach ? (
                  <div className="mt-4 rounded-2xl border border-pine/10 bg-ivory p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-pine">🎓 教練</p>
                        <p className="text-[11px] text-muted">
                          {myCoach.isPublished
                            ? "公開於找教練列表"
                            : "已關閉公開檔案"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void toggleCoachPublished()}
                        disabled={coachToggleBusy}
                        className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-50 ${
                          myCoach.isPublished ? "bg-clay" : "bg-pine/20"
                        }`}
                        aria-label="切換公開教練檔案"
                        aria-pressed={myCoach.isPublished}
                      >
                        <span
                          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                            myCoach.isPublished ? "translate-x-5" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    </div>
                    {coachToggleError ? (
                      <p className="mt-2 text-[11px] font-bold text-clay">
                        {coachToggleError}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setOpen(false);
                  }}
                  className="mt-4 w-full rounded-full bg-pine px-4 py-3 text-sm font-black text-white"
                >
                  登出
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link href="/login" className="rounded-full border border-pine px-3 py-1.5 text-xs font-bold text-pine">
              登入
            </Link>
            <Link href="/login" className="rounded-full bg-clay px-3 py-1.5 text-xs font-bold text-white">
              免費註冊
            </Link>
          </div>
        )}
      </div>
  </header>
  );
}
