import { NextResponse } from "next/server";
import { createUploadSignature } from "@/lib/cloudinary";
import { requireAdmin, requireUser } from "@/lib/serverAuth";

export const runtime = "nodejs";

const ADMIN_UPLOAD_PREFIXES = [
  "courts/",
  "equipment-reviews/",
  "landing/",
  "news/",
  "page-heroes/",
];

function normalizeFolder(folder?: string) {
  const normalized = (folder ?? "uploads").replace(/^\/+/, "").replace(/\/+$/, "");
  if (
    !normalized ||
    normalized.length > 120 ||
    normalized.includes("..") ||
    !/^[a-zA-Z0-9/_-]+$/.test(normalized)
  ) {
    return null;
  }
  return normalized;
}

async function authorizeFolder(request: Request, folder: string) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth;

  if (folder === `users/${auth.uid}/avatar`) return auth;
  if (ADMIN_UPLOAD_PREFIXES.some((prefix) => folder.startsWith(prefix))) {
    return requireAdmin(request);
  }

  return { ok: false as const, status: 403, error: "Forbidden" };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { folder?: string; tags?: string };
    const folder = normalizeFolder(body.folder);
    if (!folder) return NextResponse.json({ error: "Invalid folder" }, { status: 400 });

    const auth = await authorizeFolder(request, folder);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const signature = createUploadSignature(folder, body.tags ?? "jojo-tennis");
    return NextResponse.json(signature);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Cloudinary signing failed" },
      { status: 500 },
    );
  }
}
