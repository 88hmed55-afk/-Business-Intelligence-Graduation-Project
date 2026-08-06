import { api } from "@/lib/api";
import type { Paginated, Permission, Role, RoleDetail } from "@/types";

export interface RoleCreatePayload {
  name: string;
  description?: string;
  permission_ids?: string[];
}

export interface RoleUpdatePayload {
  description?: string;
  permission_ids?: string[];
}

export interface ListRolesParams {
  page?: number;
  page_size?: number;
  search?: string;
}

export const rolesApi = {
  list: (params: ListRolesParams = {}) =>
    api.get<Paginated<Role>>("/roles", { params }),
  get: (id: string) => api.get<RoleDetail>(`/roles/${id}`),
  create: (payload: RoleCreatePayload) => api.post<Role>("/roles", payload),
  update: (id: string, payload: RoleUpdatePayload) =>
    api.patch<Role>(`/roles/${id}`, payload),
  remove: (id: string) => api.delete<{ message: string }>(`/roles/${id}`),
  assignPermissions: (id: string, permissionIds: string[]) =>
    api.post<RoleDetail>(`/roles/${id}/permissions`, { permission_ids: permissionIds }),
};

export const permissionsApi = {
  list: (params: { page?: number; page_size?: number; search?: string; module?: string } = {}) =>
    api.get<Paginated<Permission>>("/permissions", { params }),
};
