import { api } from "@/lib/api";
import type { Category, Paginated } from "@/types";

export interface CategoryCreatePayload {
  name: string;
  description?: string;
  parent_id?: string;
  sort_order?: number;
}

export interface CategoryUpdatePayload {
  name?: string;
  description?: string;
  parent_id?: string;
  sort_order?: number;
}

export interface ListCategoriesParams {
  page?: number;
  page_size?: number;
  search?: string;
}

export const categoriesApi = {
  list: (params: ListCategoriesParams = {}) =>
    api.get<Paginated<Category>>("/categories", { params }),
  get: (id: string) => api.get<Category>(`/categories/${id}`),
  create: (payload: CategoryCreatePayload) => api.post<Category>("/categories", payload),
  update: (id: string, payload: CategoryUpdatePayload) =>
    api.patch<Category>(`/categories/${id}`, payload),
  remove: (id: string) => api.delete<{ message: string }>(`/categories/${id}`),
};
