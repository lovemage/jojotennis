import type { Metadata } from "next";
import NewsPageClient from "@/components/NewsPageClient";

export const metadata: Metadata = {
  title: "網球新聞｜賽事・品牌・新品｜揪揪網球",
};

export default function NewsPage() {
  return <NewsPageClient />;
}
