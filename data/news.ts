export type NewsCategory = "賽事" | "品牌" | "新品" | "活動" | "教學";

export type NewsArticle = {
  id: string;
  title: string;
  slug: string;
  category: NewsCategory;
  coverImage: string;
  excerpt: string;
  content: string;
  publishedAt: string;
  isPublished: boolean;
  author: string;
};

export const newsArticles: NewsArticle[] = [
  {
    id: "news-001",
    title: "法網熱身賽開打，紅土賽季觀戰重點一次看",
    slug: "clay-season-preview",
    category: "賽事",
    coverImage:
      "https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&w=900&q=80",
    excerpt:
      "紅土賽季進入高潮，整理發球、上旋與底線耐心三個觀戰重點，幫你更快看懂比賽節奏。",
    content:
      "紅土賽季對球員的腳步、耐心與上旋品質都是考驗。觀戰時可以注意選手如何用高彈跳球建立優勢，以及在長拍來回後選擇進攻時機。對業餘球友來說，這也是學習穩定性和落點控制的好機會。",
    publishedAt: "2026-05-18",
    isPublished: true,
    author: "JoJo Tennis 編輯部",
  },
  {
    id: "news-002",
    title: "夏季網球品牌活動：球拍試打與新手體驗會",
    slug: "summer-brand-demo-day",
    category: "品牌",
    coverImage:
      "https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=900&q=80",
    excerpt:
      "多個品牌即將舉辦夏季試打活動，適合想換拍、找線材或第一次接觸網球的新手參加。",
    content:
      "夏季品牌活動將以球拍試打、線材諮詢和新手體驗為主。建議參加前先記錄目前使用的球拍重量、拍面大小與常見擊球問題，現場會更容易找到適合自己的器材。",
    publishedAt: "2026-05-16",
    isPublished: true,
    author: "JoJo Tennis 編輯部",
  },
  {
    id: "news-003",
    title: "新款穩定型網球鞋上市，適合硬地球場高頻移動",
    slug: "new-stability-tennis-shoes",
    category: "新品",
    coverImage:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80",
    excerpt:
      "新款硬地網球鞋主打側向支撐與耐磨外底，適合常在公園硬地與運動中心練球的玩家。",
    content:
      "硬地球場對鞋底耐磨度和側向支撐要求高。選購網球鞋時，除了外觀，也應注意前掌彎折、腳踝包覆與急停時的穩定性，避免用一般跑鞋替代網球鞋。",
    publishedAt: "2026-05-12",
    isPublished: true,
    author: "JoJo Tennis 編輯部",
  },
];
