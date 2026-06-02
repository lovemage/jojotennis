"use client";

import { useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import { auth } from "@/lib/firebase";

type SendResult = { sent: number; failed: number; errors?: string[] };

export default function AdminEmailBroadcastPage() {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [mode, setMode] = useState<"all" | "specific">("all");
  const [specificEmail, setSpecificEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<SendResult | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("");
    setResult(null);
    if (!subject.trim() || !body.trim()) {
      setStatus("請填寫主旨與內文");
      return;
    }
    if (mode === "specific" && !specificEmail.includes("@")) {
      setStatus("請輸入有效的 Email");
      return;
    }
    setSending(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        setStatus("尚未登入");
        return;
      }
      const response = await fetch("/api/email/broadcast", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          subject: subject.trim(),
          body: body.trim(),
          recipient:
            mode === "all" ? "all" : { email: specificEmail.trim() },
        }),
      });
      if (!response.ok) {
        const text = await response.text();
        setStatus(`送出失敗：${text}`);
        return;
      }
      const data = (await response.json()) as SendResult;
      setResult(data);
      setStatus("送出完成");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "送出失敗");
    } finally {
      setSending(false);
    }
  }

  return (
    <AdminGuard>
      <section className="mx-auto max-w-md px-6 py-10">
        <div className="rounded-[2rem] bg-pine p-6 text-white shadow-lg">
          <p className="text-sm font-semibold text-gold">Admin</p>
          <h1 className="mt-2 text-3xl font-bold">群發 Email</h1>
          <p className="mt-4 leading-7 text-parchment">
            寄信給全部會員或指定 Email。送出後會回報成功與失敗數。
          </p>
        </div>

        <form
          onSubmit={(event) => void submit(event)}
          className="mt-6 space-y-4 rounded-[1.5rem] bg-white p-5 ring-1 ring-parchment"
        >
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode("all")}
              className={`flex-1 rounded-full px-4 py-2 text-xs font-bold ${
                mode === "all" ? "bg-pine text-white" : "bg-parchment text-pine"
              }`}
            >
              全部會員
            </button>
            <button
              type="button"
              onClick={() => setMode("specific")}
              className={`flex-1 rounded-full px-4 py-2 text-xs font-bold ${
                mode === "specific" ? "bg-pine text-white" : "bg-parchment text-pine"
              }`}
            >
              指定 Email
            </button>
          </div>

          {mode === "specific" ? (
            <input
              type="email"
              value={specificEmail}
              onChange={(event) => setSpecificEmail(event.target.value)}
              placeholder="收件人 email"
              className="w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay"
            />
          ) : null}

          <input
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder="主旨"
            className="w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay"
          />

          <textarea
            rows={10}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="信件內文（空行分段）"
            className="w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm leading-6 outline-none focus:border-clay"
          />

          <button
            type="submit"
            disabled={sending}
            className="w-full rounded-full bg-clay px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
          >
            {sending ? "寄送中..." : "送出"}
          </button>

          {status ? <p className="text-sm font-bold text-clay">{status}</p> : null}
          {result ? (
            <div className="rounded-2xl bg-ivory p-4 text-sm leading-6 text-pine">
              <p className="font-bold">寄送結果</p>
              <p>成功：{result.sent} 封</p>
              <p>失敗：{result.failed} 封</p>
              {result.errors && result.errors.length > 0 ? (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-muted">
                    顯示失敗訊息
                  </summary>
                  <ul className="mt-2 list-disc pl-5 text-xs text-muted">
                    {result.errors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </div>
          ) : null}
        </form>
      </section>
    </AdminGuard>
  );
}
