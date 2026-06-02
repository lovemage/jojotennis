import { NextResponse } from "next/server";
import { notifyUser } from "@/lib/notificationTriggers";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as { uids?: string[]; sender?: string; content?: string; url?: string };
  const uids = body.uids ?? [];
  const results = await Promise.all(
    uids.map((uid) =>
      notifyUser(uid, {
        title: body.sender ? `${body.sender} 傳來訊息` : "新訊息",
        body: (body.content ?? "你有一則新訊息").slice(0, 60),
        url: body.url ?? "/messages",
      }),
    ),
  );
  return NextResponse.json({ sent: results.reduce((sum, result) => sum + result.sent, 0) });
}
