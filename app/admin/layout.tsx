"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading, authReady, isAdmin } = useApp();

  useEffect(() => {
    if (!authReady || loading) return;
    if (!user) {
      router.replace("/auth?next=/admin");
      return;
    }
    if (!isAdmin) {
      router.replace("/");
    }
  }, [user, loading, authReady, isAdmin, router]);

  if (!authReady || loading) {
    return (
      <section className="mx-auto max-w-md px-6 py-16 text-center">
        <p className="text-sm text-muted">正在確認管理權限...</p>
      </section>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return <>{children}</>;
}
