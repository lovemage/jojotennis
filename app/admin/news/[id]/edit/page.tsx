"use client";

import { useParams } from "next/navigation";
import AdminGuard from "@/components/AdminGuard";
import NewsEditorForm from "@/components/NewsEditorForm";
import { useApp } from "@/context/AppContext";

export default function EditNewsPage() {
  const params = useParams<{ id: string }>();
  const { newsArticles } = useApp();
  const article = newsArticles.find((item) => item.id === params.id);

  return (
    <AdminGuard>
      <section className="mx-auto max-w-md px-6 py-10">
        <div className="rounded-[2rem] bg-pine p-6 text-white shadow-lg">
          <p className="text-sm font-semibold text-gold">Admin</p>
          <h1 className="mt-2 text-3xl font-bold">編輯文章</h1>
          <p className="mt-4 leading-7 text-parchment">
            {article?.title ?? "找不到文章"}
          </p>
        </div>
        {article ? (
          <NewsEditorForm article={article} />
        ) : (
          <p className="mt-6 rounded-2xl bg-white p-5 text-sm text-muted">
            這篇文章不存在，可能已被刪除。
          </p>
        )}
      </section>
    </AdminGuard>
  );
}
