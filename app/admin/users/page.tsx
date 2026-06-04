"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import { useApp, type User } from "@/context/AppContext";
import {
  fetchUsersPage,
  updateUserAdminFields,
  adminResetNicknameChanges,
  adminSetUserActive,
  type AdminUserRow,
} from "@/lib/userService";
import { USE_SUPABASE } from "@/lib/config";

const PAGE_SIZE = 20;

export default function AdminUsersPage() {
  const { users: contextUsers, updateUserByAdmin } = useApp();
  const [pageUsers, setPageUsers] = useState<AdminUserRow[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [drafts, setDrafts] = useState<Record<string, Partial<User>>>({});

  const loadPage = useCallback(async (nextCursor?: string | null) => {
    if (!USE_SUPABASE) return;
    setLoading(true);
    try {
      const result = await fetchUsersPage(PAGE_SIZE, nextCursor ?? undefined);
      setPageUsers((prev) => (nextCursor ? [...prev, ...result.users] : result.users));
      setCursor(result.lastDoc);
      setHasMore(result.users.length === PAGE_SIZE);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (USE_SUPABASE) {
      void loadPage();
    }
  }, [loadPage]);

  const displayUsers = useMemo(() => {
    const source: Array<User | AdminUserRow> = USE_SUPABASE
      ? pageUsers
      : contextUsers.map((u) => ({
          ...u,
          role: u.role ?? "user",
          isActive: u.isActive !== false,
          createdAt: u.createdAt ?? Date.now(),
        }));

    const q = query.trim().toLowerCase();
    if (!q) return source;
    return source.filter(
      (u) => u.nickname.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    );
  }, [pageUsers, contextUsers, query]);

  function draftFor(member: User | AdminUserRow) {
    return { ...member, ...drafts[member.uid] };
  }

  function updateDraft(uid: string, data: Partial<User>) {
    setDrafts((prev) => ({ ...prev, [uid]: { ...prev[uid], ...data } }));
  }

  async function saveMember(member: User | AdminUserRow) {
    const draft = draftFor(member);
    if (USE_SUPABASE) {
      await updateUserAdminFields(member.uid, {
        nickname: draft.nickname,
        ntrp: draft.ntrp,
        region: draft.region,
        yearsPlaying: draft.yearsPlaying,
        role: draft.role ?? "user",
        isActive: draft.isActive !== false,
      });
      setPageUsers((prev) =>
        prev.map((u) => (u.uid === member.uid ? { ...u, ...draft } as AdminUserRow : u)),
      );
    } else {
      updateUserByAdmin(member.uid, draft);
    }
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[member.uid];
      return next;
    });
  }

  async function toggleActive(member: User | AdminUserRow) {
    const nextActive = draftFor(member).isActive === false;
    if (USE_SUPABASE) {
      await adminSetUserActive(member.uid, nextActive);
      setPageUsers((prev) =>
        prev.map((u) => (u.uid === member.uid ? { ...u, isActive: nextActive } : u)),
      );
    } else {
      updateUserByAdmin(member.uid, { isActive: nextActive });
    }
  }

  async function resetNicknameChanges(member: User | AdminUserRow) {
    await adminResetNicknameChanges(member.uid);
    if (USE_SUPABASE) {
      setPageUsers((prev) =>
        prev.map((u) => (u.uid === member.uid ? { ...u, nicknameChangesUsed: 0 } : u)),
      );
    } else {
      updateUserByAdmin(member.uid, { nicknameChangesUsed: 0 });
    }
  }

  return (
    <AdminGuard>
      <section className="mx-auto max-w-md px-6 py-10">
        <div className="rounded-[2rem] bg-pine p-6 text-white shadow-lg">
          <p className="text-sm font-semibold text-gold">Admin</p>
          <h1 className="mt-2 text-3xl font-bold">會員管理</h1>
          <p className="mt-4 leading-7 text-parchment">
            分頁瀏覽、搜尋暱稱/Email，可停權或調整角色。
          </p>
        </div>

        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜尋暱稱或 Email"
          className="mt-6 w-full rounded-2xl border border-parchment bg-white px-4 py-3 text-sm outline-none focus:border-clay"
        />

        <div className="mt-6 space-y-4">
          {displayUsers.map((member) => {
            const draft = draftFor(member);
            const joinedAt = member.createdAt
              ? new Date(member.createdAt).toLocaleDateString("zh-TW")
              : "—";

            return (
              <article key={member.uid} className="rounded-[1.5rem] bg-white p-5 ring-1 ring-parchment">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-muted">{member.email}</p>
                    <p className="mt-1 text-xs text-muted">加入 {joinedAt}</p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-[11px] font-bold ${
                      draft.isActive !== false
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {draft.isActive !== false ? "正常" : "停權"}
                  </span>
                </div>

                <input
                  value={draft.nickname}
                  onChange={(event) => updateDraft(member.uid, { nickname: event.target.value })}
                  className="mt-3 w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay"
                />

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <input
                    value={draft.ntrp}
                    onChange={(event) => updateDraft(member.uid, { ntrp: event.target.value })}
                    placeholder="NTRP"
                    className="rounded-2xl border border-parchment bg-ivory px-3 py-2 text-sm outline-none focus:border-clay"
                  />
                  <input
                    value={draft.region}
                    onChange={(event) => updateDraft(member.uid, { region: event.target.value })}
                    placeholder="地區"
                    className="rounded-2xl border border-parchment bg-ivory px-3 py-2 text-sm outline-none focus:border-clay"
                  />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <select
                    value={draft.role ?? "user"}
                    onChange={(event) =>
                      updateDraft(member.uid, {
                        role: event.target.value as User["role"],
                      })
                    }
                    className="rounded-2xl border border-parchment bg-ivory px-3 py-2 text-sm outline-none focus:border-clay"
                  >
                    <option value="user">一般會員</option>
                    <option value="coach">教練</option>
                    <option value="admin">管理員</option>
                  </select>
                  <input
                    type="number"
                    min="0"
                    value={draft.yearsPlaying ?? 0}
                    onChange={(event) =>
                      updateDraft(member.uid, {
                        yearsPlaying: Number(event.target.value) || 0,
                      })
                    }
                    placeholder="球齡"
                    className="rounded-2xl border border-parchment bg-ivory px-3 py-2 text-sm outline-none focus:border-clay"
                  />
                </div>

                <p className="mt-3 text-xs text-muted">
                  暱稱已更改 {("nicknameChangesUsed" in member ? member.nicknameChangesUsed : 0) ?? 0} / 3 次
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void saveMember(member)}
                    className="rounded-full bg-clay px-4 py-2 text-xs font-bold text-white"
                  >
                    儲存
                  </button>
                  <button
                    type="button"
                    onClick={() => void toggleActive(member)}
                    className={`rounded-full border px-4 py-2 text-xs font-bold ${
                      draft.isActive !== false
                        ? "border-red-600 text-red-600"
                        : "border-green-600 text-green-700"
                    }`}
                  >
                    {draft.isActive !== false ? "停用" : "啟用"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void resetNicknameChanges(member)}
                    className="rounded-full border border-pine px-4 py-2 text-xs font-bold text-pine"
                  >
                    重置暱稱次數
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        {USE_SUPABASE && hasMore ? (
          <button
            type="button"
            disabled={loading}
            onClick={() => void loadPage(cursor)}
            className="mt-6 w-full rounded-full border border-pine px-5 py-3 text-sm font-bold text-pine disabled:opacity-50"
          >
            {loading ? "載入中…" : "載入更多"}
          </button>
        ) : null}
      </section>
    </AdminGuard>
  );
}
