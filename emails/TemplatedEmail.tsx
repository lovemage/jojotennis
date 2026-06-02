import { Button, Text } from "@react-email/components";
import EmailLayout from "./_layout";

export type TemplatedEmailProps = {
  subject: string;
  greeting: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
  variables?: Record<string, string>;
};

function applyVars(text: string, vars: Record<string, string>) {
  return text.replace(/\{(\w+)\}/g, (_, key: string) =>
    vars[key] !== undefined ? vars[key] : `{${key}}`,
  );
}

export default function TemplatedEmail({
  subject,
  greeting,
  body,
  ctaLabel,
  ctaHref,
  variables = {},
}: TemplatedEmailProps) {
  const greetingText = applyVars(greeting, variables);
  const bodyText = applyVars(body, variables);
  const ctaText = ctaLabel ? applyVars(ctaLabel, variables) : "";
  return (
    <EmailLayout preview={applyVars(subject, variables)}>
      <Text style={{ color: "#1A1510", fontSize: 16, lineHeight: "28px" }}>
        {greetingText}
      </Text>
      <Text style={{ color: "#1A1510", fontSize: 15, lineHeight: "26px", whiteSpace: "pre-line" }}>
        {bodyText}
      </Text>
      {ctaText && ctaHref ? (
        <Button
          href={ctaHref}
          style={{
            marginTop: 16,
            borderRadius: 10,
            backgroundColor: "#B85C38",
            color: "#fff",
            padding: "12px 18px",
            fontWeight: 700,
          }}
        >
          {ctaText}
        </Button>
      ) : null}
    </EmailLayout>
  );
}
