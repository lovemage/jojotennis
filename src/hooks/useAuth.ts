import { useApp } from "@/context/AppContext";

export function useAuth() {
  const { fbUser, user, loading, refreshUser } = useApp();
  return { fbUser, user, loading, refreshUser, isLoggedIn: !!user };
}
