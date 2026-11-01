import axios, { type AxiosRequestConfig } from "axios";
import { refreshTokenStorage } from "@/shared/auth/refresh-token";
import { useSessionStore } from "@/shared/auth/session-store";
import i18n from "@/shared/config/i18n";

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

let refreshing: Promise<string> | null = null;

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    if (response?.status !== 401 || config._retried) {
      throw error;
    }
    config._retried = true;

    const refreshToken = refreshTokenStorage.get();
    if (!refreshToken) {
      useSessionStore.getState().clearSession();
      throw error;
    }

    refreshing ??= apiClient
      .post("/auth/refresh", { refreshToken })
      .then(({ data }) => {
        refreshTokenStorage.set(data.refreshToken);
        return data.accessToken as string;
      })
      .finally(() => {
        refreshing = null;
      });

    try {
      const accessToken = await refreshing;
      const { user } = useSessionStore.getState();
      if (user) useSessionStore.getState().setSession(user, accessToken);
      config.headers.Authorization = `Bearer ${accessToken}`;
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
