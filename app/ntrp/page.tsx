import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "NTRP 網球等級完整說明｜1.0 到 7.0 對照台灣 A/B/C/D 級｜揪揪網球",
  description:
    "完整解說 NTRP 網球分級，從初學 1.0 到職業 7.0，並對照台灣 A/B/C/D 球技等級，幫助你找到最合適的球友與教練。",
};

const levels = [
  {
    level: "1.0",
    label: "完全初學",
    badgeClass: "bg-[#E8F5E9] text-[#2E7D32]",
    description:
      "剛開始接觸網球，仍在學習基本握拍與擊球動作，尚未了解比賽規則。",
  },
  {
    level: "1.5",
    label: "初學",
    badgeClass: "bg-[#E8F5E9] text-[#2E7D32]",
    description:
      "有少量打球經驗，能勉力將球打回去，但無法控制方向，對比賽規則有初步認識。",
  },
  {
    level: "2.0",
    label: "入門",
    badgeClass: "bg-[#E3F2FD] text-[#1565C0]",
    description:
      "揮拍動作趨於完整，能與同級球友進行幾個慢速回合。正手缺乏方向控制，反手會刻意閃避，發球常有雙發失誤。（台灣 D 級下）",
  },
  {
    level: "2.5",
    label: "入門穩定",
    badgeClass: "bg-[#E3F2FD] text-[#1565C0]",
    description:
      "能進行慢速對打，了解單雙打基本站位。開始嘗試完整揮拍，截擊仍感不自在，難以覆蓋全場。（台灣 D 級）",
  },
  {
    level: "3.0",
    label: "中級入門",
    badgeClass: "bg-[#E3F2FD] text-[#1565C0]",
    description:
      "正反手趨於穩定，能進行中速對打，開始有戰術意識，能在雙打中配合隊友站位。（台灣 C 級下）",
  },
  {
    level: "3.5",
    label: "中級",
    badgeClass: "bg-[#E3F2FD] text-[#1565C0]",
    description:
      "能控制中速球的方向，開始使用上旋球與切削球，場地覆蓋明顯改善，雙打中能積極上網。（台灣 C 級）",
  },
  {
    level: "4.0",
    label: "中高級",
    badgeClass: "bg-[#FFF3E0] text-[#E65100]",
    description:
      "正反手底線穩定，能控制方向與深度，能執行截擊、高壓球與發球上網戰術，雙打配合成熟。偶爾因不夠耐心造成失誤。（台灣 B 級下）",
  },
  {
    level: "4.5",
    label: "高級",
    badgeClass: "bg-[#FFF3E0] text-[#E65100]",
    description:
      "充分運用旋轉與力量，能應對快速球，步法可靠，發球有力且落點準確，能根據對手靈活調整戰術。（台灣 B 級）",
  },
  {
    level: "5.0",
    label: "頂尖業餘",
    badgeClass: "bg-[#FFEBEE] text-[#C62828]",
    description:
      "預判能力強，常打出致勝球，截擊可直接得分，一二發皆有深度與旋轉，能參加業餘公開賽。（台灣 A 級下）",
  },
  {
    level: "5.5",
    label: "準職業",
    badgeClass: "bg-[#FFEBEE] text-[#C62828]",
    description:
      "頂尖大學校隊或國家隊培訓水準。技術全面，具備強烈的比賽意志力。這是台灣業餘球友的最高實際等級。（台灣 A 級）",
  },
  {
    level: "6.0",
    label: "職業",
    badgeClass: "bg-gold text-white",
    description:
      "已在全國性比賽取得名次，具備參加 ITF / ATP 挑戰賽的實力。此等級以上為職業球員範疇，一般業餘球友不適用。",
  },
  {
    level: "6.5–7.0",
    label: "世界級",
    badgeClass: "bg-gold text-white",
    description:
      "ATP / WTA 積分排名球員。7.0 為大滿貫級別的頂尖職業選手，靠比賽獎金維生。",
  },
];

export default function NtrpPage() {
  return (
    <section className="mx-auto max-w-md px-6 py-10">
      <div className="rounded-xl bg-parchment p-4">
        <h1 className="font-bold text-pine">📊 台灣球友常用等級對照</h1>
        <p className="mt-3 text-sm leading-7 text-ink">
          D 級：NTRP 2.5 以下　C 級：NTRP 2.6–3.5
          <br />
          B 級：NTRP 3.6–4.5　A 級：NTRP 4.6–5.5
          <br />
          公開賽等級：NTRP 5.6 以上
        </p>
        <p className="mt-3 text-sm leading-6 text-muted">
          NTRP 為美國網球協會（USTA）制定的國際通用分級制度，台灣球友習慣用
          A/B/C/D 換算，以下詳細說明。
        </p>
      </div>

      <p className="mt-3 text-sm leading-6 text-muted">
        ⚠️ NTRP 6.0 以上為職業球員等級，台灣業餘球友最高通常為 5.5。
        自我評估時建議誠實填寫，有助於找到合適的球友與教練。
      </p>

      <div className="mt-6 rounded-[2rem] bg-pine p-6 text-white shadow-lg">
        <p className="text-sm font-semibold text-gold">NTRP Guide</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight">
          你是幾級的球員？
        </h2>
        <p className="mt-4 leading-7 text-parchment">
          從初學到職業，找到你的程度，配對更精準。
        </p>
      </div>

      <div className="mt-6 space-y-3">
        {levels.map((item) => (
          <article
            key={item.level}
            className="rounded-[1.5rem] border border-parchment bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xl font-bold text-pine">NTRP {item.level}</h3>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${item.badgeClass}`}
              >
                {item.label}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted">
              {item.description}
            </p>
          </article>
        ))}
      </div>

      <Link
        href="/profile"
        className="mt-6 flex h-12 w-full items-center justify-center rounded-full bg-clay px-5 text-sm font-bold text-white"
      >
        ✅ 知道自己等級了，去更新個人資料 →
      </Link>
    </section>
  );
}
