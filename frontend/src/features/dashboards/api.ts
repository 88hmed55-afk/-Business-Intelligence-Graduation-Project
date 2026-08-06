import { api } from "@/lib/api";
import type { Dashboard, Paginated } from "@/types";

export interface DashboardCreatePayload {
  name: string;
  description?: string | null;
  is_public?: boolean;
  config?: Record<string, unknown>;
}

export interface DashboardUpdatePayload {
  name?: string;
  description?: string | null;
  config?: Record<string, unknown>;
  is_public?: boolean;
  is_favorite?: boolean;
}

export interface ListDashboardsParams {
  page?: number;
  page_size?: number;
  search?: string;
  is_favorite?: boolean;
}

export const dashboardsApi = {
  list: (params: ListDashboardsParams = {}) =>
    api.get<Paginated<Dashboard>>("/dashboards", { params }),

  get: (id: string) => api.get<Dashboard>(`/dashboards/${id}`),

  create: (payload: DashboardCreatePayload) => api.post<Dashboard>("/dashboards", payload),

  update: (id: string, payload: DashboardUpdatePayload) =>
    api.patch<Dashboard>(`/dashboards/${id}`, payload),

  toggleFavorite: (id: string) => api.post<Dashboard>(`/dashboards/${id}/favorite`),

  remove: (id: string) => api.delete<Dashboard>(`/dashboards/${id}`),
};
