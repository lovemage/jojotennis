import Link from "next/link";
import { newsArticles } from "@/data/news";

export default function AdminNewsPage() {
  return (
    <section className="mx-auto max-w-md px-6 py-10">
      <div className="rounded-[2rem] bg-pine p-6 text-white shadow-lg">
        <p className="text-sm font-semibold text-gold">Admin</p>
        <h1 className="mt-2 text-3xl font-bold">新聞管理</h1>
        <p className="mt-4 leading-7 text-parchment">
          管理發布、草稿、編輯與刪除新聞文章。
        </p>
      </div>

      <Link
        href="/admin/news/new"
        className="mt-6 flex h-12 items-center justify-center rounded-full bg-clay px-5 text-sm font-bold text-white"
      >
        新增文章
      </Link>

      <div className="mt-6 space-y-3">
        {newsArticles.map((article) => (
          <article
            key={article.id}
            className="rounded-[1.5rem] border border-parchment bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-clay">
                  {article.category} · {article.isPublished ? "發布" : "草稿"}
                </p>
                <h2 className="mt-1 font-bold text-pine">{article.title}</h2>
              </div>
              <Link
                href={`/admin/news/${article.id}/edit`}
                className="rounded-full border border-pine px-3 py-1 text-xs font-bold text-pine"
              >
                編輯
              </Link>
            </div>
            <button
              type="button"
              className="mt-4 rounded-full bg-ivory px-4 py-2 text-xs font-bold text-clay"
            >
              刪除
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
