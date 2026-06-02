"use client";

import { useEffect, useMemo, useState } from "react";
import PageHero from "@/components/PageHero";
import CoachTabs from "@/components/CoachTabs";
import { coaches as seedCoaches } from "@/data/coaches";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import type { StudentNeed } from "@/data/coaches";
import type { StudentNeedRecord } from "@/context/AppContext";

type FirestoreCoach = {
  coachId: string;
  nickname?: string;
  city?: string;
  ntrpRange?: string;
  pricePerHour?: number;
  rating?: number;
  bio?: string;
  isDeleted?: boolean;
  isPublished?: boolean;
};

function toStudentNeed(post: Record<string, unknown> & { postId: string }): StudentNeed {
  return {
    id: post.postId,
    title: String(post.title ?? "學員找教練"),
    city: String(post.city ?? ""),
    district: String(post.district ?? ""),
    targetLevel: String(post.targetNtrp ?? post.targetLevel ?? ""),
    preferredTime: Array.isArray(post.preferTimes)
      ? (post.preferTimes as string[]).join("、")
      : String(post.preferredTime ?? ""),
    budget: String(post.budget ?? ""),
    intro: String(post.description ?? post.intro ?? ""),
  };
}

export default function CoachPageClient() {
  const [coaches, setCoaches] = useState(seedCoaches);
  const [studentPosts, setStudentPosts] = useState<StudentNeed[]>([]);
  const [loadingCoaches, setLoadingCoaches] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "coaches"),
      (snap) => {
        const rows = snap.docs
          .map((d) => ({ coachId: d.id, ...d.data() }) as FirestoreCoach)
          .filter((c) => c.isDeleted !== true && c.isPublished !== false)
          .map((c) => ({
            id: c.coachId,
            name: c.nickname ?? "教練",
            city: c.city ?? "",
            levelRange: c.ntrpRange ?? "",
            price: c.pricePerHour ?? 0,
            rating: c.rating ?? 0,
            tagline: (c.bio ?? "").slice(0, 40),
            bio: c.bio ?? "",
          }));
        setCoaches(rows.length > 0 ? rows : seedCoaches);
        setLoadingCoaches(false);
      },
      (err) => {
        console.error("coaches 讀取失敗：", err);
        setLoadingCoaches(false);
      },
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "student_posts"),
      (snap) => {
        const posts = snap.docs
          .map((d) => ({ postId: d.id, ...d.data() }) as Record<string, unknown> & { postId: string })
          .filter((p) => p.isDeleted !== true)
          .sort((a, b) => {
            const ta = (a.createdAt as { toMillis?: () => number })?.toMillis?.() ?? 0;
            const tb = (b.createdAt as { toMillis?: () => number })?.toMillis?.() ?? 0;
            return tb - ta;
          })
          .map((p) => toStudentNeed(p));
        console.log("學生需求更新，筆數：", posts.length);
        setStudentPosts(posts);
        setLoadingPosts(false);
      },
      (err) => {
        console.error("student_posts 讀取失敗：", err);
        setLoadingPosts(false);
      },
    );
    return () => unsub();
  }, []);

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
