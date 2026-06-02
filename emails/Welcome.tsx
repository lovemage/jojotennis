import { EMAIL_TEMPLATE_DEFAULTS } from "@/lib/emailTemplateDefaults";
import TemplatedEmail from "./TemplatedEmail";

type WelcomeEmailProps = {
  nickname?: string;
  appUrl?: string;
  subject?: string;
  greeting?: string;
  body?: string;
  ctaLabel?: string;
};

export const WELCOME_TEMPLATE_DEFAULTS = EMAIL_TEMPLATE_DEFAULTS.welcome;

export default function WelcomeEmail({
  nickname = "新球友",
  appUrl = "https://jojotennis.com",
  subject = WELCOME_TEMPLATE_DEFAULTS.subject,
  greeting = WELCOME_TEMPLATE_DEFAULTS.greeting,
  body = WELCOME_TEMPLATE_DEFAULTS.body,
  ctaLabel = WELCOME_TEMPLATE_DEFAULTS.ctaLabel,
}: WelcomeEmailProps) {
  return (
    <TemplatedEmail
      subject={subject}
      greeting={greeting}
      body={body}
      ctaLabel={ctaLabel}
      ctaHref={appUrl}
      variables={{ nickname }}
    />
  );
}
