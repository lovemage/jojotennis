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

function toBase64(value: string) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(value).toString("base64");
  }

  return btoa(unescape(encodeURIComponent(value)));
}

export function createAiTennisCover(title: string, accent: string, subject: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1E3D2F"/>
      <stop offset="0.55" stop-color="#B85C38"/>
      <stop offset="1" stop-color="#EDE5D6"/>
    </linearGradient>
    <radialGradient id="glow" cx="70%" cy="25%" r="55%">
      <stop offset="0" stop-color="#FDFAF6" stop-opacity="0.75"/>
      <stop offset="1" stop-color="#FDFAF6" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="675" fill="url(#bg)"/>
  <rect width="1200" height="675" fill="url(#glow)"/>
  <path d="M0 520 C250 430 460 465 700 390 C900 330 1060 340 1200 270 L1200 675 L0 675 Z" fill="#C9A84C" opacity="0.23"/>
  <path d="M70 560 L1130 235" stroke="#FDFAF6" stroke-width="8" opacity="0.75"/>
  <path d="M120 600 L1180 275" stroke="#FDFAF6" stroke-width="3" opacity="0.5"/>
  <circle cx="760" cy="250" r="46" fill="#EDE5D6" opacity="0.95"/>
  <circle cx="760" cy="250" r="30" fill="${accent}" opacity="0.9"/>
  <path d="M590 435 C635 315 720 250 815 220" fill="none" stroke="#FDFAF6" stroke-width="26" stroke-linecap="round" opacity="0.9"/>
  <path d="M600 445 L520 545" stroke="#1A1510" stroke-width="20" stroke-linecap="round" opacity="0.55"/>
  <ellipse cx="610" cy="390" rx="95" ry="42" transform="rotate(-28 610 390)" fill="none" stroke="#FDFAF6" stroke-width="14" opacity="0.9"/>
  <path d="M548 350 L672 430 M565 330 L690 410 M530 375 L655 455" stroke="#FDFAF6" stroke-width="4" opacity="0.55"/>
  <text x="72" y="115" fill="#FDFAF6" font-family="Arial, sans-serif" font-size="28" font-weight="700" opacity="0.85">JoJo Tennis Editorial</text>
  <text x="72" y="505" fill="#FDFAF6" font-family="Arial, sans-serif" font-size="54" font-weight="800">${subject}</text>
  <text x="72" y="570" fill="#EDE5D6" font-family="Arial, sans-serif" font-size="30" font-weight="600">${title}</text>
</svg>`;

  return `data:image/svg+xml;base64,${toBase64(svg)}`;
}

export const newsArticles: NewsArticle[] = [
  {
    id: "news-001",
    title: "Sinner 羅馬封王，完成生涯黃金大師賽",
    slug: "sinner-rome-2026-golden-masters",
    category: "賽事",
    coverImage: createAiTennisCover("Clay Court Victory", "#B85C38", "Champion on Clay"),
    excerpt:
      "Jannik Sinner 羅馬封王，成為 50 年來首位在羅馬奪冠的義大利男子球員。",
    content:
      "世界第一 Jannik Sinner 於 5 月 17 日在羅馬義大利公開賽決賽中，以 6-4、6-4 直落二擊敗挪威好手 Casper Ruud，奪下個人第十座 Masters 1000 冠軍。Sinner 成為 50 年來首位在羅馬封王的義大利男子球員，同時完成生涯「黃金大師賽」，成為繼 Djokovic 之後第二位集齊九站冠軍的男子球員。本賽季他已奪下印第安威爾斯、邁阿密、蒙地卡羅、馬德里、羅馬五站冠軍，法國網球公開賽將是他下一個目標。",
    publishedAt: "2026-05-17",
    isPublished: true,
    author: "JoJo Tennis 編輯部",
  },
  {
    id: "news-002",
    title: "Svitolina 羅馬三冠！決賽力克小高夫",
    slug: "svitolina-rome-2026-champion",
    category: "賽事",
    coverImage: createAiTennisCover("Powerful Baseline Strike", "#C9A84C", "Rome Final Energy"),
    excerpt:
      "Elina Svitolina 第三度在羅馬站捧盃，展現穩定底線防守與精準反拍。",
    content:
      "烏克蘭好手 Elina Svitolina 在羅馬義大利公開賽女子決賽中，擊敗美國新星 Coco Gauff，第三度在羅馬站捧盃，成為本屆最大黑馬。頭號種子 Sabalenka 早早出局，讓 Svitolina 一路乘勝追擊，在決賽展現穩定的底線防守和精準的反拍，讓 Gauff 無從發揮。此役也讓 Svitolina 的 WTA 排名大幅提升，並確立她作為法網有力競爭者的地位。",
    publishedAt: "2026-05-16",
    isPublished: true,
    author: "JoJo Tennis 編輯部",
  },
];
