import { USE_SUPABASE } from "./config";
import { getSupabaseBrowserClient, hasSupabaseConfig } from "./supabase";

export type EmailTemplate = {
  subject: string;
  greeting: string;
  body: string;
  ctaLabel: string;
};

function toTemplate(data: Record<string, unknown>): EmailTemplate {
  return {
    subject: String(data.subject ?? ""),
    greeting: String(data.greeting ?? ""),
    body: String(data.body ?? ""),
    ctaLabel: String(data.cta_label ?? data.ctaLabel ?? ""),
  };
}

export async function getEmailTemplate(key: string): Promise<EmailTemplate | null> {
  if (!USE_SUPABASE || !hasSupabaseConfig()) return null;
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("email_templates")
    .select("subject,greeting,body,cta_label")
    .eq("key", key)
    .maybeSingle();
  if (error) throw error;
  return data ? toTemplate(data as Record<string, unknown>) : null;
}

export async function saveEmailTemplate(
  key: string,
  data: EmailTemplate,
): Promise<void> {
  if (!USE_SUPABASE || !hasSupabaseConfig()) throw new Error("Email 模板管理需要 Supabase 設定");
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("email_templates").upsert({
    key,
    subject: data.subject,
    greeting: data.greeting,
    body: data.body,
    cta_label: data.ctaLabel,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}
