"use client";

import { useState } from "react";
import { requestNotificationPermission } from "@/lib/messaging";

export default function EnableNotificationsButton({ uid }: { uid?: string }) {
  const [status, setStatus] = useState("");

  if (!uid) return null;

  async function enable() {
    setStatus("");
    try {
      await requestNotificationPermission(uid!);
      setStatus("通知已開啟。");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "通知開啟失敗");
    }
  }

  return (
    <div className="rounded-lg bg-ivory p-4">
      <button type="button" onClick={() => void enable()} className="w-full rounded-lg bg-pine px-4 py-3 text-sm font-bold text-white">
        開啟通知
      </button>
      {status ? <p className="mt-2 text-xs font-bold text-muted">{status}</p> : null}
    </div>
  );
}
