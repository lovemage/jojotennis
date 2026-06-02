import { NextResponse } from "next/server";
import { notifyUser } from "@/lib/notificationTriggers";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as { uid?: string; title?: string; body?: string; url?: string };
  if (!body.uid) return NextResponse.json({ error: "Missing uid" }, { status: 400 });
  const result = await notifyUser(body.uid, {
    title: body.title ?? "約打通知",
    body: body.body ?? "你有新的約打事件。",
    url: body.url,
  });
  return NextResponse.json(result);
}
