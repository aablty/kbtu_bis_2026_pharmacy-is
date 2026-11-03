import { authEndpoints } from "@/shared/api/auth-endpoints";
import type { TokenPair } from "@/shared/api/auth-types";
import { refreshTokens } from "@/shared/api/client";
import { refreshTokenStorage } from "./refresh-token";
import { useSessionStore } from "./session-store";

export async function establishSession(tokens: TokenPair): Promise<void> {
  refreshTokenStorage.set(tokens.refresh_token);
  useSessionStore.getState().setAccessToken(tokens.access_token);
  try {
    useSessionStore.getState().setUser(await authEndpoints.me());
  } catch (error) {
    endSession();
    throw error;
  }
}

export async function restoreSession(): Promise<void> {
  const refreshToken = refreshTokenStorage.get();
  if (!refreshToken) return;
  try {
    await refreshTokens(refreshToken);
    useSessionStore.getState().setUser(await authEndpoints.me());
  } catch {
    endSession();
  }
}

export function endSession(): void {
  refreshTokenStorage.clear();
  useSessionStore.getState().clearSession();
}
