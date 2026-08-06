import { api } from "@/lib/api";
import type { Paginated, Supplier } from "@/types";

export interface SupplierCreatePayload {
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  tax_id?: string;
  website?: string;
  is_active?: boolean;
}

export interface SupplierUpdatePayload {
  name?: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  tax_id?: string;
  website?: string;
  is_active?: boolean;
}

export interface ListSuppliersParams {
  page?: number;
  page_size?: number;
  search?: string;
}

export const suppliersApi = {
  list: (params: ListSuppliersParams = {}) =>
    api.get<Paginated<Supplier>>("/suppliers", { params }),
  get: (id: string) => api.get<Supplier>(`/suppliers/${id}`),
  create: (payload: SupplierCreatePayload) => api.post<Supplier>("/suppliers", payload),
  update: (id: string, payload: SupplierUpdatePayload) =>
    api.patch<Supplier>(`/suppliers/${id}`, payload),
  remove: (id: string) => api.delete<{ message: string }>(`/suppliers/${id}`),
};
