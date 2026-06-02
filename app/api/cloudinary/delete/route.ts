import { NextResponse } from "next/server";
import { deleteCloudinaryAsset } from "@/lib/cloudinary";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { publicId?: string };
    if (!body.publicId) {
      return NextResponse.json({ error: "Missing publicId" }, { status: 400 });
    }

    const result = await deleteCloudinaryAsset(body.publicId);
    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Cloudinary delete failed" },
      { status: 500 },
    );
  }
}
