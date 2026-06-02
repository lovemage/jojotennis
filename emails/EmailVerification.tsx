import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export default function EmailVerificationEmail({
  nickname,
  verifyUrl,
}: {
  nickname: string;
  verifyUrl: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>請驗證你的 JoJo Tennis Email</Preview>
      <Body style={{ margin: 0, backgroundColor: "#F8F4EC", fontFamily: "Arial, sans-serif" }}>
        <Container style={{ margin: "0 auto", maxWidth: 560, padding: "32px 20px" }}>
          <Section style={{ borderRadius: 20, backgroundColor: "#FFFFFF", padding: 28 }}>
            <Heading style={{ margin: "0 0 16px", color: "#1F3D32", fontSize: 24 }}>
              驗證你的 Email
            </Heading>
            <Text style={{ color: "#425046", fontSize: 15, lineHeight: "24px" }}>
              {nickname} 你好，請點擊下方按鈕完成 Email 驗證。
            </Text>
            <Button
              href={verifyUrl}
              style={{
                marginTop: 16,
                borderRadius: 999,
                backgroundColor: "#B75A38",
                color: "#FFFFFF",
                padding: "12px 20px",
                fontSize: 14,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              完成 Email 驗證
            </Button>
            <Text style={{ marginTop: 20, color: "#6B756E", fontSize: 13, lineHeight: "21px" }}>
              如果你沒有要求驗證 JoJo Tennis 帳號，請忽略這封信。
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
