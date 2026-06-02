import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/emailClient";
import TemplatedEmail from "@/emails/TemplatedEmail";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebaseAdmin";
import { notifyUser } from "@/lib/notificationTriggers";
import {
  EMAIL_TEMPLATE_DEFAULTS,
  EMAIL_TEMPLATE_DEFAULT_CTA_PATH,
} from "@/lib/emailTemplateDefaults";

export const runtime = "nodejs";

type UserDoc = { nickname?: string; email?: string };
type CoachDoc = { uid?: string; isDeleted?: boolean; nickname?: string };
type ConversationDoc = { type?: string; participants?: string[] };

async function verifyCaller(request: Request, expectedUid: string) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return { ok: false as const, status: 401, error: "Missing token" };
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    if (decoded.uid !== expectedUid) {
      return { ok: false as const, status: 403, error: "Forbidden" };
    }
    return { ok: true as const };
  } catch {
    return { ok: false as const, status: 401, error: "Invalid token" };
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    convId?: string;
    senderUid?: string;
  };
  if (!body.convId || !body.senderUid) {
    return NextResponse.json({ error: "Missing convId or senderUid" }, { status: 400 });
  }

  const auth = await verifyCaller(request, body.senderUid);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const firestore = getAdminFirestore();

  const convSnap = await firestore.collection("conversations").doc(body.convId).get();
  if (!convSnap.exists) {
    return NextResponse.json({ skipped: "conversation not found" });
  }
  const conv = convSnap.data() as ConversationDoc;
  if (conv.type !== "direct" || !Array.isArray(conv.participants) || conv.participants.length !== 2) {
    return NextResponse.json({ skipped: "not direct two-party conversation" });
  }
  const recipientUid = conv.participants.find((u) => u !== body.senderUid);
  if (!recipientUid) {
    return NextResponse.json({ skipped: "recipient not resolvable" });
  }

  // 收件人是否為已通過審核的教練
  const coachQuery = await firestore
    .collection("coaches")
    .where("uid", "==", recipientUid)
    .get();
  const isCoach = coachQuery.docs.some(
    (d) => (d.data() as CoachDoc).isDeleted !== true,
  );
  if (!isCoach) {
    return NextResponse.json({ skipped: "recipient not coach" });
  }

  // 取雙方暱稱與收件人 email
  const [senderSnap, recipientSnap] = await Promise.all([
    firestore.collection("users").doc(body.senderUid).get(),
    firestore.collection("users").doc(recipientUid).get(),
  ]);
  const sender = (senderSnap.data() as UserDoc | undefined) ?? {};
  const recipient = (recipientSnap.data() as UserDoc | undefined) ?? {};
  const senderName = sender.nickname || "一位學員";
  const recipientName = recipient.nickname || "教練";

  // 判定是否為對話中該 sender 的第一則訊息
  const msgQuery = await firestore
    .collection("conversations")
    .doc(body.convId)
    .collection("messages")
    .where("senderUid", "==", body.senderUid)
    .limit(2)
    .get();
  const isFirstMessage = msgQuery.size === 1;

  const appBaseUrl = (process.env.APP_BASE_URL ?? "https://jojotennis.com").replace(/\/$/, "");
  const messagesUrl = appBaseUrl + EMAIL_TEMPLATE_DEFAULT_CTA_PATH.message_to_coach;

  // FCM push（每一則都發）
  let pushResult: { sent: number } = { sent: 0 };
  try {
    pushResult = await notifyUser(recipientUid, {
      title: `${senderName} 傳來訊息`,
      body: "您有一則新訊息，請至 App 內查看。",
      url: "/messages",
    });
  } catch (err) {
    console.warn("[message-to-coach] push 失敗：", err);
  }

  let emailSent = false;
  const errors: string[] = [];

  if (isFirstMessage) {
    if (!recipient.email) {
      errors.push("recipient has no email");
    } else {
      const defaults = EMAIL_TEMPLATE_DEFAULTS.message_to_coach;
      let template = { ...defaults };
      try {
        const tplSnap = await firestore
          .collection("email_templates")
          .doc("message_to_coach")
          .get();
        if (tplSnap.exists) {
          const data = tplSnap.data() as Partial<typeof defaults>;
          template = {
            subject: data.subject || defaults.subject,
            greeting: data.greeting || defaults.greeting,
            body: data.body || defaults.body,
            ctaLabel: data.ctaLabel || defaults.ctaLabel,
          };
        }
      } catch {
        // fallback
      }

      try {
        await sendEmail({
          to: recipient.email,
          toUid: recipientUid,
          subject: template.subject,
          template: "message_to_coach",
          react: TemplatedEmail({
            subject: template.subject,
            greeting: template.greeting,
            body: template.body,
            ctaLabel: template.ctaLabel,
            ctaHref: messagesUrl,
            variables: { nickname: recipientName, senderName },
          }),
          meta: { convId: body.convId, senderUid: body.senderUid },
        });
        emailSent = true;
      } catch (err) {
        errors.push(err instanceof Error ? err.message : String(err));
      }
    }
  }

  return NextResponse.json({
    pushSent: pushResult.sent,
    emailSent,
    isFirstMessage,
    errors,
  });
}
