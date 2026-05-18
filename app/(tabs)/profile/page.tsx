import ProfileDashboardV2 from "@/components/ProfileDashboardV2";
import { courts } from "@/data/courts";
import { matchPosts } from "@/data/matchPosts";
import { tennisLevels } from "@/data/tennisLevels";

export default function ProfilePage() {
  const cities = Array.from(new Set(courts.map((court) => court.city)));

  return (
    <section className="mx-auto max-w-md px-6 py-10">
      <ProfileDashboardV2
        cities={cities}
        tennisLevels={tennisLevels}
        defaultMatches={matchPosts}
      />
    </section>
  );
}
