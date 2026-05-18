import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import NewsList from "@/components/NewsList";
import { newsArticles } from "@/data/news";

export const metadata: Metadata = {
  title: "網球新聞｜賽事・品牌・新品｜揪揪網球",
};

export default function NewsPage() {
  return (
    <section className="mx-auto max-w-md px-6 py-10">
      <PageHero
        eyebrow="News"
        title="網球新聞 & 活動"
        description="賽事快訊・品牌活動・新品上市，掌握台灣與國際網球消息。"
      />
      <NewsList articles={newsArticles.filter((article) => article.isPublished)} />
    </section>
  );
}
