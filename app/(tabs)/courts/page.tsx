import PageHero from "@/components/PageHero";
import CourtsExplorer from "@/components/CourtsExplorer";
import { courts } from "@/data/courts";

export default function CourtsPage() {
  return (
    <section className="mx-auto max-w-md px-6 py-10">
      <PageHero
        title="找球場"
        description="搜尋全台網球場，一鍵查詢場地資訊與預約方式。"
      />
      <CourtsExplorer courts={courts} />
      <p className="mt-6 text-center text-sm text-muted">
        各球場預約請點擊球場卡片內的「前往預約」，將跳轉至各球場官方網站。
      </p>
    </section>
  );
}
