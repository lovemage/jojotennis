"use client";

import { useEffect, useState } from "react";
import { formatMatchStartCountdown } from "@/lib/timeUtils";

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function MatchCapacityProgress({
  current,
  total,
  className = "",
}: {
  current: number;
  total: number;
  className?: string;
}) {
  const safeTotal = Math.max(1, total);
  const remaining = Math.max(safeTotal - current, 0);
  const ratio = clampPercent((Math.min(current, safeTotal) / safeTotal) * 100);

  return (
    <div className={className}>
      <div className="flex items-center justify-between text-xs text-muted">
        <span>已參加 {Math.min(current, safeTotal)} 人</span>
        <span>
          總共 {safeTotal} 人 · 還差 {remaining} 人
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-parchment/80">
        <div className="h-full rounded-full bg-gold" style={{ width: `${ratio}%` }} />
      </div>
    </div>
  );
}

export function MatchStartCountdown({
  date,
  startTime,
  className = "",
  live = false,
  compact = false,
}: {
  date: string;
  startTime: string;
  className?: string;
  live?: boolean;
  compact?: boolean;
}) {
  const [label, setLabel] = useState(() => formatMatchStartCountdown(date, startTime));

  useEffect(() => {
    const update = () => setLabel(formatMatchStartCountdown(date, startTime));
    update();
    if (live) {
      const timer = window.setInterval(update, 30_000);
      return () => window.clearInterval(timer);
    }
    return undefined;
  }, [date, startTime, live]);

  if (!label) return null;

  return (
    <p className={`text-xs font-bold ${compact ? "text-ink" : "text-pine"} ${className}`}>
      {label}
    </p>
  );
}
