import PageHero from "@/components/PageHero";
import ClubExplorer from "@/components/ClubExplorer";
import { clubs } from "@/data/clubs";

export default function ClubPage() {
  return (
    <section className="mx-auto max-w-md px-6 py-10">
      <PageHero
        title="社團"
        description="探索地區社團、固定團練與球隊資訊，找到長期一起打球的夥伴。"
      />

      <ClubExplorer clubs={clubs} />
    </section>
  );
}
