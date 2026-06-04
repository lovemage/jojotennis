"use client";

import { useMemo, useState } from "react";
import PageHero from "@/components/PageHero";
import CoachTabs from "@/components/CoachTabs";
import { coaches as seedCoaches } from "@/data/coaches";
import type { StudentNeed } from "@/data/coaches";
import type { StudentNeedRecord } from "@/context/AppContext";

export default function CoachPageClient() {
  const coaches = seedCoaches;
  const studentPosts: StudentNeed[] = [];
  const loadingCoaches = false;
  const loadingPosts = false;

  const studentNeedsForTabs: StudentNeedRecord[] = studentPosts.map((post) => ({
    id: post.id,
    ownerUid: "",
    ownerNickname: "",
    title: post.title,
    city: post.city,
    district: post.district,
    targetLevel: post.targetLevel,
    preferredTime: post.preferredTime,
    budget: post.budget,
    intro: post.intro,
    createdAt: 0,
    status: "active",
  }));

  const [activeTab, setActiveTab] = useState<"coaches" | "students">("coaches");
  const heroTabs = useMemo(
    () => [
      { id: "coaches" as const, label: "找教練" },
      { id: "students" as const, label: "找學生" },
    ],
    [],
  );

  return (
    <section className="mx-auto max-w-md overflow-hidden pb-8">
      <PageHero
        settingsKey="coach"
        eyebrow="Coach"
        title="找到屬於你的網球教練"
        description="依等級、地區、費用篩選，直接透過站內私訊聯繫教練"
        image="/images/hero/coach.png"
      >
        <div className="grid grid-cols-2 gap-3">
          {heroTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-full px-4 py-3 text-sm font-bold transition ${
                activeTab === tab.id
                  ? "bg-gold text-pine shadow-[0_12px_28px_rgba(201,168,76,0.25)]"
                  : "border border-white/25 bg-white/10 text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </PageHero>
      {loadingCoaches || loadingPosts ? (
        <div className="flex min-h-[200px] items-center justify-center text-sm text-muted">
          載入中...
        </div>
      ) : (
        <div className="mt-6 px-5">
          <CoachTabs
            coaches={coaches}
            studentNeeds={studentNeedsForTabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </div>
      )}
    </section>
  );
}
