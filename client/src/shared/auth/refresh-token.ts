const STORAGE_KEY = "pillpoint-refresh-token";

// Plain localStorage, not Zustand - nothing needs to react to this value
// changing; it's only ever read by the axios refresh interceptor.
export const refreshTokenStorage = {
  get: () => localStorage.getItem(STORAGE_KEY),
  set: (token: string) => localStorage.setItem(STORAGE_KEY, token),
  clear: () => localStorage.removeItem(STORAGE_KEY),
};
