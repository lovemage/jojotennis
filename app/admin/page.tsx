import PageHero from "@/components/PageHero";
import { clubs } from "@/data/clubs";
import { courts } from "@/data/courts";
import { matchPosts } from "@/data/matchPosts";
import { newsArticles } from "@/data/news";

export default function AdminPage() {
  const bookableCourts = courts.filter(
    (court) => court.bookingStatus === "bookable",
  ).length;
  const adminStats = [
    { label: "會員數", value: "0" },
    { label: "約球數", value: matchPosts.length.toString() },
    { label: "社團數", value: clubs.length.toString() },
    { label: "新聞數", value: newsArticles.length.toString() },
    { label: "球場資料", value: courts.length.toString() },
    { label: "可預訂球場", value: bookableCourts.toString() },
  ];
  const modules = [
    ["/admin/courts", "球場管理"],
    ["/admin/users", "會員管理"],
    ["/admin/matches", "約球管理"],
    ["/admin/clubs", "社團管理"],
    ["/admin/pending", "待審核球場"],
    ["/admin/coaches", "教練管理"],
    ["/admin/news", "新聞管理"],
  ];
  const nextTasks = [
    "接 Firebase Auth：登入後才能建立約球與社團",
    "接 Firestore：把球場、約球、社團從靜態資料改成資料庫",
    "建立資料審核狀態：待確認、已驗證、需更新",
    "補管理操作：新增、編輯、下架球場資料",
  ];

  return (
    <section className="mx-auto max-w-md px-6 py-10">
      <PageHero
        eyebrow="Admin"
        title="管理後台"
        description="後續可在這裡管理球場資料、社團內容與使用者回報。"
      />

      <div className="mt-6 grid grid-cols-2 gap-3">
        {adminStats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl bg-white p-4 ring-1 ring-parchment"
          >
            <p className="text-2xl font-bold text-pine">{stat.value}</p>
            <p className="mt-1 text-xs font-medium text-muted">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-[1.5rem] bg-clay p-5 text-white">
        <p className="text-sm font-semibold text-gold">目前狀態</p>
        <p className="mt-2 leading-7 text-ivory">
          目前是可展示的前端資料版，資料已結構化，下一階段可接 Firebase
          Auth Custom Claims role: admin 與 Firestore。
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        {modules.map(([href, label]) => (
          <a
            key={href}
            href={href}
            className="rounded-2xl bg-white p-4 text-sm font-bold text-pine ring-1 ring-parchment"
          >
            {label}
          </a>
        ))}
      </div>

      <div className="mt-6 rounded-[1.5rem] border border-parchment bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-clay">下一批後台任務</p>
        <div className="mt-4 space-y-3">
          {nextTasks.map((task) => (
            <div
              key={task}
              className="rounded-2xl bg-ivory p-4 text-sm font-medium leading-6 text-pine ring-1 ring-parchment"
            >
              {task}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-[1.5rem] border border-parchment bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-clay">資料健康度</p>
        <div className="mt-4 space-y-3 text-sm leading-6 text-muted">
          <p>球場資料已匯入 Excel 原始欄位，包含費用、照明、預約方式。</p>
          <p>網路補查來源已獨立放在 `bookingSources`，避免混入未驗證資料。</p>
          <p>約球與社團目前是種子資料，可作為 Firestore schema 雛形。</p>
        </div>
      </div>
    </section>
  );
}
