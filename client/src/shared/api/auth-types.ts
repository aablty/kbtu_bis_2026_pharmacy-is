export type UserRole = "admin" | "pharmacist" | "cashier" | "customer";

export type Locale = "en" | "ru";

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface UserProfile {
  user_id: number;
  email: string;
  full_name: string | null;
  role: UserRole;
  preferred_locale: Locale;
  is_active: boolean;
}

export interface RegisterResponse {
  user_id: number;
  email: string;
  message: string;
}

export interface MessageResponse {
  message: string;
}
