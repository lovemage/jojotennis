import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/emailClient";
import TemplatedEmail from "@/emails/TemplatedEmail";
import { getAdminAuth } from "@/lib/firebaseAdmin";
import {
  EMAIL_TEMPLATE_DEFAULTS,
  EMAIL_TEMPLATE_DEFAULT_CTA_PATH,
} from "@/lib/emailTemplateDefaults";

export const runtime = "nodejs";

const ADMIN_NOTIFY_TO = "sasabrinalu@gmail.com";

async function verifyCaller(request: Request, expectedUid: string) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return { ok: false as const, status: 401, error: "Missing token" };
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    if (decoded.uid !== expectedUid) return { ok: false as const, status: 403, error: "Forbidden" };
    return { ok: true as const };
  } catch {
    return { ok: false as const, status: 401, error: "Invalid token" };
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    uid?: string;
    email?: string | null;
    realName?: string;
    city?: string;
    phone?: string;
    nickname?: string;
    ntrpRange?: string;
    pricePerHour?: number;
  };
  if (!body.uid) return NextResponse.json({ error: "Missing uid" }, { status: 400 });
  if (!body.email) return NextResponse.json({ error: "Missing email" }, { status: 400 });

  const auth = await verifyCaller(request, body.uid);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const appBaseUrl = (process.env.APP_BASE_URL ?? "https://jojotennis.com").replace(/\/$/, "");
  const displayName = body.nickname || body.realName || "教練申請人";
  const applicantTemplate = EMAIL_TEMPLATE_DEFAULTS.coach_submitted_applicant;
  const adminSubject = `「${body.realName || displayName}」提交教練申請待審核`;
  const adminBody = [
    "有一位新教練送出申請，請至後台審核。",
    "",
    `姓名：${body.realName || "-"}`,
    `暱稱：${body.nickname || "-"}`,
    `Email：${body.email}`,
    `城市：${body.city || "-"}`,
    `電話：${body.phone || "-"}`,
    `可教等級：${body.ntrpRange || "-"}`,
    `每堂費用：NT$${body.pricePerHour ?? "-"}`,
    `申請時間：${new Date().toLocaleString("zh-TW")}`,
  ].join("\n");

  const results = await Promise.allSettled([
    sendEmail({
      to: body.email,
      toUid: body.uid,
      subject: applicantTemplate.subject,
      template: "coach_submitted_applicant",
      react: TemplatedEmail({
        subject: applicantTemplate.subject,
        greeting: applicantTemplate.greeting,
        body: applicantTemplate.body,
        ctaLabel: applicantTemplate.ctaLabel,
        ctaHref: appBaseUrl + EMAIL_TEMPLATE_DEFAULT_CTA_PATH.coach_submitted_applicant,
        variables: { nickname: displayName },
      }),
      meta: { nickname: displayName },
    }),
    sendEmail({
      to: ADMIN_NOTIFY_TO,
      subject: adminSubject,
      template: "coach_submitted_admin",
      react: TemplatedEmail({
        subject: adminSubject,
        greeting: "管理員，您好",
        body: adminBody,
        ctaLabel: "前往後台審核",
        ctaHref: `${appBaseUrl}/admin/coaches`,
      }),
      meta: { applicantUid: body.uid, applicantEmail: body.email },
    }),
  ]);

  const errors = results
    .map((result, index) =>
      result.status === "rejected"
        ? `${index === 0 ? "applicant" : "admin"}: ${String(result.reason)}`
        : null,
    )
    .filter((value): value is string => value !== null);

  return NextResponse.json({
    sent: results.filter((result) => result.status === "fulfilled").length,
    errors,
  });
}
