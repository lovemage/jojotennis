"use client";

import { useEffect, useState } from "react";
import { getAttendanceStats } from "@/lib/reviewService";
import type { AttendanceStats } from "@/lib/supabase.types";

export default function UserStatsBadge({ uid }: { uid: string }) {
  const [stats, setStats] = useState<AttendanceStats | null>(null);

  useEffect(() => {
    getAttendanceStats(uid)
      .then(setStats)
      .catch(() => setStats(null));
  }, [uid]);

  if (!stats) return null;
  if (stats.obligationCount < 5) {
    return <span className="rounded-full bg-ivory px-3 py-1 text-xs font-bold text-pine">新會員</span>;
  }

  return (
    <span className="rounded-full bg-ivory px-3 py-1 text-xs font-bold text-pine">
      參加率 {Math.round(stats.attendanceRate * 100)}%
      {stats.averageStars ? ` · ${stats.averageStars.toFixed(1)}★` : ""}
    </span>
  );
}
