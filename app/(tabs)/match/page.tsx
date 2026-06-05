import MatchBoard from "@/components/MatchBoard";

type Search = {
  city?: string | string[];
  title?: string | string[];
  time?: string | string[];
};

export default function MatchPage({ searchParams }: { searchParams?: Search }) {
  const city = typeof searchParams?.city === "string" ? searchParams.city : "";
  const title = typeof searchParams?.title === "string" ? searchParams.title : "";
  const time = typeof searchParams?.time === "string" ? searchParams.time : "";

  return (
    <section className="mx-auto max-w-md overflow-hidden pb-8">
      <MatchBoard
        initialCityFilter={city}
        initialTitleFilter={title}
        initialTimeFilter={time}
      />
    </section>
  );
}
