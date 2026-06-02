"use client";

import { useEffect, useMemo, useState } from "react";
import {
  subscribeAnnouncements,
  type Announcement,
} from "@/lib/announcementService";
import { useUiStore } from "@/stores/useUiStore";
import { useScrollHide } from "@/hooks/useScrollHide";

const MARQUEE_HEIGHT = 36;

export default function AnnouncementMarquee() {
  const [items, setItems] = useState<Announcement[]>([]);
  const setAnnouncementHeight = useUiStore((s) => s.setAnnouncementHeight);
  const hidden = useScrollHide();

  useEffect(() => {
    const unsub = subscribeAnnouncements(setItems);
    return () => {
      unsub();
    };
  }, []);

  const active = useMemo(() => {
    const now = Date.now();
    return items
      .filter((item) => {
        if (!item.isActive) return false;
        if (item.startsAt && item.startsAt > now) return false;
        if (item.endsAt && item.endsAt < now) return false;
        return Boolean(item.message?.trim());
      })
      .sort((a, b) => b.priority - a.priority);
  }, [items]);

  const combined = useMemo(
    () => active.map((item) => item.message.trim()).join("　·　"),
    [active],
  );

  useEffect(() => {
    setAnnouncementHeight(active.length > 0 ? MARQUEE_HEIGHT : 0);
    return () => {
      setAnnouncementHeight(0);
    };
  }, [active.length, setAnnouncementHeight]);

  const duration = useMemo(() => {
    const baseChars = Math.max(combined.length, 20);
    return Math.min(120, Math.max(20, Math.round(baseChars * 0.4)));
  }, [combined.length]);

  if (active.length === 0) return null;

  return (
    <div
      className={`sticky top-0 z-[51] bg-pine text-parchment transition-transform duration-300 will-change-transform ${
        hidden ? "-translate-y-full" : "translate-y-0"
      }`}
      style={{ height: MARQUEE_HEIGHT }}
    >
      <div className="announcement-marquee-wrapper relative mx-auto flex h-full max-w-md items-center overflow-hidden">
        <div
          className="announcement-marquee-track text-xs font-semibold tracking-wide"
          style={{ animationDuration: `${duration}s` }}
        >
          <span className="px-6">{combined}</span>
          <span className="px-6">{combined}</span>
        </div>
      </div>
    </div>
  );
}
