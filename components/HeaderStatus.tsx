"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getUser, type JojoUser } from "@/lib/auth";
import { getUnreadMessageCount } from "@/lib/messageStore";

export default function HeaderStatus() {
  const [user, setUser] = useState<JojoUser | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    function syncStatus() {
      setUser(getUser());
      setUnreadCount(getUnreadMessageCount());
    }

    syncStatus();
    window.addEventListener("storage", syncStatus);
    window.addEventListener("jojo-auth-change", syncStatus);
    window.addEventListener("jojo-messages-change", syncStatus);

    return () => {
      window.removeEventListener("storage", syncStatus);
      window.removeEventListener("jojo-auth-change", syncStatus);
      window.removeEventListener("jojo-messages-change", syncStatus);
    };
  }, []);

  return (
    <div className="h-10 border-b border-parchment bg-white px-4">
      <div className="mx-auto flex h-full max-w-md items-center justify-end gap-2">
        {user ? (
          <>
            <Link
              href="/profile?tab=messages"
              aria-label="查看訊息"
              className="relative rounded-full px-2 py-1 text-lg"
            >
              🔔
              {unreadCount > 0 ? (
                <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-600 px-1 text-center text-[11px] font-bold leading-5 text-white">
                  {unreadCount}
                </span>
              ) : null}
            </Link>
            <Link href="/profile" className="text-sm font-bold text-pine">
              {user.nickname}
            </Link>
          </>
        ) : (
          <>
            <Link
              href="/auth"
              className="rounded-full border border-pine px-3 py-1.5 text-xs font-bold text-pine"
            >
              登入
            </Link>
            <Link
              href="/auth"
              className="rounded-full bg-clay px-3 py-1.5 text-xs font-bold text-white"
            >
              免費註冊
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
