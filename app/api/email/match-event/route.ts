import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/emailClient";
import MatchEventEmail from "@/emails/MatchEvent";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    email?: string;
    uid?: string;
    subject?: string;
    message?: string;
    url?: string;
  };
  if (!body.email) return NextResponse.json({ error: "Missing email" }, { status: 400 });

  const subject = body.subject ?? "JoJo Tennis 約打通知";
  await sendEmail({
    to: body.email,
    toUid: body.uid,
    subject,
    template: "match_event",
    react: MatchEventEmail({
      title: subject,
      message: body.message ?? "你有一則新的約打通知。",
      actionUrl: body.url ?? process.env.APP_BASE_URL ?? "https://jojotennis.com",
    }),
    meta: { url: body.url },
  });
  return NextResponse.json({ ok: true });
}
