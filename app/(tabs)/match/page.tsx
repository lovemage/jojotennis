import PageHero from "@/components/PageHero";
import MatchBoard from "@/components/MatchBoard";

export default function MatchPage() {
  return (
    <section className="mx-auto max-w-md px-6 py-10">
      <PageHero
        title="揪球友"
        description="用等級、地點和可打時間找到合適的球友，讓臨打和固定練球更容易。"
      />

      <MatchBoard />
    </section>
  );
}
