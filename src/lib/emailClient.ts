import { Resend } from "resend";
import type { ReactElement } from "react";
import { getSupabaseServiceClient, hasSupabaseConfig } from "./supabase";

type SendEmailInput = {
  to: string;
  toUid?: string;
  subject: string;
  react: ReactElement;
  template: string;
  meta?: Record<string, unknown>;
};

export const OFFICIAL_SUPPORT_EMAIL =
  process.env.OFFICIAL_SUPPORT_EMAIL || "support@jojotennis.com";
export const OFFICIAL_EMAIL_FROM =
  process.env.OFFICIAL_EMAIL_FROM || `JoJo Tennis <${OFFICIAL_SUPPORT_EMAIL}>`;

function getResendClient() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("Missing RESEND_API_KEY");
  return new Resend(key);
}

async function logEmail(input: {
  to: string;
  toUid?: string;
  template: string;
  resendId?: string;
  status: "sent" | "failed";
  error?: string;
  meta?: Record<string, unknown>;
}) {
  if (!hasSupabaseConfig() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return;

  const supabase = getSupabaseServiceClient();
  await supabase.from("email_log").insert({
    to_email: input.to,
    to_uid: input.toUid ?? null,
    template: input.template,
    resend_id: input.resendId ?? null,
    status: input.status,
    error: input.error ?? null,
    meta: input.meta ?? {},
  });
}

export async function sendEmail(input: SendEmailInput) {
  try {
    const resend = getResendClient();
    const result = await resend.emails.send({
      from: OFFICIAL_EMAIL_FROM,
      to: input.to,
      replyTo: OFFICIAL_SUPPORT_EMAIL,
      subject: input.subject,
      react: input.react,
      tags: [{ name: "template", value: input.template }],
    });

    await logEmail({
      to: input.to,
      toUid: input.toUid,
      template: input.template,
      resendId: result.data?.id,
      status: "sent",
      meta: input.meta,
    });
    return result;
  } catch (error) {
    await logEmail({
      to: input.to,
      toUid: input.toUid,
      template: input.template,
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
      meta: input.meta,
    });
    throw error;
  }
}
