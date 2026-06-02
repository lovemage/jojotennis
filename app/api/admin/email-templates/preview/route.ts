import { NextResponse } from "next/server";
import { render } from "@react-email/render";
import TemplatedEmail from "@/emails/TemplatedEmail";
import { getAdminAuth } from "@/lib/firebaseAdmin";
import { SUPER_ADMIN_EMAILS } from "@/lib/config";
import {
  EMAIL_TEMPLATE_DEFAULTS,
  EMAIL_TEMPLATE_DEFAULT_CTA_PATH,
  EMAIL_TEMPLATE_SAMPLE_VARS,
  type EmailTemplateKey,
} from "@/lib/emailTemplateDefaults";

export const runtime = "nodejs";

const ALLOWED_KEYS: EmailTemplateKey[] = [
  "welcome",
  "coach_submitted_applicant",
  "message_to_coach",
];

function applyVars(text: string, vars: Record<string, string>) {
  return text.replace(/\{(\w+)\}/g, (_, key: string) =>
    vars[key] !== undefined ? vars[key] : `{${key}}`,
  );
}

async function isAdminCaller(request: Request) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return false;
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    const email = (decoded.email || "").toLowerCase();
    return SUPER_ADMIN_EMAILS.map((e) => e.toLowerCase()).includes(email);
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!(await isAdminCaller(request))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    templateKey?: EmailTemplateKey;
    draft?: {
      subject?: string;
      greeting?: string;
      body?: string;
      ctaLabel?: string;
    };
  };

  const key = body.templateKey;
  if (!key || !ALLOWED_KEYS.includes(key)) {
    return NextResponse.json({ error: "Invalid templateKey" }, { status: 400 });
  }

  const defaults = EMAIL_TEMPLATE_DEFAULTS[key];
  const draft = {
    subject: body.draft?.subject || defaults.subject,
    greeting: body.draft?.greeting || defaults.greeting,
    body: body.draft?.body || defaults.body,
    ctaLabel: body.draft?.ctaLabel || defaults.ctaLabel,
  };

  const variables = EMAIL_TEMPLATE_SAMPLE_VARS[key];
  const appBaseUrl = (process.env.APP_BASE_URL ?? "https://jojotennis.com").replace(/\/$/, "");
  const ctaHref = appBaseUrl + EMAIL_TEMPLATE_DEFAULT_CTA_PATH[key];

  const html = await render(
    TemplatedEmail({
      subject: draft.subject,
      greeting: draft.greeting,
      body: draft.body,
      ctaLabel: draft.ctaLabel,
      ctaHref,
      variables,
    }),
  );
  const resolvedSubject = applyVars(draft.subject, variables);

  return NextResponse.json({ html, subject: resolvedSubject, variables });
}
