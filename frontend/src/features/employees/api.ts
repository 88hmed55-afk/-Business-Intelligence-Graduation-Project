import { api } from "@/lib/api";
import type { Employee, EmployeeStatus, Paginated } from "@/types";

export interface EmployeeCreatePayload {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  department: string;
  position: string;
  salary?: string;
  hire_date: string;
  status?: EmployeeStatus;
  manager_id?: string;
  address?: string;
  city?: string;
}

export interface EmployeeUpdatePayload {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  department?: string;
  position?: string;
  salary?: string;
  hire_date?: string;
  status?: EmployeeStatus;
  manager_id?: string;
  address?: string;
  city?: string;
}

export interface ListEmployeesParams {
  page?: number;
  page_size?: number;
  search?: string;
  department?: string;
  status?: EmployeeStatus;
}

export const employeesApi = {
  list: (params: ListEmployeesParams = {}) =>
    api.get<Paginated<Employee>>("/employees", { params }),
  get: (id: string) => api.get<Employee>(`/employees/${id}`),
  create: (payload: EmployeeCreatePayload) => api.post<Employee>("/employees", payload),
  update: (id: string, payload: EmployeeUpdatePayload) =>
    api.patch<Employee>(`/employees/${id}`, payload),
  remove: (id: string) => api.delete<{ message: string }>(`/employees/${id}`),
  departments: () => api.get<string[]>("/employees/departments"),
};
