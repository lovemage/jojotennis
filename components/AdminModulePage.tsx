"use client";

import Link from "next/link";
import { useApp } from "@/context/AppContext";

type AdminModulePageProps = {
  title: string;
  description: string;
  actions: string[];
};

export default function AdminModulePage({
  title,
  description,
  actions,
}: AdminModulePageProps) {
  const { user, isAdmin } = useApp();

  if (!user) {
    return (
      <section className="mx-auto max-w-md px-6 py-10">
        <div className="rounded-[2rem] bg-white p-6 text-center shadow-sm ring-1 ring-parchment">
          <h1 className="text-2xl font-bold text-pine">請先登入管理帳號</h1>
          <Link
            href="/auth"
            className="mt-5 inline-flex rounded-full bg-clay px-5 py-3 text-sm font-bold text-white"
          >
            前往登入
          </Link>
        </div>
      </section>
    );
  }

  if (!isAdmin) {
    return (
      <section className="mx-auto max-w-md px-6 py-10">
        <div className="rounded-[2rem] bg-white p-6 text-center shadow-sm ring-1 ring-parchment">
          <h1 className="text-2xl font-bold text-pine">沒有管理權限</h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            目前登入帳號尚未被授權為管理者。
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-md px-6 py-10">
      <div className="rounded-[2rem] bg-pine p-6 text-white shadow-lg">
        <p className="text-sm font-semibold text-gold">Admin</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-4 leading-7 text-parchment">{description}</p>
      </div>

      <div className="mt-6 space-y-3">
        {actions.map((action) => (
          <div
            key={action}
            className="rounded-[1.5rem] border border-parchment bg-white p-5 text-sm font-semibold leading-6 text-pine shadow-sm"
          >
            {action}
          </div>
        ))}
      </div>
    </section>
  );
}
