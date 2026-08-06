import { api } from "@/lib/api";
import type { MessageResponse, TokenResponse, User } from "@/types";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RefreshPayload {
  refresh_token: string;
}

export interface ChangePasswordPayload {
  old_password: string;
  new_password: string;
}

export const authApi = {
  login: (payload: LoginPayload) => api.post<TokenResponse>("/auth/login", payload),
  refresh: (payload: RefreshPayload) => api.post<TokenResponse>("/auth/refresh", payload),
  me: () => api.get<User>("/auth/me"),
  logout: (refresh_token: string) =>
    api.post<MessageResponse>("/auth/logout", { refresh_token }),
  changePassword: (payload: ChangePasswordPayload) =>
    api.post<MessageResponse>("/auth/change-password", payload),
};
