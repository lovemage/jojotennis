type AdminModulePageProps = {
  title: string;
  description: string;
  actions: string[];
};

export default function AdminModulePage({
  title,
  description,
  actions,
}: AdminModulePageProps) {
  return (
    <section className="mx-auto max-w-md px-6 py-10">
      <div className="rounded-[2rem] bg-pine p-6 text-white shadow-lg">
        <p className="text-sm font-semibold text-gold">Admin</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-4 leading-7 text-parchment">{description}</p>
      </div>

      <div className="mt-6 space-y-3">
        {actions.map((action) => (
          <div
            key={action}
            className="rounded-[1.5rem] border border-parchment bg-white p-5 text-sm font-semibold leading-6 text-pine shadow-sm"
          >
            {action}
          </div>
        ))}
      </div>
    </section>
  );
}
