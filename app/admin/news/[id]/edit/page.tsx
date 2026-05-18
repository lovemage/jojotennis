import { notFound } from "next/navigation";
import NewsEditorForm from "@/components/NewsEditorForm";
import { newsArticles } from "@/data/news";

type EditNewsPageProps = {
  params: {
    id: string;
  };
};

export default function EditNewsPage({ params }: EditNewsPageProps) {
  const article = newsArticles.find((item) => item.id === params.id);

  if (!article) {
    notFound();
  }

  return (
    <section className="mx-auto max-w-md px-6 py-10">
      <div className="rounded-[2rem] bg-pine p-6 text-white shadow-lg">
        <p className="text-sm font-semibold text-gold">Admin</p>
        <h1 className="mt-2 text-3xl font-bold">編輯文章</h1>
        <p className="mt-4 leading-7 text-parchment">{article.title}</p>
      </div>
      <NewsEditorForm article={article} />
    </section>
  );
}
