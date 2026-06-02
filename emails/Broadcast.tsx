import { Text } from "@react-email/components";
import EmailLayout from "./_layout";

type BroadcastEmailProps = {
  subject: string;
  body: string;
};

export default function BroadcastEmail({ subject, body }: BroadcastEmailProps) {
  const paragraphs = body
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

  return (
    <EmailLayout preview={subject}>
      <Text style={{ color: "#1E3D2F", fontSize: 18, fontWeight: 700, lineHeight: "28px" }}>
        {subject}
      </Text>
      {paragraphs.map((para, idx) => (
        <Text
          key={idx}
          style={{ color: "#1A1510", fontSize: 15, lineHeight: "26px", whiteSpace: "pre-wrap" }}
        >
          {para}
        </Text>
      ))}
    </EmailLayout>
  );
}
