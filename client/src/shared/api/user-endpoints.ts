import type { UserProfile } from "./auth-types";
import { apiClient } from "./client";

export const userEndpoints = {
  update: (body: { full_name: string | null }) =>
    apiClient.patch<UserProfile>("/users/me", body).then((r) => r.data),
  changePassword: (body: { current_password: string; new_password: string }) =>
    apiClient
      .post<{ message: string }>("/users/me/password", body)
      .then((r) => r.data),
};
