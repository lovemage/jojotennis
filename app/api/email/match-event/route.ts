import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/emailClient";
import MatchEventEmail from "@/emails/MatchEvent";
import { requireUser } from "@/lib/serverAuth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireUser(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = (await request.json().catch(() => ({}))) as {
    email?: string;
    uid?: string;
    subject?: string;
    message?: string;
    url?: string;
  };
  if (!body.email || !body.uid) return NextResponse.json({ error: "Missing email or uid" }, { status: 400 });
  if (body.uid !== auth.uid) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (auth.email && body.email.trim().toLowerCase() !== auth.email.trim().toLowerCase()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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
