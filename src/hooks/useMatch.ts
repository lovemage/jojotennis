import { useApp } from "@/context/AppContext";

export function useMatch() {
  const { matches } = useApp();
  return { matches, openMatches: matches.filter((m) => m.status === "open" && !m.isDeleted) };
}
