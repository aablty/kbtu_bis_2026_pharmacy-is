import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface SessionUser {
  id: number;
  email: string;
  role: string;
}

interface SessionState {
  user: SessionUser | null;
  accessToken: string | null;
  setSession: (user: SessionUser, accessToken: string) => void;
  clearSession: () => void;
}

// Access token + user live in sessionStorage (cleared when the tab closes).
// The refresh token is handled separately, in localStorage - see refresh-token.ts.
export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      setSession: (user, accessToken) => set({ user, accessToken }),
      clearSession: () => set({ user: null, accessToken: null }),
    }),
    {
      name: "pillpoint-session",
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
