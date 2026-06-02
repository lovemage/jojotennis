"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  subscribePageHeroSettings,
  type PageHeroKey,
  type PageHeroSetting,
} from "@/lib/pageHeroSettings";

type PageHeroProps = {
  settingsKey?: PageHeroKey;
  eyebrow?: string;
  title: string;
  description: string;
  image?: string;
  children?: ReactNode;
};

export default function PageHero({
  settingsKey,
  eyebrow,
  title,
  description,
  image,
  children,
}: PageHeroProps) {
  const [managedHero, setManagedHero] = useState<PageHeroSetting | null>(null);
  const hero = managedHero ?? { eyebrow: eyebrow ?? "", title, description, image: image ?? "" };

  useEffect(() => {
    if (!settingsKey) {
      setManagedHero(null);
      return;
    }

    return subscribePageHeroSettings((settings) => {
      setManagedHero(settings[settingsKey]);
    });
  }, [settingsKey]);

  return (
    <div className="relative flex min-h-[22.75rem] flex-col justify-end overflow-hidden bg-pine text-white shadow-[0_20px_60px_rgba(30,61,47,0.18)]">
      {hero.image ? (
        <>
          <img
            src={hero.image}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-pine/70 via-pine/42 to-pine/92" />
        </>
      ) : null}
      <div className="relative px-5 pb-6 pt-7">
        {hero.eyebrow ? (
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-gold">{hero.eyebrow}</p>
        ) : null}
        <h1 className="mt-2 text-3xl font-black tracking-tight">{hero.title}</h1>
        <p className="mt-4 text-sm leading-7 text-parchment">{hero.description}</p>
        {children ? <div className="mt-5">{children}</div> : null}
      </div>
    </div>
  );
}
