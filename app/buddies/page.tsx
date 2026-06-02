"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useApp } from "@/context/AppContext";
import PageHero from "@/components/PageHero";
import UserStatsBadge from "@/components/UserStatsBadge";

export default function BuddiesPage() {
  const router = useRouter();
  const { user, users, getOrCreateConversation } = useApp();

  const activeBuddies = useMemo(
    () =>
      users
        .filter((member) => member.isActive !== false)
        .filter((member) => !user || member.uid !== user.uid)
        .sort((a, b) => (a.nickname ?? "").localeCompare(b.nickname ?? "")),
    [users, user],
  );

  function startChat(targetUid: string, targetNickname: string) {
    if (!user) {
      router.push("/auth");
      return;
    }
    const convId = getOrCreateConversation(targetUid, targetNickname);
    if (convId) router.push(`/messages?conversation=${convId}`);
  }

  return (
    <section className="mx-auto max-w-md overflow-hidden pb-8">
      <PageHero
        eyebrow="Buddies"
        title="球友列表"
        description="找線上活躍的球友、發私訊揪球"
      />

      <div className="space-y-3 px-5 pt-6">
        {activeBuddies.length === 0 ? (
          <p className="rounded-2xl bg-white p-5 text-sm text-muted ring-1 ring-parchment">
            目前還沒有可顯示的球友。
          </p>
        ) : null}

        {activeBuddies.map((member) => (
          <article
            key={member.uid}
            className="flex items-center gap-3 rounded-[1.5rem] bg-white p-4 ring-1 ring-parchment"
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-pine text-base font-black text-white">
              {member.avatarUrl ? (
                <img
                  src={member.avatarUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                member.avatarInitial
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black text-pine">{member.nickname}</p>
              <p className="mt-0.5 text-xs text-muted">
                NTRP {member.ntrp || "—"} · {member.region || "—"}
              </p>
              <div className="mt-1">
                <UserStatsBadge uid={member.uid} />
              </div>
            </div>
            <button
              type="button"
              onClick={() => startChat(member.uid, member.nickname)}
              className="shrink-0 rounded-full bg-clay px-4 py-2 text-xs font-bold text-white"
            >
              私訊
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
