"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { DEFAULT_HERO_IMAGES, subscribeLandingHeroImages, type LandingHeroImage } from "@/lib/landingSettings";

export default function HomePageContent() {
  const { matches, newsArticles } = useApp();
  const [heroImages, setHeroImages] = useState<LandingHeroImage[]>(DEFAULT_HERO_IMAGES);

  useEffect(() => subscribeLandingHeroImages(setHeroImages), []);
  const openMatches = matches.filter((match) => match.status === "open").length;
  const publishedNews = newsArticles.filter((article) => article.isPublished);

  const features = [
    {
      eyebrow: "COURTS",
      title: "找球場",
      description: "全台球場即時查詢",
      href: "/courts",
      image: "/images/landing/feature-courts.png",
    },
    {
      eyebrow: "MATCH",
      title: "揪球友",
      description: `今日 ${openMatches} 場開放中`,
      href: "/match",
      image: "/images/landing/feature-match.png",
    },
    {
      eyebrow: "COACH",
      title: "找教練",
      description: "依等級媒合教練",
      href: "/coach",
      image: "/images/landing/feature-coach.png",
    },
    {
      eyebrow: "INSIGHT",
      title: "網球新聞",
      description: "最新賽事資訊",
      href: "/news",
      image: "/images/landing/feature-journal.png",
    },
  ];

  return (
    <section className="mx-auto max-w-md overflow-hidden pb-8">
      <HeroSection features={features} heroImages={heroImages} />

      <div className="mt-5 border-y border-pine/10 bg-white px-5 py-6 shadow-[0_20px_60px_rgba(30,61,47,0.08)]">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-clay">Player Index</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-pine">用 NTRP 找到剛好的對手</h2>
        <p className="mt-3 text-sm leading-6 text-muted">
          從休閒練球到固定對戰，用程度、地點與時段快速縮小搜尋範圍。
        </p>
        <Link
          href="/ntrp"
          className="mt-4 inline-flex items-center rounded-full border border-pine/15 px-4 py-2 text-sm font-bold text-pine"
        >
          查看等級指南
        </Link>
      </div>

      <section className="mt-6">
        <div className="flex items-end justify-between gap-4 px-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-clay">Live Matches</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-pine">現在有人揪球</h2>
          </div>
          <Link href="/match" className="text-sm font-bold text-clay">
            全部
          </Link>
        </div>
        <div className="mt-4 divide-y divide-pine/10 border-y border-pine/10 bg-white shadow-[0_16px_48px_rgba(30,61,47,0.07)]">
          {matches.slice(0, 3).map((match) => (
            <Link
              key={match.id}
              href={{
                pathname: "/match",
                query: {
                  city: match.city,
                  title: match.title,
                  time: match.date.replaceAll("/", "-"),
                },
              }}
              className="block px-5 py-5"
            >
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-clay">{match.city}</p>
              <h3 className="mt-2 text-lg font-black tracking-tight text-pine">{match.title}</h3>
              <p className="mt-2 text-sm text-muted">
                {match.date} {match.startTime}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <div className="px-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-clay">Journal</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-pine">網球新聞與活動</h2>
          <p className="mt-2 text-sm text-muted">賽事快訊、品牌活動、新品上市</p>
        </div>
        <div className="mt-4 flex gap-4 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {publishedNews.slice(0, 3).map((article) => (
            <Link
              key={article.id}
              href={`/news/${article.slug}`}
              className="w-64 shrink-0 rounded-[1.75rem] border border-pine/10 bg-white p-3 shadow-[0_16px_48px_rgba(30,61,47,0.07)]"
            >
              {article.coverImage ? (
                <img
                  src={article.coverImage}
                  alt={article.title}
                  className="aspect-[4/3] w-full rounded-[1.25rem] object-cover"
                />
              ) : null}
              <span className="mt-3 inline-flex rounded-full bg-pine px-3 py-1 text-xs font-bold text-white">
                {article.category}
              </span>
              <h3 className="mt-2 line-clamp-2 text-lg font-black tracking-tight text-pine">{article.title}</h3>
              <p className="mt-2 text-xs text-muted">{article.publishedAt}</p>
            </Link>
          ))}
        </div>
      </section>
    </section>
  );
}

function HeroSection({
  features,
  heroImages,
}: {
  features: Array<{ eyebrow: string; title: string; description: string; href: string; image: string }>;
  heroImages: LandingHeroImage[];
}) {
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);
  const visibleHeroImages = heroImages.length > 0 ? heroImages : DEFAULT_HERO_IMAGES;

  useEffect(() => {
    if (visibleHeroImages.length < 2) return;
    const timer = window.setInterval(() => {
      setActiveHeroIndex((current) => (current + 1) % visibleHeroImages.length);
    }, 1800);
    return () => window.clearInterval(timer);
  }, [visibleHeroImages.length]);

  return (
    <>
      <div className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden bg-pine text-white shadow-[0_24px_70px_rgba(30,61,47,0.28)]">
        <div className="absolute inset-0">
          {visibleHeroImages.map((image, index) => (
            <img
              key={`${image.url}-${index}`}
              src={image.url}
              alt=""
              aria-hidden="true"
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
                index === activeHeroIndex % visibleHeroImages.length ? "opacity-100" : "opacity-0"
              }`}
            />
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-pine/70 via-pine/42 to-pine/92" />
        <div className="relative mx-auto max-w-md px-5 pb-6 pt-7">
          <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.32em] text-gold">
            JoJo Tennis
          </div>
          <h1 className="mt-5 text-5xl font-black leading-[0.92] tracking-tight">
            台灣網球人的私人會所
          </h1>
          <p className="mt-5 max-w-[18rem] text-base leading-7 text-parchment">
            找球場、揪球友、配教練，把每一次上場安排得更俐落。
          </p>
          <HeroLinks />
          <div className="mt-6 flex gap-1.5">
            {visibleHeroImages.map((image, index) => (
              <span
                key={`${image.url}-dot-${index}`}
                className={`h-1.5 rounded-full transition-all ${
                  index === activeHeroIndex % visibleHeroImages.length ? "w-7 bg-gold" : "w-1.5 bg-white/35"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="-mx-5 mt-5 flex snap-x gap-4 overflow-x-auto px-5 pb-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {features.map((feature) => (
          <Link
            key={feature.title}
            href={feature.href}
            className="relative aspect-[3/4] w-[72%] max-w-[17rem] shrink-0 snap-start overflow-hidden rounded-[2rem] border border-pine/10 bg-white shadow-[0_18px_52px_rgba(30,61,47,0.12)]"
          >
            <img
              src={feature.image}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-pine/88 via-pine/28 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5 pb-6 text-white">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-gold">{feature.eyebrow}</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight">{feature.title}</h2>
              <p className="mt-2 text-sm leading-5 text-white/82">{feature.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}

function HeroLinks() {
  return (
    <div className="mt-6 grid grid-cols-2 gap-3">
      <Link
        href="/match"
        className="inline-flex h-12 items-center justify-center rounded-full bg-gold px-3 text-sm font-black text-pine shadow-[0_12px_28px_rgba(201,168,76,0.25)]"
      >
        立即找球友
      </Link>
      <Link
        href="/courts"
        className="inline-flex h-12 items-center justify-center rounded-full border border-white/20 bg-white/10 px-3 text-sm font-black text-white"
      >
        探索球場地圖
      </Link>
    </div>
  );
}
