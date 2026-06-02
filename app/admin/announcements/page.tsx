"use client";

import { useEffect, useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import {
  subscribeAnnouncements,
  saveAnnouncement,
  deleteAnnouncement,
  toggleAnnouncementActive,
  type Announcement,
} from "@/lib/announcementService";

type Draft = {
  id?: string;
  message: string;
  isActive: boolean;
  priority: number;
  startsAt: string;
  endsAt: string;
};

const emptyDraft: Draft = {
  message: "",
  isActive: true,
  priority: 0,
  startsAt: "",
  endsAt: "",
};

function toDraft(item: Announcement): Draft {
  const toLocalInput = (ms?: number) => {
    if (!ms) return "";
    const d = new Date(ms);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  return {
    id: item.id,
    message: item.message,
    isActive: item.isActive,
    priority: item.priority,
    startsAt: toLocalInput(item.startsAt),
    endsAt: toLocalInput(item.endsAt),
  };
}

function parseLocal(value: string): number | null | undefined {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

export default function AdminAnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const isEditing = Boolean(draft.id);

  useEffect(() => {
    const unsub = subscribeAnnouncements(setItems);
    return () => {
      unsub();
    };
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.message.trim()) {
      setStatus("請輸入公告內容");
      return;
    }
    setSaving(true);
    setStatus("");
    try {
      await saveAnnouncement({
        id: draft.id,
        message: draft.message.trim(),
        isActive: draft.isActive,
        priority: Number(draft.priority) || 0,
        startsAt: parseLocal(draft.startsAt),
        endsAt: parseLocal(draft.endsAt),
      });
      setDraft(emptyDraft);
      setStatus("公告已儲存");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "儲存失敗");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("確定刪除這則公告？")) return;
    await deleteAnnouncement(id);
    if (draft.id === id) setDraft(emptyDraft);
  }

  return (
    <AdminGuard>
      <section className="mx-auto max-w-md px-6 py-10">
        <div className="rounded-[2rem] bg-pine p-6 text-white shadow-lg">
          <p className="text-sm font-semibold text-gold">Admin</p>
          <h1 className="mt-2 text-3xl font-bold">公告跑馬燈</h1>
          <p className="mt-4 leading-7 text-parchment">
            管理首頁頂部跑馬燈。可設定起訖時間與優先順序，多則公告會以分隔點串接顯示。
          </p>
        </div>

        <form
          onSubmit={(event) => void submit(event)}
          className="mt-6 space-y-4 rounded-[1.5rem] bg-white p-5 ring-1 ring-parchment"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-black text-pine">
              {isEditing ? "編輯公告" : "新增公告"}
            </h2>
            {isEditing ? (
              <button
                type="button"
                onClick={() => setDraft(emptyDraft)}
                className="rounded-full bg-ivory px-4 py-2 text-xs font-bold text-pine"
              >
                新增
              </button>
            ) : null}
          </div>

          <textarea
            required
            rows={3}
            value={draft.message}
            onChange={(event) => setDraft((c) => ({ ...c, message: event.target.value }))}
            placeholder="公告內容"
            className="w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay"
          />

          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-xs font-bold text-pine">
              優先順序（大者優先）
              <input
                type="number"
                value={draft.priority}
                onChange={(event) =>
                  setDraft((c) => ({ ...c, priority: Number(event.target.value) || 0 }))
                }
                className="rounded-2xl border border-parchment bg-ivory px-3 py-2 text-sm outline-none focus:border-clay"
              />
            </label>
            <label className="flex items-end justify-between rounded-2xl bg-ivory p-3 text-sm font-semibold text-pine">
              啟用
              <input
                type="checkbox"
                checked={draft.isActive}
                onChange={(event) => setDraft((c) => ({ ...c, isActive: event.target.checked }))}
                className="h-5 w-5 accent-clay"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-xs font-bold text-pine">
              開始時間（選填）
              <input
                type="datetime-local"
                value={draft.startsAt}
                onChange={(event) => setDraft((c) => ({ ...c, startsAt: event.target.value }))}
                className="rounded-2xl border border-parchment bg-ivory px-3 py-2 text-sm outline-none focus:border-clay"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-bold text-pine">
              結束時間（選填）
              <input
                type="datetime-local"
                value={draft.endsAt}
                onChange={(event) => setDraft((c) => ({ ...c, endsAt: event.target.value }))}
                className="rounded-2xl border border-parchment bg-ivory px-3 py-2 text-sm outline-none focus:border-clay"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-full bg-clay px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
          >
            {saving ? "儲存中..." : isEditing ? "更新公告" : "新增公告"}
          </button>
          {status ? <p className="text-sm font-bold text-clay">{status}</p> : null}
        </form>

        <div className="mt-8 space-y-3">
          {items.length === 0 ? (
            <p className="rounded-2xl bg-white p-5 text-sm text-muted ring-1 ring-parchment">
              還沒有公告。
            </p>
          ) : null}
          {items.map((item) => (
            <article
              key={item.id}
              className="rounded-[1.5rem] bg-white p-5 ring-1 ring-parchment"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-bold text-clay">
                  優先 {item.priority} · {item.isActive ? "啟用" : "停用"}
                </p>
                <button
                  type="button"
                  onClick={() => void toggleAnnouncementActive(item.id, !item.isActive)}
                  className={`rounded-full border px-3 py-1 text-[11px] font-bold ${
                    item.isActive
                      ? "border-red-600 text-red-600"
                      : "border-green-600 text-green-700"
                  }`}
                >
                  {item.isActive ? "停用" : "啟用"}
                </button>
              </div>
              <p className="mt-2 text-sm leading-6 text-pine">{item.message}</p>
              <p className="mt-2 text-xs text-muted">
                {item.startsAt
                  ? new Date(item.startsAt).toLocaleString("zh-TW")
                  : "—"}{" "}
                ~{" "}
                {item.endsAt ? new Date(item.endsAt).toLocaleString("zh-TW") : "—"}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setDraft(toDraft(item))}
                  className="rounded-full bg-pine px-4 py-2 text-xs font-bold text-white"
                >
                  編輯
                </button>
                <button
                  type="button"
                  onClick={() => void remove(item.id)}
                  className="rounded-full bg-ivory px-4 py-2 text-xs font-bold text-clay"
                >
                  刪除
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </AdminGuard>
  );
}
