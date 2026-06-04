"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import type { Conversation } from "@/context/AppContext";
import { sendMessage } from "@/lib/messageService";
import UserStatsBadge from "@/components/UserStatsBadge";

function formatTime(value?: number) {
  if (!value) return "";
  return new Date(value).toLocaleTimeString("zh-TW", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function conversationTitle(conversation: Pick<Conversation, "id" | "name" | "type">) {
  return conversation.name?.trim() || (conversation.type === "match" ? "揪球聊天室" : "未命名對話");
}

function shortUid(uid?: string) {
  return uid ? uid.slice(0, 6) : "未知";
}

function reportApproveError(error: unknown) {
  const message = error instanceof Error ? error.message : "操作失敗";
  alert(message.includes("Quota exceeded") ? "後端服務配額已用完，暫時無法更新核准狀態。" : message);
}

function MessagesPageContent() {
  const searchParams = useSearchParams();
  const {
    user,
    conversations,
    matches,
    respondToApplicant,
    subscribeConversationMessages,
    getConversationMessages,
    markConversationRead,
    undoApplicantDecision,
  } = useApp();
  const selectedId = searchParams.get("conversation")?.trim() ?? "";
  const [draft, setDraft] = useState("");
  const [undoTarget, setUndoTarget] = useState<{
    matchId: string;
    applicantUid: string;
  } | null>(null);

  const selectedConversation: Conversation | undefined = useMemo(() => {
    if (!selectedId) return undefined;

    const messages = getConversationMessages(selectedId);

    if (selectedId.startsWith("match_")) {
      const matchId = selectedId.replace(/^match_/, "");
      const match = matches.find((item) => item.id === matchId);
      if (match) {
        return {
          id: selectedId,
          type: "match",
          participants: [
            match.ownerUid,
            ...match.applicants.filter((app) => app.status === "accepted").map((app) => app.uid),
          ],
          name: `揪球：${match.title}`,
          relatedId: match.id,
          messages,
          unreadCount: 0,
          ownerUid: match.ownerUid,
        };
      }
    }

    const existing = conversations.find((conversation) => conversation.id === selectedId);
    return existing ? { ...existing, messages } : undefined;
  }, [selectedId, conversations, matches, getConversationMessages]);

  const selectedMatch = matches.find((match) => match.id === selectedConversation?.relatedId);
  const selectedApplicant = selectedMatch?.applicants.find((applicant) => applicant.uid === user?.uid);
  const isMatchHost = selectedConversation?.type === "match" && selectedMatch?.ownerUid === user?.uid;
  const pendingApplicants = selectedMatch?.applicants.filter((applicant) => applicant.status === "pending") ?? [];
  const canSendSelectedConversation =
    !selectedConversation ||
    selectedConversation.type !== "match" ||
    isMatchHost ||
    selectedApplicant?.status === "accepted";
  const sendDisabledReason =
    selectedConversation?.type === "match" && !canSendSelectedConversation
      ? selectedApplicant?.status === "pending"
        ? "主揪核准前，你可以查看聊天室，但暫時無法發送訊息。"
        : "加入球局後才能在此聊天室發送訊息。"
      : "";

  useEffect(() => {
    if (selectedConversation) {
      markConversationRead(selectedConversation.id);
    }
  }, [markConversationRead, selectedConversation]);

  useEffect(() => {
    if (!selectedId) return;
    const unsubscribe = subscribeConversationMessages(selectedId);
    return unsubscribe;
  }, [selectedId, subscribeConversationMessages]);

  async function submitMessage(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!selectedConversation || !draft.trim() || !user) return;
    if (!canSendSelectedConversation) {
      alert(sendDisabledReason || "目前無法在此聊天室發送訊息");
      return;
    }
    const trimmed = draft.trim();
    try {
      await sendMessage(
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
    <section className="mx-auto max-w-3xl px-0 md:px-4 md:py-4">
      <div
        className="flex overflow-hidden bg-white ring-1 ring-parchment md:rounded-[1.5rem]"
        style={{
          height: "calc(100dvh - 68px - 96px - env(safe-area-inset-bottom))",
        }}
      >
        <div className="flex min-w-0 flex-1 flex-col bg-ivory">
          {selectedConversation ? (
            <>
              <header className="flex items-center gap-3 border-b border-parchment bg-white px-4 py-3">
                <Link
                  href="/match"
                  className="shrink-0 rounded-full px-3 py-2 text-sm font-bold text-pine hover:bg-ivory"
                  aria-label="返回揪球列表"
                >
                  ← 返回
                </Link>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-lg font-bold text-pine">{conversationTitle(selectedConversation)}</h2>
                  <p className="mt-0.5 text-xs text-muted">
                    {selectedConversation.type === "match"
                      ? canSendSelectedConversation
                        ? "球局聊天室"
                        : "等待主揪核准"
                      : "私人對話"}
                  </p>
                  {isMatchHost && selectedMatch ? (
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
                              <span>· UID: {shortUid(applicant.uid)}</span>
                              {applicant.uid ? <UserStatsBadge uid={applicant.uid} /> : null}
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
                                  onClick={() => {
                                    void Promise.resolve(respondToApplicant(selectedMatch.id, applicant.uid, true)).catch(reportApproveError);
                                  }}
                                  className="rounded-full bg-pine px-3 py-1 font-bold text-white"
                                >
                                  同意
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    void Promise.resolve(respondToApplicant(selectedMatch.id, applicant.uid, false)).catch(reportApproveError);
                                  }}
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
                {selectedConversation.messages.length > 0 ? (
                  selectedConversation.messages.map((message) => {
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
                  })
                ) : (
                  <div className="flex h-full items-center justify-center text-center text-sm text-muted">
                    尚無訊息
                  </div>
                )}
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
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center text-sm text-muted">
              <p>{selectedId ? "找不到可開啟的聊天室" : "請從揪球列表進入聊天室"}</p>
              <Link
                href="/match"
                className="inline-flex rounded-full bg-clay px-5 py-3 text-sm font-bold text-white"
              >
                前往揪球列表
              </Link>
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
