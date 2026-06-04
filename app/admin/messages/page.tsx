"use client";

import { useEffect, useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import type { Conversation } from "@/context/AppContext";
import {
  deleteConversationById,
  subscribeToAllConversations,
} from "@/lib/messageService";
import { toUiConversation } from "@/lib/mappers";

export default function AdminMessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    return subscribeToAllConversations((items) => {
      setConversations(items.map((item) => toUiConversation(item.convId, item, [])));
    });
  }, []);

  function deleteConversation(conversationId: string) {
    void deleteConversationById(conversationId);
    setConversations((prev) => prev.filter((conversation) => conversation.id !== conversationId));
  }

  return (
    <AdminGuard>
      <section className="mx-auto max-w-md px-6 py-10">
        <div className="rounded-[2rem] bg-pine p-6 text-white shadow-lg">
          <p className="text-sm font-semibold text-gold">Admin</p>
          <h1 className="mt-2 text-3xl font-bold">訊息管理</h1>
          <p className="mt-4 leading-7 text-parchment">
            查看所有聊天室，必要時可刪除違規訊息或整個對話。
          </p>
        </div>

        <div className="mt-6 space-y-4">
          {conversations.map((conversation) => (
            <article
              key={conversation.id}
              className="rounded-[1.5rem] bg-white p-5 ring-1 ring-parchment"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-clay">{conversation.type}</p>
                  <h2 className="mt-1 font-bold text-pine">{conversation.name}</h2>
                  <p className="mt-1 text-xs text-muted">
                    參與者：{conversation.participants.join(", ")}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    最後更新：{conversation.lastMessageTime ? new Date(conversation.lastMessageTime).toLocaleString("zh-TW") : "尚無訊息"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`確定刪除「${conversation.name}」聊天室？`)) {
                      deleteConversation(conversation.id);
                    }
                  }}
                  className="rounded-full bg-ivory px-3 py-1 text-xs font-bold text-clay"
                >
                  刪除對話
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </AdminGuard>
  );
}
