"use client";

import { useEffect, useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import { useApp } from "@/context/AppContext";
import { subscribeToClubs, softDeleteClub } from "@/lib/clubService";
import type { Club as SchemaClub } from "@/lib/schema";

export default function AdminClubsPage() {
  const { conversations, deleteConversation } = useApp();
  const [clubs, setClubs] = useState<SchemaClub[]>([]);
  const clubConversations = conversations.filter((c) => c.type === "club");

  useEffect(() => subscribeToClubs(setClubs), []);

  return (
    <AdminGuard>
      <section className="mx-auto max-w-md px-6 py-10">
        <div className="rounded-[2rem] bg-pine p-6 text-white shadow-lg">
          <p className="text-sm font-semibold text-gold">Admin</p>
          <h1 className="mt-2 text-3xl font-bold">社團管理</h1>
          <p className="mt-4 leading-7 text-parchment">Firestore 即時社團列表，可軟刪除違規社團。</p>
        </div>

        <h2 className="mt-6 text-lg font-bold text-pine">社團列表（{clubs.length}）</h2>
        <div className="mt-3 space-y-3">
          {clubs.map((club) => (
            <article key={club.clubId} className="rounded-[1.5rem] bg-white p-5 ring-1 ring-parchment">
              <p className="text-xs font-semibold text-clay">
                {club.city} · {club.memberCount ?? 0} 人
              </p>
              <h3 className="mt-1 font-bold text-pine">{club.name}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{club.description}</p>
              <p className="mt-1 text-xs text-muted">主辦：{club.ownerNickname}</p>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`確定刪除社團「${club.name}」？`)) {
                    void softDeleteClub(club.clubId);
                  }
                }}
                className="mt-4 rounded-full bg-ivory px-4 py-2 text-xs font-bold text-clay"
              >
                軟刪除社團
              </button>
            </article>
          ))}
        </div>

        <h2 className="mt-8 text-lg font-bold text-pine">社團聊天室</h2>
        <div className="mt-3 space-y-3">
          {clubConversations.map((conversation) => (
            <article key={conversation.id} className="rounded-[1.5rem] bg-white p-5 ring-1 ring-parchment">
              <p className="text-xs font-semibold text-clay">{conversation.participants.length} 位成員</p>
              <h3 className="mt-1 font-bold text-pine">{conversation.name}</h3>
              <p className="mt-2 text-sm text-muted">{conversation.lastMessage ?? "尚無訊息"}</p>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`確定刪除「${conversation.name}」聊天室？`)) {
                    deleteConversation(conversation.id);
                  }
                }}
                className="mt-4 rounded-full bg-ivory px-4 py-2 text-xs font-bold text-clay"
              >
                刪除聊天室
              </button>
            </article>
          ))}
        </div>
      </section>
    </AdminGuard>
  );
}
