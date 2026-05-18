import PageHero from "@/components/PageHero";

export default function CoachRegisterPage() {
  return (
    <section className="mx-auto max-w-md px-6 py-10">
      <PageHero
        eyebrow="Coach Register"
        title="免費登錄教練資訊"
        description="教練審核表單將在 Firebase 登入與後台審核串接後啟用。"
      />
      <div className="mt-6 rounded-[1.5rem] bg-white p-5 text-sm leading-7 text-muted ring-1 ring-parchment">
        目前已先完成找教練頁、學員需求頁與後台教練審核路由骨架。
      </div>
    </section>
  );
}
