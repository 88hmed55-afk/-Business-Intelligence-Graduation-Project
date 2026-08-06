import { api } from "@/lib/api";
import type { Customer, CustomerStatus, Paginated } from "@/types";

export interface CustomerCreatePayload {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
  city?: string;
  country?: string;
  status?: CustomerStatus;
  notes?: string;
}

export interface CustomerUpdatePayload {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
  city?: string;
  country?: string;
  status?: CustomerStatus;
  notes?: string;
}

export interface ListCustomersParams {
  page?: number;
  page_size?: number;
  search?: string;
  status?: CustomerStatus;
  country?: string;
}

export const customersApi = {
  list: (params: ListCustomersParams = {}) =>
    api.get<Paginated<Customer>>("/customers", { params }),
  get: (id: string) => api.get<Customer>(`/customers/${id}`),
  create: (payload: CustomerCreatePayload) => api.post<Customer>("/customers", payload),
  update: (id: string, payload: CustomerUpdatePayload) =>
    api.patch<Customer>(`/customers/${id}`, payload),
  remove: (id: string) => api.delete<{ message: string }>(`/customers/${id}`),
  restore: (id: string) => api.post<Customer>(`/customers/${id}/restore`),
};
