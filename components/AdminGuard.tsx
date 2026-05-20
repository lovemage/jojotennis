"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useApp } from "@/context/AppContext";

type AdminGuardProps = {
  children: ReactNode;
};

export default function AdminGuard({ children }: AdminGuardProps) {
  const { user, authReady, isAdmin } = useApp();

  if (!authReady) {
    return (
      <section className="mx-auto max-w-md px-6 py-16 text-center">
        <h1 className="text-3xl font-bold text-pine">正在確認管理權限</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          請稍候，系統正在確認你的登入狀態。
        </p>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="mx-auto max-w-md px-6 py-16 text-center">
        <h1 className="text-3xl font-bold text-pine">請先登入管理帳號</h1>
        <Link
          href="/auth"
          className="mt-6 inline-flex rounded-full bg-clay px-6 py-3 text-sm font-bold text-white"
        >
          前往登入
        </Link>
      </section>
    );
  }

  if (!isAdmin) {
    return (
      <section className="mx-auto max-w-md px-6 py-16 text-center">
        <h1 className="text-3xl font-bold text-pine">沒有後台權限</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          請使用已授權的管理者帳號登入，或請主要管理者在後台加入你的 Email。
        </p>
      </section>
    );
  }

  return <>{children}</>;
}
