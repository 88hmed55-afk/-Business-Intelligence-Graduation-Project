import { api } from "@/lib/api";
import type { Paginated, Product, TopSeller } from "@/types";

export interface ProductCreatePayload {
  name: string;
  sku: string;
  barcode?: string;
  description?: string;
  category_id?: string;
  supplier_id?: string;
  unit_price?: string;
  cost_price?: string;
  reorder_level?: string;
  weight_kg?: string;
  is_active?: boolean;
}

export interface ProductUpdatePayload {
  name?: string;
  sku?: string;
  barcode?: string;
  description?: string;
  category_id?: string;
  supplier_id?: string;
  unit_price?: string;
  cost_price?: string;
  reorder_level?: string;
  weight_kg?: string;
  is_active?: boolean;
}

export interface ListProductsParams {
  page?: number;
  page_size?: number;
  search?: string;
  category_id?: string;
  supplier_id?: string;
  is_active?: boolean;
  min_price?: number;
  max_price?: number;
}

export const productsApi = {
  list: (params: ListProductsParams = {}) =>
    api.get<Paginated<Product>>("/products", { params }),
  get: (id: string) => api.get<Product>(`/products/${id}`),
  create: (payload: ProductCreatePayload) => api.post<Product>("/products", payload),
  update: (id: string, payload: ProductUpdatePayload) =>
    api.patch<Product>(`/products/${id}`, payload),
  remove: (id: string) => api.delete<{ message: string }>(`/products/${id}`),
  topSellers: (limit = 10) =>
    api.get<TopSeller[]>("/products/top-sellers", { params: { limit } }),
};
