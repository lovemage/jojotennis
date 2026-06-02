"use client";

import { useMemo, useState } from "react";
import { submitReview } from "@/lib/reviewService";
import type { Match, User } from "@/context/AppContext";

export default function MatchReviewBanner({ match, user }: { match: Match; user: User | null }) {
  const [open, setOpen] = useState(false);
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState("");

  const ended = useMemo(() => {
    const endTime = new Date(`${match.date}T${match.endTime || "23:59"}:00`);
    return Number.isFinite(endTime.getTime()) && endTime.getTime() < Date.now();
  }, [match.date, match.endTime]);

  const isParticipant = Boolean(
    user && (match.ownerUid === user.uid || match.applicants.some((app) => app.uid === user.uid && app.status === "accepted")),
  );
  const revieweeUid = match.ownerUid === user?.uid ? match.applicants.find((app) => app.status === "accepted")?.uid : match.ownerUid;

  if (!ended || !isParticipant || !revieweeUid) return null;

  async function sendReview(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !revieweeUid) return;
    setStatus("");
    try {
      await submitReview({
        matchId: match.id,
        matchDate: `${match.date}T${match.endTime || "23:59"}:00+08:00`,
        reviewerUid: user.uid,
        revieweeUid,
        direction: match.ownerUid === user.uid ? "host_to_player" : "player_to_host",
        attended: true,
        stars,
        comment,
      });
      setStatus("評論已送出。");
      setOpen(false);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "送出失敗");
    }
  }

  return (
    <div className="mt-4 rounded-lg border border-clay bg-clay/10 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-pine">這場約打已結束，可以評論隊友。</p>
        <button type="button" onClick={() => setOpen((value) => !value)} className="rounded-lg bg-pine px-3 py-2 text-xs font-bold text-white">
          評論
        </button>
      </div>
      {status ? <p className="mt-2 text-xs font-bold text-clay">{status}</p> : null}
      {open ? (
        <form onSubmit={(event) => void sendReview(event)} className="mt-4 space-y-3">
          <select value={stars} onChange={(event) => setStars(Number(event.target.value))} className="w-full rounded-lg border border-parchment bg-white px-3 py-2 text-sm">
            {[5, 4, 3, 2, 1].map((value) => (
              <option key={value} value={value}>{value} 星</option>
            ))}
          </select>
          <textarea value={comment} onChange={(event) => setComment(event.target.value.slice(0, 300))} rows={3} placeholder="可選評論" className="w-full resize-none rounded-lg border border-parchment bg-white px-3 py-2 text-sm" />
          <button type="submit" className="w-full rounded-lg bg-clay px-3 py-2 text-sm font-bold text-white">送出評論</button>
        </form>
      ) : null}
    </div>
  );
}
