"use client";

import { useEffect, useState } from "react";
import PageHero from "@/components/PageHero";
import ClubExplorer from "@/components/ClubExplorer";
import { clubs as seedClubs, type Club } from "@/data/clubs";
import { subscribeToClubs } from "@/lib/clubService";
import type { Club as SchemaClub } from "@/lib/schema";

function toUiClub(data: SchemaClub & { clubId: string }): Club {
  return {
    id: data.clubId,
    name: data.name,
    city: data.city,
    baseCourt: data.venue,
    levelRange: data.ntrpLevels?.join("、") || "不限",
    schedule: data.schedule,
    memberCount: data.memberCount ?? 0,
    tags: data.types ?? [],
    description: data.description,
  };
}

export default function ClubPageClient() {
  const [clubs, setClubs] = useState<Club[]>(seedClubs);

  useEffect(() => {
    const unsubscribe = subscribeToClubs((liveClubs) => {
      setClubs(
        liveClubs.length > 0 ? liveClubs.map((club) => toUiClub(club)) : seedClubs,
      );
    });
    return unsubscribe;
  }, []);

  return (
    <section className="mx-auto max-w-md overflow-hidden pb-8">
      <PageHero
        settingsKey="clubs"
        eyebrow="Clubs"
        title="社團"
        description="探索地區社團、固定團練與球隊資訊，找到長期一起打球的夥伴。"
      />
      <div className="mt-6 px-5">
        <ClubExplorer clubs={clubs} />
      </div>
    </section>
  );
}
