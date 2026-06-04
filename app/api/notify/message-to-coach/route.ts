import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/emailClient";
import TemplatedEmail from "@/emails/TemplatedEmail";
import { getAdminAuth } from "@/lib/firebaseAdmin";
import { getSupabaseServiceClient } from "@/lib/supabase";
import { getRedisConversation, listRedisChatMessages } from "@/lib/upstashChat";
import {
  EMAIL_TEMPLATE_DEFAULTS,
  EMAIL_TEMPLATE_DEFAULT_CTA_PATH,
} from "@/lib/emailTemplateDefaults";

export const runtime = "nodejs";

function isAblyChatMode() {
  return (process.env.NEXT_PUBLIC_CHAT_REALTIME_PROVIDER ?? "ably") === "ably";
}

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

  if (isAblyChatMode()) {
    return NextResponse.json({ skipped: "ably chat mode" });
  }

  const conv = await getRedisConversation(body.convId);
  if (!conv) {
    return NextResponse.json({ skipped: "conversation not found" });
  }
  if (conv.type !== "direct" || !Array.isArray(conv.participants) || conv.participants.length !== 2) {
    return NextResponse.json({ skipped: "not direct two-party conversation" });
  }
  const recipientUid = conv.participants.find((u) => u !== body.senderUid);
  if (!recipientUid) {
    return NextResponse.json({ skipped: "recipient not resolvable" });
  }

  const supabase = getSupabaseServiceClient();
  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("uid,nickname,email,role")
    .in("uid", [body.senderUid, recipientUid])
    .eq("is_deleted", false);
  if (usersError) return NextResponse.json({ error: usersError.message }, { status: 500 });

  const sender = users?.find((row) => row.uid === body.senderUid);
  const recipient = users?.find((row) => row.uid === recipientUid);
  if (!sender || !recipient) {
    return NextResponse.json({ skipped: "sender or recipient not found" });
  }
  if (recipient?.role !== "coach") {
    return NextResponse.json({ skipped: "recipient not coach" });
  }

  const senderName = sender.nickname || "一位學員";
  const recipientName = recipient.nickname || "教練";

  // 判定是否為對話中該 sender 的第一則訊息。聊天內容已改存 Upstash Redis。
  let isFirstMessage = false;
  try {
    const messages = await listRedisChatMessages(body.convId);
    isFirstMessage = messages.filter((message) => message.senderUid === body.senderUid).length === 1;
  } catch {
    isFirstMessage = false;
  }

  const appBaseUrl = (process.env.APP_BASE_URL ?? "https://jojotennis.com").replace(/\/$/, "");
  const messagesUrl = appBaseUrl + EMAIL_TEMPLATE_DEFAULT_CTA_PATH.message_to_coach;

  let emailSent = false;
  const errors: string[] = [];

  if (isFirstMessage) {
    if (!recipient.email) {
      errors.push("recipient has no email");
    } else {
      const defaults = EMAIL_TEMPLATE_DEFAULTS.message_to_coach;
      const template = { ...defaults };

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
    emailSent,
    isFirstMessage,
    errors,
  });
}
