import { api } from "@/lib/api";
import type { Paginated, User, UserRole } from "@/types";

export interface UserCreatePayload {
  email: string;
  username: string;
  full_name: string;
  password: string;
  role?: UserRole;
}

export interface UserUpdatePayload {
  email?: string;
  username?: string;
  full_name?: string;
  role?: UserRole;
  is_active?: boolean;
  is_superuser?: boolean;
  password?: string;
}

export interface SelfUpdatePayload {
  email?: string;
  username?: string;
  full_name?: string;
}

export interface ListUsersParams {
  page?: number;
  page_size?: number;
  search?: string;
}

export const usersApi = {
  me: () => api.get<User>("/users/me"),
  updateMe: (payload: SelfUpdatePayload) => api.patch<User>("/users/me", payload),

  list: (params: ListUsersParams = {}) => api.get<Paginated<User>>("/users", { params }),

  get: (id: string) => api.get<User>(`/users/${id}`),

  create: (payload: UserCreatePayload) => api.post<User>("/users", payload),

  update: (id: string, payload: UserUpdatePayload) => api.patch<User>(`/users/${id}`, payload),

  remove: (id: string) => api.delete<User>(`/users/${id}`),
};
