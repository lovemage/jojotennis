"use client";

import { useEffect, useState } from "react";

export default function InstallPrompt() {
  const [showIosHint, setShowIosHint] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(() => {
    const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    if (isIos && !isStandalone && !window.localStorage.getItem("jojo-install-dismissed")) {
      setShowIosHint(true);
    }
  }, []);

  useEffect(() => {
    const onScroll = () => {
      if (window.scrollY > 280) setHasScrolled(true);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!showIosHint || !hasScrolled) return null;

  return (
    <div className="fixed inset-x-4 bottom-24 z-40 mx-auto max-w-md rounded-2xl border border-pine/10 bg-white p-4 shadow-[0_18px_48px_rgba(30,61,47,0.16)]">
      <p className="text-sm font-bold text-pine">將 JoJo Tennis 加到主畫面</p>
      <p className="mt-1 text-xs leading-5 text-muted">
        請點 Safari 分享按鈕，再選擇「加入主畫面」。
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => {
            window.localStorage.setItem("jojo-install-dismissed", "1");
            setShowIosHint(false);
          }}
          className="rounded-lg bg-ivory px-4 py-2 text-xs font-bold text-pine"
        >
          稍後
        </button>
      </div>
    </div>
  );
}
