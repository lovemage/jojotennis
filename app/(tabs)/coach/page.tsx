import PageHero from "@/components/PageHero";
import CoachTabs from "@/components/CoachTabs";
import { coaches, studentNeeds } from "@/data/coaches";

export default function CoachPage() {
  return (
    <section className="mx-auto max-w-md px-6 py-10">
      <PageHero
        eyebrow="Coach"
        title="找到屬於你的網球教練"
        description="依等級、地區、費用篩選，直接透過站內私訊聯繫教練"
      />
      <CoachTabs coaches={coaches} studentNeeds={studentNeeds} />
    </section>
  );
}
