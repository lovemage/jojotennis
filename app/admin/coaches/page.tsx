"use client";

import { useEffect, useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import { useApp } from "@/context/AppContext";
import {
  subscribeToCoachesAdmin,
  setCoachVerified,
  type AdminCoach,
} from "@/lib/coachService";
import {
  subscribePendingCoaches,
  approvePendingCoach,
  rejectPendingCoach,
  type PendingCoachRecord,
} from "@/lib/pendingCoachService";

type Tab = "pending" | "coaches" | "students";

export default function AdminCoachesPage() {
  const { user, studentNeeds, updateStudentNeedStatus } = useApp();
  const [coaches, setCoaches] = useState<AdminCoach[]>([]);
  const [pending, setPending] = useState<PendingCoachRecord[]>([]);
  const [tab, setTab] = useState<Tab>("pending");
  const [busyId, setBusyId] = useState("");

  useEffect(() => subscribeToCoachesAdmin(setCoaches), []);
  useEffect(() => subscribePendingCoaches(setPending), []);

  async function toggleVerified(coach: AdminCoach) {
    setBusyId(coach.id);
    try {
      await setCoachVerified(coach.id, !coach.isVerified);
    } finally {
      setBusyId("");
    }
  }

  async function approve(record: PendingCoachRecord) {
    if (!user) return;
    if (!confirm(`確認通過「${record.realName}」的教練申請？將自動建立公開教練資料並刪除身分證影像。`)) {
      return;
    }
    setBusyId(record.uid);
    try {
      await approvePendingCoach(record, user.email);
    } catch (err) {
      alert(err instanceof Error ? err.message : "通過失敗");
    } finally {
      setBusyId("");
    }
  }

  async function reject(record: PendingCoachRecord) {
    if (!user) return;
    const reason = prompt("退回原因（會顯示給申請人）", "資料不齊全，請補件後重新送出。");
    if (!reason) return;
    setBusyId(record.uid);
    try {
      await rejectPendingCoach(record, user.email, reason);
    } catch (err) {
      alert(err instanceof Error ? err.message : "退回失敗");
    } finally {
      setBusyId("");
    }
  }

  const pendingCount = pending.filter((p) => p.status === "pending").length;

  return (
    <AdminGuard>
      <section className="mx-auto max-w-md px-6 py-10">
        <div className="rounded-[2rem] bg-pine p-6 text-white shadow-lg">
          <p className="text-sm font-semibold text-gold">Admin</p>
          <h1 className="mt-2 text-3xl font-bold">教練管理</h1>
          <p className="mt-4 leading-7 text-parchment">
            審核教練申請、調整公開教練資料、管理學員需求。
          </p>
        </div>

        <div className="mt-6 flex gap-2">
          {(["pending", "coaches", "students"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`flex-1 rounded-full px-3 py-2 text-xs font-bold ${
                tab === key
                  ? "bg-pine text-white"
                  : "bg-white text-pine ring-1 ring-parchment"
              }`}
            >
              {key === "pending"
                ? `待審 (${pendingCount})`
                : key === "coaches"
                  ? "已刊登"
                  : "學員需求"}
            </button>
          ))}
        </div>

        {tab === "pending" ? (
          <div className="mt-6 space-y-4">
            {pending.length === 0 ? (
              <p className="text-sm text-muted">目前沒有教練申請。</p>
            ) : (
              pending.map((record) => (
                <PendingCard
                  key={record.uid}
                  record={record}
                  busy={busyId === record.uid}
                  onApprove={() => void approve(record)}
                  onReject={() => void reject(record)}
                />
              ))
            )}
          </div>
        ) : tab === "coaches" ? (
          <div className="mt-6 space-y-4">
            {coaches.length === 0 ? (
              <p className="text-sm text-muted">尚無教練資料，可至後台首頁匯入種子資料。</p>
            ) : (
              coaches.map((coach) => (
                <article
                  key={coach.id}
                  className="rounded-[1.5rem] bg-white p-5 ring-1 ring-parchment"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-clay">{coach.city}</p>
                      <h2 className="mt-1 font-bold text-pine">{coach.name}</h2>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-[11px] font-bold ${
                        coach.isVerified
                          ? "bg-green-100 text-green-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {coach.isVerified ? "已驗證" : "未驗證"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted">
                    {coach.levelRange} · NT${coach.price}/hr · ⭐ {coach.rating}
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">
                    {coach.bio}
                  </p>
                  <button
                    type="button"
                    disabled={busyId === coach.id}
                    onClick={() => void toggleVerified(coach)}
                    className="mt-4 rounded-full bg-clay px-5 py-2 text-xs font-bold text-white disabled:opacity-50"
                  >
                    {coach.isVerified ? "取消驗證" : "標記為已驗證"}
                  </button>
                </article>
              ))
            )}
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {studentNeeds.map((need) => (
              <article
                key={need.id}
                className="rounded-[1.5rem] bg-white p-5 ring-1 ring-parchment"
              >
                <p className="text-xs font-semibold text-clay">
                  {need.city} {need.district} ·{" "}
                  {need.status === "active" ? "開放中" : "已關閉"}
                </p>
                <h2 className="mt-1 font-bold text-pine">{need.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {need.targetLevel} · {need.preferredTime} · {need.budget}
                </p>
                <p className="mt-2 text-xs text-muted">發布者：{need.ownerNickname}</p>
                <button
                  type="button"
                  onClick={() =>
                    updateStudentNeedStatus(
                      need.id,
                      need.status === "active" ? "closed" : "active",
                    )
                  }
                  className="mt-4 rounded-full bg-clay px-5 py-2 text-xs font-bold text-white"
                >
                  {need.status === "active" ? "下架需求" : "重新開放"}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </AdminGuard>
  );
}

function PendingCard({
  record,
  busy,
  onApprove,
  onReject,
}: {
  record: PendingCoachRecord;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const submittedTs = record.submittedAt
    ? new Date(record.submittedAt).toLocaleString("zh-TW")
    : "—";

  const statusBadge =
    record.status === "pending"
      ? { tone: "bg-amber-100 text-amber-900", text: "待審" }
      : record.status === "approved"
        ? { tone: "bg-green-100 text-green-900", text: "已通過" }
        : { tone: "bg-red-100 text-red-900", text: "已退回" };

  return (
    <article className="rounded-[1.5rem] bg-white p-5 ring-1 ring-parchment">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-clay">{record.city}</p>
          <h2 className="mt-1 font-bold text-pine">
            {record.nickname}{" "}
            <span className="text-xs font-normal text-muted">（{record.realName}）</span>
          </h2>
        </div>
        <span
          className={`rounded-full px-2 py-1 text-[11px] font-bold ${statusBadge.tone}`}
        >
          {statusBadge.text}
        </span>
      </div>

      <dl className="mt-3 space-y-1 text-xs leading-6 text-ink">
        <Row label="Email" value={record.email} />
        <Row label="手機" value={record.phone} />
        <Row label="生日" value={record.birthday} />
        <Row label="可教等級" value={record.ntrpRange} />
        <Row label="費用" value={`NT$${record.pricePerHour}/hr`} />
        <Row label="申請時間" value={submittedTs} />
      </dl>

      <p className="mt-3 rounded-2xl bg-ivory p-3 text-xs leading-6 text-muted">
        {record.bio || "（無自我介紹）"}
      </p>

      {record.status === "pending" ? (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <IdImageView label="身分證正面" url={record.idFrontUrl} />
          <IdImageView label="身分證反面" url={record.idBackUrl} />
        </div>
      ) : (
        <p className="mt-4 text-xs text-muted">
          {record.status === "approved"
            ? `已建立公開教練資料（coachId: ${record.linkedCoachId ?? "?"}），身分證影像已刪除。`
            : `已退回，身分證影像已刪除。原因：${record.rejectionReason ?? "—"}`}
        </p>
      )}

      {record.status === "pending" ? (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onReject}
            className="rounded-full border border-clay px-4 py-2 text-xs font-bold text-clay disabled:opacity-50"
          >
            退回
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onApprove}
            className="rounded-full bg-clay px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
          >
            {busy ? "處理中…" : "通過審核"}
          </button>
        </div>
      ) : null}
    </article>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-16 shrink-0 text-muted">{label}</dt>
      <dd className="flex-1 break-all">{value}</dd>
    </div>
  );
}

function IdImageView({ label, url }: { label: string; url?: string }) {
  if (!url) {
    return (
      <div className="flex h-28 flex-col items-center justify-center rounded-2xl border border-dashed border-parchment bg-ivory text-[11px] text-muted">
        {label}
        <span>（無）</span>
      </div>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="flex flex-col gap-1"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={label}
        className="h-28 w-full rounded-2xl object-cover ring-1 ring-parchment"
      />
      <span className="text-[11px] text-muted underline">{label}（點擊放大）</span>
    </a>
  );
}
