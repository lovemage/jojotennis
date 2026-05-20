import { useApp } from "@/context/AppContext";

export function useMessages() {
  const { conversations, unreadTotal } = useApp();
  return { conversations, unreadTotal };
}
