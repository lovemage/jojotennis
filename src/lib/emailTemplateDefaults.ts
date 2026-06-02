export type EmailTemplateContent = {
  subject: string;
  greeting: string;
  body: string;
  ctaLabel: string;
};

export type EmailTemplateKey =
  | "welcome"
  | "coach_submitted_applicant"
  | "message_to_coach";

export const EMAIL_TEMPLATE_DEFAULTS: Record<EmailTemplateKey, EmailTemplateContent> = {
  welcome: {
    subject: "歡迎加入 JoJo Tennis",
    greeting: "{nickname}，歡迎加入 JoJo Tennis",
    body: "你可以開始找球場、發起約打，或收藏適合自己的球具評測。",
    ctaLabel: "立即開始",
  },
  coach_submitted_applicant: {
    subject: "教練申請已收到",
    greeting: "{nickname}，您好",
    body: "您的教練申請已成功送出，審核期間約 2-5 個工作日，結果會以 email 通知您。",
    ctaLabel: "查看申請狀態",
  },
  message_to_coach: {
    subject: "您有一則新訊息",
    greeting: "{nickname}，您好",
    body: "您有一則來自 {senderName} 的新訊息，請至 App 內查看完整內容。",
    ctaLabel: "開啟訊息",
  },
};

export const EMAIL_TEMPLATE_VARIABLES: Record<EmailTemplateKey, readonly string[]> = {
  welcome: ["nickname"],
  coach_submitted_applicant: ["nickname"],
  message_to_coach: ["nickname", "senderName"],
};

export const EMAIL_TEMPLATE_LABELS: Record<EmailTemplateKey, string> = {
  welcome: "歡迎信",
  coach_submitted_applicant: "教練送審通知（申請人）",
  message_to_coach: "學員訊息通知（教練）",
};

export const EMAIL_TEMPLATE_SAMPLE_VARS: Record<EmailTemplateKey, Record<string, string>> = {
  welcome: { nickname: "小明" },
  coach_submitted_applicant: { nickname: "小明" },
  message_to_coach: { nickname: "王教練", senderName: "小明" },
};

export const EMAIL_TEMPLATE_DEFAULT_CTA_PATH: Record<EmailTemplateKey, string> = {
  welcome: "/",
  coach_submitted_applicant: "/coach/register",
  message_to_coach: "/messages",
};
