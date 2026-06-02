import type { ReactNode } from "react";

type PageHeroProps = {
  eyebrow?: string;
  title: string;
  description: string;
  image?: string;
  children?: ReactNode;
};

export default function PageHero({
  eyebrow,
  title,
  description,
  image,
  children,
}: PageHeroProps) {
  return (
    <div className="relative flex min-h-[22.75rem] flex-col justify-end overflow-hidden bg-pine text-white shadow-[0_20px_60px_rgba(30,61,47,0.18)]">
      {image ? (
        <>
          <img
            src={image}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-pine/70 via-pine/42 to-pine/92" />
        </>
      ) : null}
      <div className="relative px-5 pb-6 pt-7">
        {eyebrow ? (
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-gold">{eyebrow}</p>
        ) : null}
        <h1 className="mt-2 text-3xl font-black tracking-tight">{title}</h1>
        <p className="mt-4 text-sm leading-7 text-parchment">{description}</p>
        {children ? <div className="mt-5">{children}</div> : null}
      </div>
    </div>
  );
}
