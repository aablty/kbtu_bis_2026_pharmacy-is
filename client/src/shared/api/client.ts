import axios, { type AxiosRequestConfig } from "axios";
import { refreshTokenStorage } from "@/shared/auth/refresh-token";
import { useSessionStore } from "@/shared/auth/session-store";
import i18n from "@/shared/config/i18n";
import type { TokenPair } from "./auth-types";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000",
});

apiClient.interceptors.request.use((config) => {
  const { accessToken } = useSessionStore.getState();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  config.headers["Accept-Language"] = i18n.language;
  return config;
});

let refreshing: Promise<TokenPair> | null = null;

function refreshTokens(refreshToken: string): Promise<TokenPair> {
  refreshing ??= axios
    .post<TokenPair>(
      `${apiClient.defaults.baseURL}/auth/refresh`,
      { refresh_token: refreshToken },
      { headers: { "Accept-Language": i18n.language } },
    )
    .then(({ data }) => {
      refreshTokenStorage.set(data.refresh_token);
      useSessionStore.getState().setAccessToken(data.access_token);
      return data;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    if (
      response?.status !== 401 ||
      config._retried ||
      config.url?.startsWith("/auth/")
    ) {
      throw error;
    }
    config._retried = true;

    const refreshToken = refreshTokenStorage.get();
    if (!refreshToken) {
      useSessionStore.getState().clearSession();
      throw error;
    }

    try {
      const tokens = await refreshTokens(refreshToken);
      config.headers.Authorization = `Bearer ${tokens.access_token}`;
      return apiClient(config);
    } catch (refreshError) {
      useSessionStore.getState().clearSession();
      refreshTokenStorage.clear();
      throw refreshError;
    }
  },
);

// orval's generated hooks call this directly - unwraps AxiosResponse to
// the plain data payload the generated types expect.
export const apiMutator = <T>(config: AxiosRequestConfig): Promise<T> =>
  apiClient(config).then(({ data }) => data);

export { refreshTokens };
