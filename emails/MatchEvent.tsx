import { Button, Text } from "@react-email/components";
import EmailLayout from "./_layout";

export default function MatchEventEmail({
  title,
  message,
  actionUrl,
}: {
  title: string;
  message: string;
  actionUrl: string;
}) {
  return (
    <EmailLayout preview={title}>
      <Text style={{ color: "#1E3D2F", fontSize: 18, fontWeight: 700 }}>{title}</Text>
      <Text style={{ color: "#1A1510", fontSize: 15, lineHeight: "26px" }}>{message}</Text>
      <Button href={actionUrl} style={{ marginTop: 16, borderRadius: 10, backgroundColor: "#1E3D2F", color: "#fff", padding: "12px 18px", fontWeight: 700 }}>
        查看詳情
      </Button>
    </EmailLayout>
  );
}
