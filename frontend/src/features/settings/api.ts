import { api } from "@/lib/api";
import type { AppSetting, Paginated } from "@/types";

export interface SettingCreatePayload {
  key: string;
  value: Record<string, unknown>;
  group_name?: string;
  description?: string;
  is_public?: boolean;
}

export interface SettingUpdatePayload {
  value?: Record<string, unknown>;
  group_name?: string;
  description?: string;
  is_public?: boolean;
}

export interface ListSettingsParams {
  page?: number;
  page_size?: number;
  search?: string;
  group_name?: string;
}

export const settingsApi = {
  list: (params: ListSettingsParams = {}) =>
    api.get<Paginated<AppSetting>>("/settings", { params }),
  get: (id: string) => api.get<AppSetting>(`/settings/${id}`),
  getByKey: (key: string) => api.get<AppSetting>(`/settings/by-key/${key}`),
  create: (payload: SettingCreatePayload) => api.post<AppSetting>("/settings", payload),
  update: (id: string, payload: SettingUpdatePayload) =>
    api.patch<AppSetting>(`/settings/${id}`, payload),
  remove: (id: string) => api.delete<{ message: string }>(`/settings/${id}`),
};
