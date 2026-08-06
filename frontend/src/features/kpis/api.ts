import { api } from "@/lib/api";
import type { Kpi, KpiCategory, Paginated } from "@/types";

export interface KpiCreatePayload {
  name: string;
  description?: string | null;
  category?: KpiCategory;
  formula?: string;
  target_value?: string | number | null;
  current_value?: string | number | null;
  unit?: string | null;
  trend?: "up" | "down" | "flat";
  dashboard_id?: string | null;
}

export interface KpiUpdatePayload {
  name?: string;
  description?: string | null;
  category?: KpiCategory;
  formula?: string;
  target_value?: string | number | null;
  current_value?: string | number | null;
  unit?: string | null;
  trend?: "up" | "down" | "flat";
  dashboard_id?: string | null;
}

export interface ListKpisParams {
  page?: number;
  page_size?: number;
  search?: string;
  category?: KpiCategory;
  dashboard_id?: string;
}

export const kpisApi = {
  list: (params: ListKpisParams = {}) => api.get<Paginated<Kpi>>("/kpis", { params }),

  get: (id: string) => api.get<Kpi>(`/kpis/${id}`),

  create: (payload: KpiCreatePayload) => api.post<Kpi>("/kpis", payload),

  update: (id: string, payload: KpiUpdatePayload) => api.patch<Kpi>(`/kpis/${id}`, payload),

  updateValue: (id: string, current_value: string | number) =>
    api.post<Kpi>(`/kpis/${id}/update-value`, { current_value }),

  remove: (id: string) => api.delete<Kpi>(`/kpis/${id}`),
};
