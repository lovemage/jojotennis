"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import type { Conversation } from "@/context/AppContext";
import { sendMessage as sendFirestoreMessage } from "@/lib/messageService";
import UserStatsBadge from "@/components/UserStatsBadge";

type ConversationTab = "all" | "match" | "direct";

const tabs: Array<{ id: ConversationTab; label: string }> = [
  { id: "all", label: "全部" },
  { id: "match", label: "揪球" },
  { id: "direct", label: "私訊" },
];

function formatTime(value?: number) {
  if (!value) return "";
  return new Date(value).toLocaleTimeString("zh-TW", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function MessagesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    user,
    conversations,
    matches,
    respondToApplicant,
    subscribeConversationMessages,
    markConversationRead,
    undoApplicantDecision,
  } = useApp();
  const [isMobile, setIsMobile] = useState(false);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<ConversationTab>("all");
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState("");
  const [undoTarget, setUndoTarget] = useState<{
    matchId: string;
    applicantUid: string;
  } | null>(null);
  const returnTo = searchParams.get("from");

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const filteredConversations = useMemo(
    () =>
      conversations.filter((conversation) => {
        const matchesTab = tab === "all" || conversation.type === tab;
        const matchesQuery =
          query.trim().length === 0 ||
          conversation.name.toLowerCase().includes(query.trim().toLowerCase()) ||
          (conversation.lastMessage ?? "").toLowerCase().includes(query.trim().toLowerCase());
        return matchesTab && matchesQuery;
      }),
    [conversations, query, tab],
  );

  const selectedConversation: Conversation | undefined = useMemo(() => {
    if (selectedId) {
      const existing = conversations.find((c) => c.id === selectedId);
      if (existing) return existing;
      if (selectedId.startsWith("match_")) {
        const matchId = selectedId.replace(/^match_/, "");
        const match = matches.find((item) => item.id === matchId);
        if (match) {
          return {
            id: selectedId,
            type: "match",
            participants: [match.ownerUid, ...match.applicants.filter((app) => app.status === "accepted").map((app) => app.uid)],
            name: `揪球：${match.title}`,
            relatedId: match.id,
            messages: [],
            unreadCount: 0,
            ownerUid: match.ownerUid,
          };
        }
      }
      return undefined;
    }
    if (!isMobile && filteredConversations.length > 0) {
      return filteredConversations[0];
    }
    return undefined;
  }, [selectedId, conversations, matches, isMobile, filteredConversations]);

  const selectedMatch = matches.find((match) => match.id === selectedConversation?.relatedId);
  const selectedApplicant = selectedMatch?.applicants.find((applicant) => applicant.uid === user?.uid);
  const isMatchHost = selectedConversation?.type === "match" && selectedMatch?.ownerUid === user?.uid;
  const pendingApplicants = selectedMatch?.applicants.filter((applicant) => applicant.status === "pending") ?? [];
  const canSendSelectedConversation =
    !selectedConversation ||
    selectedConversation.type !== "match" ||
    isMatchHost ||
    selectedApplicant?.status === "accepted" ||
    selectedConversation.participants.includes(user?.uid ?? "");
  const sendDisabledReason =
    selectedConversation?.type === "match" && !canSendSelectedConversation
      ? selectedApplicant?.status === "pending"
        ? "主揪核准前，你可以查看聊天室，但暫時無法發送訊息。"
        : "加入球局後才能在此聊天室發送訊息。"
      : "";

  useEffect(() => {
    const conversationId = searchParams.get("conversation");
    if (conversationId) setSelectedId(conversationId);
  }, [searchParams]);

  useEffect(() => {
    if (!isMobile && !selectedId && filteredConversations[0]) {
      setSelectedId(filteredConversations[0].id);
    }
  }, [isMobile, selectedId, filteredConversations]);

  useEffect(() => {
    if (selectedConversation) {
      markConversationRead(selectedConversation.id);
    }
  }, [markConversationRead, selectedConversation]);

  useEffect(() => {
    const id = selectedConversation?.id;
    if (!id) return;
    const unsubscribe = subscribeConversationMessages(id);
    return unsubscribe;
  }, [selectedConversation?.id, subscribeConversationMessages]);

  async function submitMessage(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!selectedConversation || !draft.trim() || !user) return;
    if (!canSendSelectedConversation) {
      alert(sendDisabledReason || "目前無法在此聊天室發送訊息");
      return;
    }
    const trimmed = draft.trim();
    try {
      await sendFirestoreMessage(
        selectedConversation.id,
        user.uid,
        user.nickname,
        trimmed,
      );
      setDraft("");
    } catch (err) {
      console.error("送出失敗：", err);
      alert("訊息送出失敗，請稍後再試");
    }
  }

  const showList = !isMobile || !selectedId;
  const showChat = !isMobile || Boolean(selectedId);

  if (!user) {
    return (
      <section className="mx-auto max-w-md px-6 py-10">
        <div className="rounded-[2rem] bg-white p-6 text-center shadow-sm ring-1 ring-parchment">
          <h1 className="text-2xl font-bold text-pine">請先登入查看訊息</h1>
          <Link
            href="/login"
            className="mt-5 inline-flex rounded-full bg-clay px-5 py-3 text-sm font-bold text-white"
          >
            前往登入
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-5xl px-0 md:px-4 md:py-4">
      <div
        className="flex overflow-hidden bg-white ring-1 ring-parchment md:rounded-[1.5rem]"
        style={{
          height: "calc(100dvh - 68px - 96px - env(safe-area-inset-bottom))",
        }}
      >
        {/* 左欄：對話列表 */}
        <div
          className={`${showList ? "flex" : "hidden"} w-full shrink-0 flex-col border-parchment md:flex md:w-80 md:border-r`}
        >
          <div className="border-b border-parchment p-4">
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
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {filteredConversations.length > 0 ? (
              filteredConversations.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => setSelectedId(conversation.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left ${
                    selectedConversation?.id === conversation.id ? "bg-parchment" : "bg-ivory"
                  }`}
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pine text-sm font-bold text-white">
                    {conversation.type === "match" ? "🎾" : conversation.name.slice(0, 1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-pine">{conversation.name}</span>
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
              <p className="rounded-2xl bg-ivory p-4 text-sm text-muted">目前沒有對話</p>
            )}
          </div>
        </div>

        {/* 右欄：聊天室 */}
        <div className={`${showChat ? "flex" : "hidden"} min-w-0 flex-1 flex-col bg-ivory md:flex`}>
          {selectedConversation ? (
            <>
              <header className="flex items-center gap-3 border-b border-parchment bg-white px-4 py-3">
                {isMobile && selectedId ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (returnTo === "match") {
                        router.push("/match");
                        return;
                      }

                      setSelectedId("");
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "8px",
                      fontSize: "18px",
                      color: "#1E3D2F",
                    }}
                    aria-label={returnTo === "match" ? "返回揪球" : "返回對話列表"}
                  >
                    ← 返回
                  </button>
                ) : null}
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-lg font-bold text-pine">{selectedConversation.name}</h2>
                  <p className="mt-0.5 text-xs text-muted">
                    {selectedConversation.type === "match"
                      ? canSendSelectedConversation
                        ? "球局聊天室"
                        : "等待主揪核准"
                      : "私人對話"}
                  </p>
                  {selectedConversation.type === "match" &&
                  selectedMatch &&
                  selectedMatch.ownerUid === user.uid ? (
                    <div className="mt-2 space-y-2">
                      <div className="flex flex-wrap gap-1.5 text-[11px] font-bold text-muted">
                        {selectedMatch.applicants
                          .filter(
                            (applicant) =>
                              applicant.status === "accepted" || applicant.status === "pending",
                          )
                          .map((applicant) => (
                            <span
                              key={applicant.uid}
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${
                                applicant.status === "pending" ? "bg-amber-100 text-amber-900" : "bg-parchment"
                              }`}
                            >
                              <span>{applicant.nickname}</span>
                              <span>· {applicant.status === "pending" ? "待核准" : "已加入"}</span>
                              <span>· UID: {applicant.uid.slice(0, 6)}</span>
                              <UserStatsBadge uid={applicant.uid} />
                            </span>
                          ))}
                      </div>
                      {pendingApplicants.length > 0 ? (
                        <div className="space-y-2 rounded-2xl bg-amber-50 p-3 text-xs text-amber-950">
                          <p className="font-bold">待核准球友</p>
                          {pendingApplicants.map((applicant) => (
                            <div key={applicant.uid} className="flex items-center justify-between gap-2">
                              <span className="min-w-0 truncate font-bold">{applicant.nickname}</span>
                              <div className="flex shrink-0 gap-2">
                                <button
                                  type="button"
                                  onClick={() => respondToApplicant(selectedMatch.id, applicant.uid, true)}
                                  className="rounded-full bg-pine px-3 py-1 font-bold text-white"
                                >
                                  同意
                                </button>
                                <button
                                  type="button"
                                  onClick={() => respondToApplicant(selectedMatch.id, applicant.uid, false)}
                                  className="rounded-full border border-amber-300 px-3 py-1 font-bold text-amber-900"
                                >
                                  婉拒
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </header>

              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {sendDisabledReason ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold leading-6 text-amber-900">
                    {sendDisabledReason}
                  </div>
                ) : null}
                {selectedConversation.messages.map((message) => {
                  const isMine = message.senderUid === user.uid;
                  const isSystem = message.type === "system";

                  return (
                    <div
                      key={message.id}
                      className={
                        isSystem ? "text-center" : isMine ? "flex justify-end" : "flex justify-start"
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
                          </p>
                        ) : null}
                        {message.content}
                        <p className="mt-1 text-[10px] opacity-70">{formatTime(message.timestamp)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <form
                onSubmit={submitMessage}
                className="flex gap-2 border-t border-parchment bg-white p-3"
              >
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  disabled={!canSendSelectedConversation}
                  placeholder={canSendSelectedConversation ? "輸入訊息..." : "等待主揪核准後才能發送訊息"}
                  className="min-w-0 flex-1 rounded-full border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay"
                />
                <button
                  type="submit"
                  disabled={!canSendSelectedConversation}
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white ${
                    canSendSelectedConversation ? "bg-clay" : "bg-muted"
                  }`}
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
        </div>
      </div>

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
        <section className="mx-auto max-w-md px-6 py-10 text-sm text-muted">載入訊息中...</section>
      }
    >
      <MessagesPageContent />
    </Suspense>
  );
}
