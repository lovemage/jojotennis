import { create } from "zustand";

type NotificationStore = {
  unreadTotal: number;
  setUnreadTotal: (count: number) => void;
};

export const useNotificationStore = create<NotificationStore>((set) => ({
  unreadTotal: 0,
  setUnreadTotal: (count) => set({ unreadTotal: count }),
}));
