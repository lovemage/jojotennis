"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PageHero from "@/components/PageHero";
import LoginPromptModal from "@/components/LoginPromptModal";
import { useApp } from "@/context/AppContext";
import { taiwanCities } from "@/data/cities";
import {
  fetchPendingCoach,
  submitPendingCoach,
  type PendingCoachRecord,
} from "@/lib/pendingCoachService";
import { uploadCoachIdImage } from "@/lib/storageUploads";

type FormState = {
  realName: string;
  city: string;
  phone: string;
  birthday: string;
  nickname: string;
  ntrpRange: string;
  pricePerHour: string;
  bio: string;
};

const EMPTY_FORM: FormState = {
  realName: "",
  city: "",
  phone: "",
  birthday: "",
  nickname: "",
  ntrpRange: "",
  pricePerHour: "",
  bio: "",
};

const NTRP_OPTIONS = [
  "NTRP 1.0–2.5",
  "NTRP 2.0–3.5",
  "NTRP 2.5–4.0",
  "NTRP 3.0–4.5",
  "NTRP 3.5–5.0",
  "NTRP 4.0–5.5",
];

export default function CoachRegisterClient() {
  const { user } = useApp();
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [existing, setExisting] = useState<PendingCoachRecord | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    if (!user) {
      setExisting(null);
      return;
    }
    let cancelled = false;
    setLoadingExisting(true);
    void fetchPendingCoach(user.uid)
      .then((doc) => {
        if (cancelled) return;
        setExisting(doc);
        if (doc) {
          setForm({
            realName: doc.realName,
            city: doc.city,
            phone: doc.phone,
            birthday: doc.birthday,
            nickname: doc.nickname,
            ntrpRange: doc.ntrpRange,
            pricePerHour: doc.pricePerHour ? String(doc.pricePerHour) : "",
            bio: doc.bio,
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingExisting(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const isLocked = existing?.status === "pending" || existing?.status === "approved";

  const canSubmit = useMemo(() => {
    if (!user || isLocked || submitting) return false;
    return (
      form.realName.trim().length >= 2 &&
      form.city.trim().length > 0 &&
      /^09\d{8}$/.test(form.phone.trim()) &&
      /^\d{4}-\d{2}-\d{2}$/.test(form.birthday) &&
      form.nickname.trim().length > 0 &&
      form.ntrpRange.trim().length > 0 &&
      Number(form.pricePerHour) > 0 &&
      form.bio.trim().length >= 20 &&
      idFront !== null &&
      idBack !== null &&
      agreeTerms
    );
  }, [user, isLocked, submitting, form, idFront, idBack, agreeTerms]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((c) => ({ ...c, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }
    if (!idFront || !idBack) {
      setStatus({ tone: "err", text: "請上傳身分證正反面 2 張圖片" });
      return;
    }
    setSubmitting(true);
    setStatus(null);
    try {
      const [front, back] = await Promise.all([
        uploadCoachIdImage(user.uid, "front", idFront),
        uploadCoachIdImage(user.uid, "back", idBack),
      ]);
      await submitPendingCoach({
        uid: user.uid,
        email: user.email,
        realName: form.realName.trim(),
        city: form.city.trim(),
        phone: form.phone.trim(),
        birthday: form.birthday,
        nickname: form.nickname.trim(),
        ntrpRange: form.ntrpRange.trim(),
        pricePerHour: Number(form.pricePerHour),
        bio: form.bio.trim(),
        idFrontUrl: front.url,
        idFrontPath: front.path,
        idBackUrl: back.url,
        idBackPath: back.path,
      });
      setStatus({ tone: "ok", text: "申請已送出，審核期間約 2-5 個工作日，結果會以 email 通知您。" });
      setIdFront(null);
      setIdBack(null);
      const fresh = await fetchPendingCoach(user.uid);
      setExisting(fresh);

    } catch (err) {
      setStatus({
        tone: "err",
        text: err instanceof Error ? err.message : "送出失敗，請稍後再試。",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto max-w-md px-6 py-10">
      <PageHero
        settingsKey="coachRegister"
        eyebrow="Coach Register"
        title="申請成為平台教練"
        description="填寫個人與身分驗證資料，由管理員審核通過後即會刊登在「找教練」列表。"
        image="/images/hero/coach-register.png"
      />

      {!user ? (
        <div className="mt-6 rounded-[1.5rem] bg-white p-5 text-sm leading-7 text-ink ring-1 ring-parchment">
          <p className="font-bold text-pine">請先登入會員</p>
          <p className="mt-2 text-muted">
            為了綁定身分與後續溝通，需要您登入後才能送出申請。
          </p>
          <button
            type="button"
            onClick={() => setShowLoginPrompt(true)}
            className="mt-4 w-full rounded-full bg-clay px-4 py-3 text-sm font-bold text-white"
          >
            前往登入
          </button>
          <LoginPromptModal
            isOpen={showLoginPrompt}
            onClose={() => setShowLoginPrompt(false)}
          />
        </div>
      ) : loadingExisting ? (
        <p className="mt-6 text-center text-sm text-muted">讀取既有申請中…</p>
      ) : (
        <>
          {existing ? <StatusCard record={existing} /> : null}

          {isLocked && existing ? (
            <LockedNotice status={existing.status as "pending" | "approved"} />
          ) : (
            <form
              onSubmit={(e) => void handleSubmit(e)}
              className="mt-6 space-y-4"
            >
              <FieldCard title="個人驗證資料（不公開）">
                <p className="text-xs leading-6 text-muted">
                  下列資料僅供身分審核使用，**不會**公開顯示於教練頁。審核通過後身分證影像將立即從系統刪除。
                </p>
                <LabelInput
                  label="真實姓名"
                  required
                  value={form.realName}
                  onChange={(v) => updateField("realName", v)}
                  placeholder="與身分證相符"
                />
                <LabelInput
                  label="行動電話"
                  required
                  value={form.phone}
                  onChange={(v) => updateField("phone", v)}
                  placeholder="09xxxxxxxx"
                  inputMode="tel"
                />
                <LabelInput
                  label="出生年月日"
                  required
                  type="date"
                  value={form.birthday}
                  onChange={(v) => updateField("birthday", v)}
                />
                <label className="flex flex-col gap-1 text-xs font-bold text-pine">
                  所在縣市
                  <select
                    required
                    value={form.city}
                    onChange={(e) => updateField("city", e.target.value)}
                    className="rounded-2xl border border-parchment bg-ivory px-3 py-2 text-sm font-normal text-ink outline-none focus:border-clay"
                  >
                    <option value="">請選擇</option>
                    {taiwanCities.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="space-y-2">
                  <FileSlot
                    label="身分證正面"
                    file={idFront}
                    onPick={setIdFront}
                  />
                  <FileSlot
                    label="身分證反面"
                    file={idBack}
                    onPick={setIdBack}
                  />
                  <p className="text-[11px] leading-5 text-muted">
                    可接受 JPG / PNG / WebP / HEIC，單檔 5MB 以下。
                  </p>
                </div>
              </FieldCard>

              <FieldCard title="公開教練資料">
                <LabelInput
                  label="教練暱稱（將顯示於找教練列表）"
                  required
                  value={form.nickname}
                  onChange={(v) => updateField("nickname", v)}
                  placeholder="例：阿凱教練"
                />
                <label className="flex flex-col gap-1 text-xs font-bold text-pine">
                  可教授等級
                  <select
                    required
                    value={form.ntrpRange}
                    onChange={(e) => updateField("ntrpRange", e.target.value)}
                    className="rounded-2xl border border-parchment bg-ivory px-3 py-2 text-sm font-normal text-ink outline-none focus:border-clay"
                  >
                    <option value="">請選擇</option>
                    {NTRP_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </label>
                <LabelInput
                  label="每堂費用（NTD / 小時）"
                  required
                  type="number"
                  value={form.pricePerHour}
                  onChange={(v) => updateField("pricePerHour", v)}
                  placeholder="例：1200"
                />
                <LabelTextarea
                  label="自我介紹（至少 20 字）"
                  required
                  rows={5}
                  value={form.bio}
                  onChange={(v) => updateField("bio", v)}
                  placeholder="教學風格、經歷、可服務的球場與時段…"
                />
              </FieldCard>

              <div className="rounded-[1.5rem] border border-parchment bg-white p-5">
                <label className="flex items-start gap-2 text-xs leading-6 text-ink">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="mt-1 h-4 w-4 accent-clay"
                  />
                  <span>
                    我已閱讀並同意{" "}
                    <Link href="/terms" className="font-semibold text-clay underline">
                      服務條款
                    </Link>{" "}
                    與{" "}
                    <Link href="/privacy" className="font-semibold text-clay underline">
                      隱私權政策
                    </Link>
                    ，並聲明所填資料屬實，同意揪揪網球依審核需求暫時保存身分證影像，
                    並於審核完成後立即刪除。
                  </span>
                </label>
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

              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full rounded-full bg-clay px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {submitting ? "送出中…" : "送出申請"}
              </button>
              <p className="text-center text-xs text-muted">
                目前完全免費，無刊登費用。送出後請靜候審核結果。
              </p>
            </form>
          )}
        </>
      )}
    </section>
  );
}

function StatusCard({ record }: { record: PendingCoachRecord }) {
  const map = {
    pending: { tone: "bg-amber-100 text-amber-900", text: "審核中" },
    approved: { tone: "bg-green-100 text-green-900", text: "已通過，已刊登" },
    rejected: { tone: "bg-red-100 text-red-900", text: "未通過" },
  } as const;
  const m = map[record.status];
  const ts = record.submittedAt ? new Date(record.submittedAt).toLocaleString("zh-TW") : "—";
  return (
    <div className="mt-6 rounded-[1.5rem] bg-white p-5 ring-1 ring-parchment">
      <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${m.tone}`}>
        {m.text}
      </span>
      <p className="mt-3 text-sm text-ink">
        申請時間：<span className="text-muted">{ts}</span>
      </p>
      {record.status === "rejected" && record.rejectionReason ? (
        <p className="mt-2 text-sm leading-6 text-clay">
          退回原因：{record.rejectionReason}
        </p>
      ) : null}
    </div>
  );
}

function LockedNotice({ status }: { status: "pending" | "approved" }) {
  return (
    <div className="mt-6 rounded-[1.5rem] bg-parchment p-5 text-sm leading-7 text-ink">
      {status === "pending" ? (
        <>
          您的申請已送出並正在審核，暫時無法修改。如需更改資料，請等候審核結果或來信
          support@jojotennis.com 協助。
        </>
      ) : (
        <>
          您的教練資訊已通過審核並刊登於「找教練」列表，公開資料的修改請聯絡客服。
        </>
      )}
    </div>
  );
}

function FieldCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
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
  type = "text",
  placeholder,
  required,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-bold text-pine">
      {label}
      {required ? <span className="sr-only">必填</span> : null}
      <input
        required={required}
        type={type}
        value={value}
        placeholder={placeholder}
        inputMode={inputMode}
        onChange={(e) => onChange(e.target.value)}
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
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-bold text-pine">
      {label}
      <textarea
        required={required}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-2xl border border-parchment bg-ivory px-3 py-2 text-sm font-normal leading-6 text-ink outline-none focus:border-clay"
      />
    </label>
  );
}

function FileSlot({
  label,
  file,
  onPick,
}: {
  label: string;
  file: File | null;
  onPick: (f: File | null) => void;
}) {
  return (
    <label className="flex items-center gap-3 rounded-2xl border border-parchment bg-ivory p-3 text-xs text-pine">
      <span className="rounded-full bg-pine px-3 py-2 text-xs font-bold text-white">
        選擇檔案
      </span>
      <span className="flex-1 truncate text-ink">
        {file ? file.name : <span className="text-muted">{label}（必填）</span>}
      </span>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
        className="hidden"
      />
    </label>
  );
}
