"use client";

import { useEffect, useState } from "react";
import PageHero from "@/components/PageHero";
import CoachTabs from "@/components/CoachTabs";
import { coaches as seedCoaches } from "@/data/coaches";
import { subscribeToCoaches, type UiCoach } from "@/lib/coachService";

export default function CoachPageClient() {
  const [coaches, setCoaches] = useState(seedCoaches);

  useEffect(() => {
    const unsubscribe = subscribeToCoaches((liveCoaches) => {
      if (liveCoaches.length > 0) {
        setCoaches(
          liveCoaches.map((coach: UiCoach) => ({
            id: coach.id,
            name: coach.name,
            city: coach.city,
            levelRange: coach.levelRange,
            price: coach.price,
            rating: coach.rating,
            tagline: coach.tagline,
            bio: coach.bio,
          })),
        );
      }
    });
    return unsubscribe;
  }, []);

  return (
    <section className="mx-auto max-w-md px-6 py-10">
      <PageHero
        eyebrow="Coach"
        title="找到屬於你的網球教練"
        description="依等級、地區、費用篩選，直接透過站內私訊聯繫教練"
      />
      <CoachTabs coaches={coaches} studentNeeds={[]} />
    </section>
  );
}
