"use client";

import { useEffect, useMemo, useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import LegalPageView from "@/components/LegalPageView";
import {
  fetchLegalPage,
  saveLegalPage,
  type LegalPageContent,
  type LegalPageSlug,
  type LegalSection,
} from "@/lib/legalPagesService";
import { getDefaultLegalPage } from "@/lib/legalPageDefaults";

const TABS: Array<{ slug: LegalPageSlug; label: string }> = [
  { slug: "privacy", label: "隱私權政策" },
  { slug: "terms", label: "服務條款" },
];

export default function AdminLegalPage() {
  const [activeSlug, setActiveSlug] = useState<LegalPageSlug>("privacy");
  const [draft, setDraft] = useState<LegalPageContent>(() => getDefaultLegalPage("privacy"));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setStatus(null);
    void fetchLegalPage(activeSlug)
      .then((doc) => {
        if (cancelled) return;
        setDraft(doc ?? getDefaultLegalPage(activeSlug));
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(err);
        setDraft(getDefaultLegalPage(activeSlug));
        setStatus({ tone: "err", text: "讀取失敗，已載入預設內容供編輯。" });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeSlug]);

  const previewContent = useMemo<LegalPageContent>(() => draft, [draft]);

  function updateField<K extends keyof LegalPageContent>(key: K, value: LegalPageContent[K]) {
    setDraft((c) => ({ ...c, [key]: value }));
  }

  function updateSection(index: number, patch: Partial<LegalSection>) {
    setDraft((c) => {
      const next = c.sections.slice();
      next[index] = { ...next[index], ...patch };
      return { ...c, sections: next };
    });
  }

  function addSection() {
    setDraft((c) => ({
      ...c,
      sections: [
        ...c.sections,
        {
          id: `section-${Date.now()}`,
          heading: "新章節標題",
          body: "",
          highlight: false,
        },
      ],
    }));
  }

  function removeSection(index: number) {
    if (!confirm("確定刪除此章節？")) return;
    setDraft((c) => ({
      ...c,
      sections: c.sections.filter((_, i) => i !== index),
    }));
  }

  function moveSection(index: number, direction: -1 | 1) {
    setDraft((c) => {
      const target = index + direction;
      if (target < 0 || target >= c.sections.length) return c;
      const next = c.sections.slice();
      [next[index], next[target]] = [next[target], next[index]];
      return { ...c, sections: next };
    });
  }

  function resetToDefault() {
    if (!confirm("將編輯內容重設為系統預設？目前未儲存的修改會遺失。")) return;
    setDraft(getDefaultLegalPage(activeSlug));
    setStatus({ tone: "ok", text: "已重設為系統預設，記得按下儲存才會生效。" });
  }

  async function handleSave() {
    setSaving(true);
    setStatus(null);
    try {
      await saveLegalPage(draft);
      setStatus({ tone: "ok", text: "已儲存到 Supabase。" });
    } catch (err) {
      setStatus({
        tone: "err",
        text: err instanceof Error ? err.message : "儲存失敗",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminGuard>
      <section className="mx-auto max-w-md px-6 py-10">
        <div className="rounded-[2rem] bg-pine p-6 text-white shadow-lg">
          <p className="text-sm font-semibold text-gold">Admin</p>
          <h1 className="mt-2 text-3xl font-bold">隱私權／服務條款</h1>
          <p className="mt-4 leading-7 text-parchment">
            編輯 /privacy 與 /terms 兩個公開頁面的內容。儲存後會即時推送到 Supabase，公開頁面會自動更新。
          </p>
          <p className="mt-3 text-xs text-parchment/70">
            支援格式：空白行分段、行首 <code>- </code> 變項目符號、
            <code>**粗體**</code>、
            <code>mailto:</code> 與 <code>https://</code> 會自動變連結。
          </p>
        </div>

        <div className="mt-6 flex gap-2">
          {TABS.map((tab) => {
            const isActive = tab.slug === activeSlug;
            return (
              <button
                key={tab.slug}
                type="button"
                onClick={() => setActiveSlug(tab.slug)}
                className={`flex-1 rounded-full px-4 py-2 text-sm font-bold ${
                  isActive
                    ? "bg-clay text-white"
                    : "bg-white text-pine ring-1 ring-parchment"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <p className="mt-6 text-center text-sm text-muted">載入中…</p>
        ) : (
          <div className="mt-6 space-y-4">
            <FieldCard title="標題區">
              <LabelInput
                label="徽章文字（badge）"
                value={draft.badge}
                onChange={(v) => updateField("badge", v)}
              />
              <LabelInput
                label="主標題"
                value={draft.title}
                onChange={(v) => updateField("title", v)}
              />
              <LabelTextarea
                label="導語（intro）"
                rows={3}
                value={draft.intro}
                onChange={(v) => updateField("intro", v)}
              />
              <LabelInput
                label="最後更新日期文字"
                value={draft.lastUpdated}
                onChange={(v) => updateField("lastUpdated", v)}
              />
            </FieldCard>

            <FieldCard title="小卡（noticeTitle / noticeBody）">
              <LabelInput
                label="小卡標題"
                value={draft.noticeTitle}
                onChange={(v) => updateField("noticeTitle", v)}
              />
              <LabelTextarea
                label="小卡內容"
                rows={3}
                value={draft.noticeBody}
                onChange={(v) => updateField("noticeBody", v)}
              />
            </FieldCard>

            <div className="rounded-[1.5rem] bg-white p-5 ring-1 ring-parchment">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-black text-pine">章節（{draft.sections.length}）</h2>
                <button
                  type="button"
                  onClick={addSection}
                  className="rounded-full bg-pine px-4 py-2 text-xs font-bold text-white"
                >
                  + 新增章節
                </button>
              </div>
              <div className="mt-4 space-y-3">
                {draft.sections.map((section, index) => (
                  <div
                    key={section.id}
                    className="rounded-2xl border border-parchment bg-ivory p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-muted">#{index + 1}</p>
                      <div className="flex gap-1">
                        <SmallButton
                          onClick={() => moveSection(index, -1)}
                          disabled={index === 0}
                        >
                          ↑
                        </SmallButton>
                        <SmallButton
                          onClick={() => moveSection(index, 1)}
                          disabled={index === draft.sections.length - 1}
                        >
                          ↓
                        </SmallButton>
                        <SmallButton onClick={() => removeSection(index)} tone="danger">
                          刪除
                        </SmallButton>
                      </div>
                    </div>
                    <LabelInput
                      label="ID（連結錨點用）"
                      value={section.id}
                      onChange={(v) => updateSection(index, { id: v })}
                    />
                    <LabelInput
                      label="章節標題"
                      value={section.heading}
                      onChange={(v) => updateSection(index, { heading: v })}
                    />
                    <LabelTextarea
                      label="內容"
                      rows={6}
                      value={section.body}
                      onChange={(v) => updateSection(index, { body: v })}
                    />
                    <label className="mt-2 flex items-center gap-2 text-xs font-bold text-pine">
                      <input
                        type="checkbox"
                        checked={Boolean(section.highlight)}
                        onChange={(event) =>
                          updateSection(index, { highlight: event.target.checked })
                        }
                        className="h-4 w-4 accent-clay"
                      />
                      高亮卡片（clay 邊框，用於重要宣導）
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {status ? (
              <p
                className={`text-sm font-bold ${
                  status.tone === "ok" ? "text-green-700" : "text-clay"
                }`}
              >
                {status.text}
              </p>
            ) : null}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowPreview((v) => !v)}
                className="rounded-full border border-pine bg-white px-4 py-3 text-sm font-bold text-pine"
              >
                {showPreview ? "收合預覽" : "預覽外觀"}
              </button>
              <button
                type="button"
                onClick={resetToDefault}
                className="rounded-full border border-clay bg-white px-4 py-3 text-sm font-bold text-clay"
              >
                重設為預設
              </button>
            </div>

            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSave()}
              className="w-full rounded-full bg-clay px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
            >
              {saving ? "儲存中…" : `儲存到 ${activeSlug === "privacy" ? "/privacy" : "/terms"}`}
            </button>

            {showPreview ? (
              <div className="mt-6 -mx-6 border-t border-parchment bg-ivory pt-2">
                <p className="px-6 pt-4 text-xs font-bold text-muted">預覽（外觀）</p>
                <LegalPageView slug={activeSlug} initialContent={previewContent} />
              </div>
            ) : null}
          </div>
        )}
      </section>
    </AdminGuard>
  );
}

function FieldCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 rounded-[1.5rem] bg-white p-5 ring-1 ring-parchment">
      <h2 className="text-lg font-black text-pine">{title}</h2>
      {children}
    </div>
  );
}

function LabelInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-bold text-pine">
      {label}
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-2xl border border-parchment bg-ivory px-3 py-2 text-sm font-normal text-ink outline-none focus:border-clay"
      />
    </label>
  );
}

function LabelTextarea({
  label,
  value,
  onChange,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-bold text-pine">
      {label}
      <textarea
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-2xl border border-parchment bg-ivory px-3 py-2 text-sm font-normal leading-6 text-ink outline-none focus:border-clay"
      />
    </label>
  );
}

function SmallButton({
  children,
  onClick,
  disabled,
  tone = "default",
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "danger";
}) {
  const base =
    "rounded-full px-3 py-1 text-[11px] font-bold disabled:opacity-40 disabled:cursor-not-allowed";
  const cls =
    tone === "danger"
      ? `${base} border border-clay text-clay`
      : `${base} border border-pine/40 text-pine`;
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cls}>
      {children}
    </button>
  );
}
