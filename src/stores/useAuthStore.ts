import { create } from "zustand";
import type { User as FBUser } from "firebase/auth";

type AuthUser = {
  uid: string;
  email: string;
  nickname: string;
  ntrp: string;
  region: string;
  avatarUrl?: string;
  role?: string;
} | null;

type AuthStore = {
  fbUser: FBUser | null;
  user: AuthUser;
  loading: boolean;
  setAuth: (payload: { fbUser: FBUser | null; user: AuthUser; loading: boolean }) => void;
};

export const useAuthStore = create<AuthStore>((set) => ({
  fbUser: null,
  user: null,
  loading: true,
  setAuth: ({ fbUser, user, loading }) => set({ fbUser, user, loading }),
}));
