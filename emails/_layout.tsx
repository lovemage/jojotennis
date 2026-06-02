import { Body, Container, Head, Html, Preview, Section, Text } from "@react-email/components";
import type { ReactNode } from "react";

export default function EmailLayout({ preview, children }: { preview: string; children: ReactNode }) {
  return (
    <Html lang="zh-TW">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ margin: 0, backgroundColor: "#F7F2EB", fontFamily: "Arial, sans-serif" }}>
        <Container style={{ maxWidth: 560, margin: "0 auto", padding: "32px 20px" }}>
          <Section style={{ borderRadius: 16, backgroundColor: "#ffffff", padding: 28 }}>
            <Text style={{ margin: 0, color: "#1E3D2F", fontSize: 20, fontWeight: 700 }}>
              JoJo Tennis 揪揪網球
            </Text>
            {children}
            <Text style={{ marginTop: 28, color: "#8A7E6E", fontSize: 12, lineHeight: "20px" }}>
              你收到這封信是因為你使用 JoJo Tennis。之後可在個人設定調整通知偏好。
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
