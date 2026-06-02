import { NextResponse } from "next/server";
import { createUploadSignature } from "@/lib/cloudinary";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { folder?: string; tags?: string };
    const folder = body.folder?.replace(/^\//, "") || "uploads";
    const signature = createUploadSignature(folder, body.tags ?? "jojo-tennis");
    return NextResponse.json(signature);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Cloudinary signing failed" },
      { status: 500 },
    );
  }
}
