import Link from "next/link";
import { matchPosts } from "@/data/matchPosts";
import { newsArticles } from "@/data/news";

export default function HomePage() {
  const openMatches = matchPosts.filter((post) => post.status !== "full").length;
  const features = [
    {
      title: "🗺 找球場",
      description: "全台 40+ 場地",
      href: "/courts",
    },
    {
      title: "🎾 揪球友",
      description: `今日 ${openMatches} 人揪球中`,
      href: "/match",
    },
    {
      title: "🎓 找教練",
      description: "依等級媒合教練",
      href: "/coach",
    },
    {
      title: "📰 網球新聞",
      description: "最新賽事資訊",
      href: "/news",
    },
  ];
  return (
    <section className="mx-auto max-w-md px-6 py-10">
      <div className="rounded-[2.25rem] bg-pine p-7 text-white shadow-lg">
        <p className="text-sm font-semibold text-gold">
          揪揪網球 JoJo Tennis
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight">
          找球友，找球場，就在揪揪網球
        </h1>
        <p className="mt-5 leading-7 text-parchment">
          全台 40+ 網球場即時查詢・智慧媒合你的最佳球友・台灣最大網球社群
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/match"
            className="rounded-full bg-gold px-5 py-3 text-sm font-bold text-pine"
          >
            立即找球友
          </Link>
          <Link
            href="/courts"
            className="rounded-full border border-gold px-5 py-3 text-sm font-bold text-gold"
          >
            探索球場地圖
          </Link>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        {features.map((feature) => (
          <Link
            key={feature.title}
            href={feature.href}
            className="rounded-[1.5rem] border border-parchment bg-white p-5 shadow-sm"
          >
            <h2 className="text-lg font-bold text-pine">{feature.title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              {feature.description}
            </p>
          </Link>
        ))}
      </div>

      <div className="mt-6 rounded-[1.5rem] border border-parchment bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-clay">你的球技等級</p>
        <h2 className="mt-2 text-2xl font-bold text-pine">用 NTRP 找到適合球友</h2>
        <p className="mt-3 text-sm leading-6 text-muted">
          NTRP 從 1.0 到 7.0 描述網球程度，讓約球和教練媒合更精準。{" "}
          <Link href="/ntrp" className="font-semibold text-clay underline">
            什麼是 NTRP？
          </Link>
        </p>
      </div>

      <section className="mt-6">
        <h2 className="text-2xl font-bold text-pine">📣 現在有人揪球！</h2>
        <div className="mt-4 space-y-3">
          {matchPosts.slice(0, 3).map((post) => (
            <Link
              key={post.id}
              href="/match"
              className="block rounded-[1.5rem] border border-parchment bg-white p-5 shadow-sm"
            >
              <p className="text-xs font-semibold text-clay">
                {post.city} · {post.level}
              </p>
              <h3 className="mt-1 font-bold text-pine">{post.title}</h3>
              <p className="mt-2 text-sm text-muted">
                {post.date} {post.time} · {post.courtName}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-2xl font-bold text-pine">🎾 網球新聞 & 活動</h2>
        <p className="mt-2 text-sm text-muted">賽事快訊・品牌活動・新品上市</p>
        <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
          {newsArticles.slice(0, 3).map((article) => (
            <Link
              key={article.id}
              href={`/news/${article.slug}`}
              className="w-64 shrink-0 rounded-[1.5rem] border border-parchment bg-white p-3 shadow-sm"
            >
              <img
                src={article.coverImage}
                alt={article.title}
                className="aspect-video w-full rounded-xl object-cover"
              />
              <span className="mt-3 inline-flex rounded-full bg-clay px-3 py-1 text-xs font-bold text-white">
                {article.category}
              </span>
              <h3 className="mt-2 line-clamp-2 font-bold text-pine">
                {article.title}
              </h3>
              <p className="mt-2 text-xs text-muted">{article.publishedAt}</p>
            </Link>
          ))}
        </div>
      </section>
    </section>
  );
}
