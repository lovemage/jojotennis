import { handleLineCallback } from "@/lib/lineCallbackHandler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handleLineCallback(request);
}
