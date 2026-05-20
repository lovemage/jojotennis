import NewsEditorForm from "@/components/NewsEditorForm";
import AdminGuard from "@/components/AdminGuard";

export default function NewNewsPage() {
  return (
    <AdminGuard>
      <section className="mx-auto max-w-md px-6 py-10">
      <div className="rounded-[2rem] bg-pine p-6 text-white shadow-lg">
        <p className="text-sm font-semibold text-gold">Admin</p>
        <h1 className="mt-2 text-3xl font-bold">新增文章</h1>
        <p className="mt-4 leading-7 text-parchment">
          建立新聞、活動、品牌與新品文章。
        </p>
      </div>
      <NewsEditorForm />
      </section>
    </AdminGuard>
  );
}
