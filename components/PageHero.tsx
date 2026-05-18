type PageHeroProps = {
  eyebrow?: string;
  title: string;
  description: string;
};

export default function PageHero({
  eyebrow,
  title,
  description,
}: PageHeroProps) {
  return (
    <div className="rounded-[2rem] bg-pine p-6 text-white shadow-lg">
      {eyebrow ? (
        <p className="text-sm font-semibold text-gold">{eyebrow}</p>
      ) : null}
      <h1 className="mt-2 text-3xl font-bold tracking-tight">{title}</h1>
      <p className="mt-4 leading-7 text-parchment">{description}</p>
    </div>
  );
}
