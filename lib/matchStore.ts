import type { MatchPost } from "@/data/matchPosts";

export const matchesStorageKey = "jojo_matches";
const legacyMatchesStorageKey = "jojo-tennis-match-posts";

export type StoredMatchPost = Omit<MatchPost, "status"> & {
  status: "open" | "almostFull" | "full" | "closed";
};

export function getMatches(defaultMatches: MatchPost[] = []) {
  if (typeof window === "undefined") {
    return defaultMatches as StoredMatchPost[];
  }

  const savedMatches =
    window.localStorage.getItem(matchesStorageKey) ??
    window.localStorage.getItem(legacyMatchesStorageKey);

  if (!savedMatches) {
    return defaultMatches as StoredMatchPost[];
  }

  return JSON.parse(savedMatches) as StoredMatchPost[];
}

export function saveMatches(matches: StoredMatchPost[]) {
  window.localStorage.setItem(matchesStorageKey, JSON.stringify(matches));
  window.dispatchEvent(new Event("jojo-matches-change"));
}

export function closeMatch(matchId: string, defaultMatches: MatchPost[] = []) {
  const nextMatches = getMatches(defaultMatches).map((match) =>
    match.id === matchId ? { ...match, status: "closed" as const } : match,
  );

  saveMatches(nextMatches);
  return nextMatches;
}
