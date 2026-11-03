import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { UserProfile } from "@/shared/api/auth-types";

interface SessionState {
  user: UserProfile | null;
  accessToken: string | null;
  setAccessToken: (accessToken: string) => void;
  setUser: (user: UserProfile) => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      setAccessToken: (accessToken) => set({ accessToken }),
      setUser: (user) => set({ user }),
      clearSession: () => set({ user: null, accessToken: null }),
    }),
    {
      name: "pillpoint-session",
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
