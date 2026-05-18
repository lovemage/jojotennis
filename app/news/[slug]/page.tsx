import Link from "next/link";
import { notFound } from "next/navigation";
import { newsArticles } from "@/data/news";

type NewsDetailPageProps = {
  params: {
    slug: string;
  };
};

export default function NewsDetailPage({ params }: NewsDetailPageProps) {
  const article = newsArticles.find((item) => item.slug === params.slug);

  if (!article) {
    notFound();
  }

  const moreNews = newsArticles
    .filter((item) => item.slug !== article.slug && item.isPublished)
    .slice(0, 3);

  return (
    <article className="mx-auto max-w-md px-6 py-10">
      <img
        src={article.coverImage}
        alt={article.title}
        className="aspect-video w-full rounded-[1.5rem] object-cover"
      />
      <div className="mt-5">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-clay px-3 py-1 text-xs font-bold text-white">
            {article.category}
          </span>
          <span className="text-xs text-muted">{article.publishedAt}</span>
        </div>
        <h1 className="mt-3 text-3xl font-bold text-pine">{article.title}</h1>
        <p className="mt-3 text-sm text-muted">作者：{article.author}</p>
      </div>

      <div className="mt-6 rounded-[1.5rem] bg-white p-5 text-base leading-8 text-ink shadow-sm ring-1 ring-parchment">
        {article.content}
      </div>

      <section className="mt-8">
        <h2 className="text-xl font-bold text-pine">更多新聞</h2>
        <div className="mt-4 space-y-3">
          {moreNews.map((item) => (
            <Link
              key={item.id}
              href={`/news/${item.slug}`}
              className="block rounded-2xl bg-white p-4 ring-1 ring-parchment"
            >
              <p className="text-xs font-semibold text-clay">{item.category}</p>
              <h3 className="mt-1 font-bold text-pine">{item.title}</h3>
              <p className="mt-1 text-xs text-muted">{item.publishedAt}</p>
            </Link>
          ))}
        </div>
      </section>
    </article>
  );
}
