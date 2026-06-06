"use client";

import { auth } from "@/lib/firebase";

export async function getClientAuthHeaders(base: Record<string, string> = {}) {
  const token = await auth.currentUser?.getIdToken().catch(() => null);
  return token ? { ...base, Authorization: `Bearer ${token}` } : base;
}
