import type {
  MessageResponse,
  RegisterResponse,
  TokenPair,
  UserProfile,
} from "./auth-types";
import { apiClient } from "./client";

export const authEndpoints = {
  register: (body: { email: string; password: string; full_name: string }) =>
    apiClient
      .post<RegisterResponse>("/auth/register", body)
      .then((r) => r.data),
  verifyEmail: (body: { email: string; code: string }) =>
    apiClient
      .post<MessageResponse>("/auth/verify-email", body)
      .then((r) => r.data),
  resendVerification: (body: { email: string }) =>
    apiClient
      .post<MessageResponse>("/auth/resend-verification", body)
      .then((r) => r.data),
  login: (body: { email: string; password: string }) =>
    apiClient.post<TokenPair>("/auth/login", body).then((r) => r.data),
  loginWithGoogle: (body: { id_token: string }) =>
    apiClient.post<TokenPair>("/auth/google", body).then((r) => r.data),
  forgotPassword: (body: { email: string }) =>
    apiClient
      .post<MessageResponse>("/auth/forgot-password", body)
      .then((r) => r.data),
  resetPassword: (body: {
    email: string;
    code: string;
    new_password: string;
  }) =>
    apiClient
      .post<MessageResponse>("/auth/reset-password", body)
      .then((r) => r.data),
  me: () => apiClient.get<UserProfile>("/users/me").then((r) => r.data),
};
