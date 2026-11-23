import type { UserProfile, UserSearchResult } from "./auth-types";
import { apiClient } from "./client";

export const userEndpoints = {
  update: (body: { full_name: string | null }) =>
    apiClient.patch<UserProfile>("/users/me", body).then((r) => r.data),
  changePassword: (body: { current_password: string; new_password: string }) =>
    apiClient
      .post<{ message: string }>("/users/me/password", body)
      .then((r) => r.data),
  search: (q: string, limit = 10) =>
    apiClient
      .get<UserSearchResult[]>("/users/search", { params: { q, limit } })
      .then((r) => r.data),
};
