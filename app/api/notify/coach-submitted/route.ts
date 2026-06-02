import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/emailClient";
import TemplatedEmail from "@/emails/TemplatedEmail";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebaseAdmin";
import {
  EMAIL_TEMPLATE_DEFAULTS,
  EMAIL_TEMPLATE_DEFAULT_CTA_PATH,
} from "@/lib/emailTemplateDefaults";

export const runtime = "nodejs";

const ADMIN_NOTIFY_TO = "sasabrinalu@gmail.com";

type PendingCoachDoc = {
  uid?: string;
  email?: string;
  realName?: string;
  city?: string;
  phone?: string;
  nickname?: string;
  ntrpRange?: string;
  pricePerHour?: number;
  submittedAt?: { toDate?: () => Date };
};

async function verifyCaller(request: Request, expectedUid: string) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return { ok: false as const, status: 401, error: "Missing token" };
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    if (decoded.uid !== expectedUid) {
      return { ok: false as const, status: 403, error: "Forbidden" };
    }
    return { ok: true as const };
  } catch {
    return { ok: false as const, status: 401, error: "Invalid token" };
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { uid?: string };
  if (!body.uid) {
    return NextResponse.json({ error: "Missing uid" }, { status: 400 });
  }

  const auth = await verifyCaller(request, body.uid);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const firestore = getAdminFirestore();
  const snap = await firestore.collection("pending_coaches").doc(body.uid).get();
  if (!snap.exists) {
    return NextResponse.json({ error: "pending coach not found" }, { status: 404 });
  }
  const pending = snap.data() as PendingCoachDoc;
  if (!pending.email) {
    return NextResponse.json({ error: "pending coach has no email" }, { status: 400 });
  }

  const appBaseUrl = (process.env.APP_BASE_URL ?? "https://jojotennis.com").replace(/\/$/, "");
  const displayName = pending.nickname || pending.realName || "教練申請人";

  // 申請人模板（可由 admin 編輯）
  const defaults = EMAIL_TEMPLATE_DEFAULTS.coach_submitted_applicant;
  let applicantTemplate = { ...defaults };
  try {
    const tplSnap = await firestore
      .collection("email_templates")
      .doc("coach_submitted_applicant")
      .get();
    if (tplSnap.exists) {
      const data = tplSnap.data() as Partial<typeof defaults>;
      applicantTemplate = {
        subject: data.subject || defaults.subject,
        greeting: data.greeting || defaults.greeting,
        body: data.body || defaults.body,
        ctaLabel: data.ctaLabel || defaults.ctaLabel,
      };
    }
  } catch {
    // fallback to defaults
  }

  const applicantCtaHref =
    appBaseUrl + EMAIL_TEMPLATE_DEFAULT_CTA_PATH.coach_submitted_applicant;
  const applicantVars = { nickname: displayName };

  // 管理員通知信（固定文字，不走 Firestore 模板）
  const adminSubject = `「${pending.realName || displayName}」提交教練申請待審核`;
  const submittedAtText = pending.submittedAt?.toDate
    ? pending.submittedAt.toDate().toLocaleString("zh-TW")
    : new Date().toLocaleString("zh-TW");
  const adminBody = [
    `有一位新教練送出申請，請至後台審核。`,
    ``,
    `姓名：${pending.realName || "—"}`,
    `暱稱：${pending.nickname || "—"}`,
    `Email：${pending.email}`,
    `城市：${pending.city || "—"}`,
    `可教等級：${pending.ntrpRange || "—"}`,
    `每堂費用：NT$${pending.pricePerHour ?? "—"}`,
    `申請時間：${submittedAtText}`,
  ].join("\n");
  const adminCtaHref = `${appBaseUrl}/admin/coaches`;

  const results = await Promise.allSettled([
    sendEmail({
      to: pending.email,
      toUid: body.uid,
      subject: applicantTemplate.subject,
      template: "coach_submitted_applicant",
      react: TemplatedEmail({
        subject: applicantTemplate.subject,
        greeting: applicantTemplate.greeting,
        body: applicantTemplate.body,
        ctaLabel: applicantTemplate.ctaLabel,
        ctaHref: applicantCtaHref,
        variables: applicantVars,
      }),
      meta: { nickname: displayName },
    }),
    sendEmail({
      to: ADMIN_NOTIFY_TO,
      subject: adminSubject,
      template: "coach_submitted_admin",
      react: TemplatedEmail({
        subject: adminSubject,
        greeting: `管理員，您好`,
        body: adminBody,
        ctaLabel: `前往後台審核`,
        ctaHref: adminCtaHref,
      }),
      meta: { applicantUid: body.uid, applicantEmail: pending.email },
    }),
  ]);

  const errors = results
    .map((r, i) => (r.status === "rejected" ? `${i === 0 ? "applicant" : "admin"}: ${String(r.reason)}` : null))
    .filter((v): v is string => v !== null);
  const sent = results.filter((r) => r.status === "fulfilled").length;

  return NextResponse.json({ sent, errors });
}
