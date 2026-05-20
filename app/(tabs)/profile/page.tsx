import ProfileDashboardContext from "@/components/ProfileDashboardContext";
import { courts } from "@/data/courts";
import { tennisLevels } from "@/data/tennisLevels";

export default function ProfilePage() {
  const cities = Array.from(new Set(courts.map((court) => court.city)));

  return (
    <section className="mx-auto max-w-md px-6 py-10">
      <ProfileDashboardContext cities={cities} tennisLevels={tennisLevels} />
    </section>
  );
}
