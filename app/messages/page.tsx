"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";

type ConversationTab = "all" | "match" | "club";

const tabs: Array<{ id: ConversationTab; label: string }> = [
  { id: "all", label: "全部" },
  { id: "match", label: "揪球" },
  { id: "club", label: "社團" },
];

function formatTime(value?: number) {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleTimeString("zh-TW", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function MessagesPageContent() {
  const searchParams = useSearchParams();
  const {
    user,
    conversations,
    matches,
    sendChatMessage,
    markConversationRead,
    undoApplicantDecision,
  } = useApp();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<ConversationTab>("all");
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState("");
  const [undoTarget, setUndoTarget] = useState<{
    matchId: string;
    applicantUid: string;
  } | null>(null);

  const filteredConversations = useMemo(
    () =>
      conversations.filter((conversation) => {
        const matchesTab = tab === "all" || conversation.type === tab;
        const matchesQuery =
          query.trim().length === 0 ||
          conversation.name.toLowerCase().includes(query.trim().toLowerCase()) ||
          (conversation.lastMessage ?? "")
            .toLowerCase()
            .includes(query.trim().toLowerCase());

        return matchesTab && matchesQuery;
      }),
    [conversations, query, tab],
  );
  const selectedConversation =
    conversations.find((conversation) => conversation.id === selectedId) ??
    filteredConversations[0];
  const selectedMatch = matches.find(
    (match) => match.id === selectedConversation?.relatedId,
  );

  useEffect(() => {
    const conversationId = searchParams.get("conversation");
    if (conversationId) {
      setSelectedId(conversationId);
    }
  }, [searchParams]);

  useEffect(() => {
    if (selectedConversation) {
      markConversationRead(selectedConversation.id);
    }
  }, [markConversationRead, selectedConversation]);

  function submitMessage(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!selectedConversation || !draft.trim()) {
      return;
    }

    sendChatMessage(selectedConversation.id, draft);
    setDraft("");
  }

  if (!user) {
    return (
      <section className="mx-auto max-w-md px-6 py-10">
        <div className="rounded-[2rem] bg-white p-6 text-center shadow-sm ring-1 ring-parchment">
          <h1 className="text-2xl font-bold text-pine">請先登入查看訊息</h1>
          <Link
            href="/auth"
            className="mt-5 inline-flex rounded-full bg-clay px-5 py-3 text-sm font-bold text-white"
          >
            前往登入
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-5xl px-4 py-6 pb-28 md:grid md:grid-cols-[320px_1fr] md:gap-4">
      <aside className="rounded-[1.5rem] bg-white p-4 shadow-sm ring-1 ring-parchment">
        <h1 className="text-2xl font-bold text-pine">訊息</h1>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜尋對話..."
          className="mt-4 w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay"
        />
        <div className="mt-3 flex gap-2">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`rounded-full px-4 py-2 text-sm font-bold ${
                tab === item.id ? "bg-pine text-white" : "bg-parchment text-pine"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-2">
          {filteredConversations.length > 0 ? (
            filteredConversations.map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                onClick={() => setSelectedId(conversation.id)}
                className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left ${
                  selectedConversation?.id === conversation.id
                    ? "bg-parchment"
                    : "bg-ivory"
                }`}
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pine text-sm font-bold text-white">
                  {conversation.type === "club" ? "👥" : conversation.name.slice(0, 1)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-pine">
                    {conversation.name}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {conversation.lastMessage || "尚無訊息"}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-[11px] text-muted">
                    {formatTime(conversation.lastMessageTime)}
                  </span>
                  {conversation.unreadCount > 0 ? (
                    <span className="mt-1 inline-flex min-w-5 justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white">
                      {conversation.unreadCount}
                    </span>
                  ) : null}
                </span>
              </button>
            ))
          ) : (
            <p className="rounded-2xl bg-ivory p-4 text-sm text-muted">
              目前沒有對話
            </p>
          )}
        </div>
      </aside>

      <main className="mt-4 flex min-h-[70vh] flex-col rounded-[1.5rem] bg-ivory shadow-sm ring-1 ring-parchment md:mt-0">
        {selectedConversation ? (
          <>
            <header className="border-b border-parchment bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-pine">
                    {selectedConversation.name}
                  </h2>
                  <p className="mt-1 text-xs text-muted">
                    {selectedConversation.type === "match"
                      ? selectedConversation.status === "confirmed"
                        ? "揪球已確認"
                        : "等待主揪回覆"
                      : selectedConversation.type === "club"
                        ? "社團聊天室"
                        : "私人對話"}
                  </p>
                </div>
                {selectedConversation.type === "club" &&
                selectedConversation.ownerUid === user.uid ? (
                  <span className="rounded-full bg-gold/25 px-3 py-1 text-xs font-bold text-pine">
                    社長
                  </span>
                ) : null}
              </div>
            </header>

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {selectedConversation.messages.map((message) => {
                const isMine = message.senderUid === user.uid;
                const isSystem = message.type === "system";

                return (
                  <div
                    key={message.id}
                    className={
                      isSystem
                        ? "text-center"
                        : isMine
                          ? "flex justify-end"
                          : "flex justify-start"
                    }
                  >
                    <div
                      onDoubleClick={() => {
                        if (
                          selectedMatch &&
                          message.type === "system" &&
                          message.content.includes("主揪已")
                        ) {
                          const applicant = selectedMatch.applicants.find((item) =>
                            message.content.includes(item.nickname),
                          );
                          if (applicant) {
                            setUndoTarget({
                              matchId: selectedMatch.id,
                              applicantUid: applicant.uid,
                            });
                          }
                        }
                      }}
                      className={
                        isSystem
                          ? "inline-block rounded-2xl bg-parchment px-4 py-2 text-xs leading-5 text-muted"
                          : isMine
                            ? "max-w-[78%] rounded-2xl bg-clay px-4 py-3 text-sm leading-6 text-white"
                            : "max-w-[78%] rounded-2xl bg-white px-4 py-3 text-sm leading-6 text-ink shadow-sm"
                      }
                    >
                      {!isMine && !isSystem ? (
                        <p className="mb-1 flex items-center gap-2 text-xs font-bold text-pine">
                          {message.senderNickname}
                          {selectedConversation.type === "club" &&
                          message.senderUid === selectedConversation.ownerUid ? (
                            <span className="rounded-full bg-gold/25 px-2 py-0.5 text-[10px] text-pine">
                              社長
                            </span>
                          ) : null}
                        </p>
                      ) : null}
                      {message.content}
                      <p className="mt-1 text-[10px] opacity-70">
                        {formatTime(message.timestamp)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <form onSubmit={submitMessage} className="flex gap-2 border-t border-parchment bg-white p-3">
              {selectedConversation.type === "club" &&
              selectedConversation.ownerUid === user.uid ? (
                <button
                  type="button"
                  onClick={() => {
                    if (draft.trim()) {
                      sendChatMessage(selectedConversation.id, `公告：${draft.trim()}`);
                      setDraft("");
                    }
                  }}
                  className="shrink-0 rounded-full bg-gold/25 px-3 text-xs font-bold text-pine"
                >
                  公告
                </button>
              ) : null}
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="輸入訊息..."
                className="min-w-0 flex-1 rounded-full border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay"
              />
              <button
                type="submit"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-clay text-lg font-bold text-white"
              >
                ➤
              </button>
            </form>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted">
            選擇一個對話開始聊天
          </div>
        )}
      </main>

      {undoTarget ? (
        <div className="fixed inset-0 z-50 flex items-center bg-ink/50 p-4">
          <div className="mx-auto w-full max-w-sm rounded-[1.5rem] bg-white p-5 shadow-lg">
            <h2 className="text-xl font-bold text-pine">確定要撤回此決定嗎？</h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              撤回後，該申請會回到待處理狀態，重新顯示接受/婉拒按鈕。
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setUndoTarget(null)}
                className="rounded-full border border-pine px-4 py-3 text-sm font-bold text-pine"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  undoApplicantDecision(undoTarget.matchId, undoTarget.applicantUid);
                  setUndoTarget(null);
                }}
                className="rounded-full bg-clay px-4 py-3 text-sm font-bold text-white"
              >
                確認撤回
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <section className="mx-auto max-w-md px-6 py-10 text-sm text-muted">
          載入訊息中...
        </section>
      }
    >
      <MessagesPageContent />
    </Suspense>
  );
}
