import { NextResponse } from "next/server";
import { deleteCloudinaryAsset } from "@/lib/cloudinary";
import { requireAdmin } from "@/lib/serverAuth";

export const runtime = "nodejs";

function isValidPublicId(publicId: string) {
  return (
    publicId.length <= 180 &&
    !publicId.includes("..") &&
    /^[a-zA-Z0-9/_-]+$/.test(publicId)
  );
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = (await request.json()) as { publicId?: string };
    if (!body.publicId || !isValidPublicId(body.publicId)) {
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
