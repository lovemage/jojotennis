import { create } from "zustand";

type UiStore = {
  navHidden: boolean;
  setNavHidden: (hidden: boolean) => void;
  announcementHeight: number;
  setAnnouncementHeight: (height: number) => void;
};

export const useUiStore = create<UiStore>((set) => ({
  navHidden: false,
  setNavHidden: (hidden) => set({ navHidden: hidden }),
  announcementHeight: 0,
  setAnnouncementHeight: (height) => set({ announcementHeight: height }),
}));
