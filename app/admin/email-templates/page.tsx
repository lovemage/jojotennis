"use client";

import { useCallback, useEffect, useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import { auth } from "@/lib/firebase";
import {
  getEmailTemplate,
  saveEmailTemplate,
  type EmailTemplate,
} from "@/lib/emailTemplateService";
import {
  EMAIL_TEMPLATE_DEFAULTS,
  EMAIL_TEMPLATE_LABELS,
  EMAIL_TEMPLATE_VARIABLES,
  type EmailTemplateKey,
} from "@/lib/emailTemplateDefaults";

const TEMPLATE_KEYS: EmailTemplateKey[] = [
  "welcome",
  "coach_submitted_applicant",
  "message_to_coach",
];

function fillDefaults(
  key: EmailTemplateKey,
  data: Partial<EmailTemplate> | null,
): EmailTemplate {
  const defaults = EMAIL_TEMPLATE_DEFAULTS[key];
  return {
    subject: data?.subject || defaults.subject,
    greeting: data?.greeting || defaults.greeting,
    body: data?.body || defaults.body,
    ctaLabel: data?.ctaLabel || defaults.ctaLabel,
  };
}

export default function AdminEmailTemplatesPage() {
  const [templateKey, setTemplateKey] = useState<EmailTemplateKey>("welcome");
  const [template, setTemplate] = useState<EmailTemplate>(() =>
    fillDefaults("welcome", null),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewSubject, setPreviewSubject] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setStatus("");
    (async () => {
      try {
        const data = await getEmailTemplate(templateKey);
        if (cancelled) return;
        setTemplate(fillDefaults(templateKey, data));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [templateKey]);

  const refreshPreview = useCallback(async (draft: EmailTemplate) => {
    setPreviewing(true);
    setPreviewError("");
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        setPreviewError("尚未登入或 token 取得失敗");
        return;
      }
      const res = await fetch("/api/admin/email-templates/preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ templateKey, draft }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        setPreviewError(err.error || `預覽失敗 (${res.status})`);
        return;
      }
      const data = (await res.json()) as { html: string; subject: string };
      setPreviewHtml(data.html);
      setPreviewSubject(data.subject);
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : "預覽失敗");
    } finally {
      setPreviewing(false);
    }
  }, [templateKey]);

  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(() => {
      void refreshPreview(template);
    }, 400);
    return () => clearTimeout(timer);
  }, [template, loading, refreshPreview]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setStatus("");
    try {
      await saveEmailTemplate(templateKey, template);
      setStatus("已儲存");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "儲存失敗");
    } finally {
      setSaving(false);
    }
  }

  const supportedVars = EMAIL_TEMPLATE_VARIABLES[templateKey];

  return (
    <AdminGuard>
      <section className="mx-auto max-w-3xl px-6 py-10">
        <div className="rounded-[2rem] bg-pine p-6 text-white shadow-lg">
          <p className="text-sm font-semibold text-gold">Admin</p>
          <h1 className="mt-2 text-3xl font-bold">Email 模板</h1>
          <p className="mt-4 leading-7 text-parchment">
            編輯系統信件內容，並即時預覽渲染結果。內文可使用 {"{變數}"} 帶入動態資料。
          </p>
        </div>

        <div className="mt-6 rounded-[1.5rem] bg-white p-5 ring-1 ring-parchment">
          <label className="block">
            <span className="text-xs font-bold text-pine">選擇模板</span>
            <select
              value={templateKey}
              onChange={(event) => setTemplateKey(event.target.value as EmailTemplateKey)}
              className="mt-1 w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay"
            >
              {TEMPLATE_KEYS.map((key) => (
                <option key={key} value={key}>
                  {EMAIL_TEMPLATE_LABELS[key]}（{key}）
                </option>
              ))}
            </select>
          </label>
          <p className="mt-3 text-xs text-muted">
            可用變數：
            {supportedVars.length > 0
              ? supportedVars.map((v) => `{${v}}`).join("、")
              : "無"}
          </p>
        </div>

        {loading ? (
          <p className="mt-6 rounded-2xl bg-white p-5 text-sm text-muted ring-1 ring-parchment">
            載入中...
          </p>
        ) : (
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <form
              onSubmit={(event) => void submit(event)}
              className="space-y-4 rounded-[1.5rem] bg-white p-5 ring-1 ring-parchment"
            >
              <h2 className="text-lg font-black text-pine">
                編輯：{EMAIL_TEMPLATE_LABELS[templateKey]}
              </h2>

              <label className="block">
                <span className="text-xs font-bold text-pine">主旨</span>
                <input
                  value={template.subject}
                  onChange={(event) =>
                    setTemplate((c) => ({ ...c, subject: event.target.value }))
                  }
                  className="mt-1 w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold text-pine">問候語</span>
                <input
                  value={template.greeting}
                  onChange={(event) =>
                    setTemplate((c) => ({ ...c, greeting: event.target.value }))
                  }
                  className="mt-1 w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold text-pine">內文</span>
                <textarea
                  rows={6}
                  value={template.body}
                  onChange={(event) =>
                    setTemplate((c) => ({ ...c, body: event.target.value }))
                  }
                  className="mt-1 w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm leading-6 outline-none focus:border-clay"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold text-pine">按鈕文字</span>
                <input
                  value={template.ctaLabel}
                  onChange={(event) =>
                    setTemplate((c) => ({ ...c, ctaLabel: event.target.value }))
                  }
                  className="mt-1 w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay"
                />
              </label>

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-full bg-clay px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
              >
                {saving ? "儲存中..." : "儲存模板"}
              </button>
              {status ? <p className="text-sm font-bold text-clay">{status}</p> : null}
            </form>

            <div className="rounded-[1.5rem] bg-white p-5 ring-1 ring-parchment">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-pine">預覽</h2>
                {previewing ? (
                  <span className="text-xs text-muted">渲染中…</span>
                ) : null}
              </div>
              <p className="mt-2 text-xs text-muted">
                主旨：<span className="font-bold text-pine">{previewSubject || "—"}</span>
              </p>
              {previewError ? (
                <p className="mt-3 text-sm font-bold text-clay">{previewError}</p>
              ) : null}
              <div className="mt-3 overflow-hidden rounded-2xl border border-parchment bg-ivory">
                <iframe
                  title="email-preview"
                  srcDoc={previewHtml}
                  sandbox=""
                  className="h-[480px] w-full bg-white"
                />
              </div>
              <p className="mt-2 text-[11px] text-muted">
                預覽使用 sample 變數渲染；實際寄送時會帶入真實使用者資料。
              </p>
            </div>
          </div>
        )}
      </section>
    </AdminGuard>
  );
}
