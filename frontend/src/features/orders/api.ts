import { api } from "@/lib/api";
import type {
  Inventory,
  InventoryMovementRecord,
  Order,
  OrderStatus,
  Paginated,
  Payment,
} from "@/types";

export interface OrderItemPayload {
  product_id: string;
  quantity: string;
  unit_price?: string;
  discount_amount?: string;
}

export interface OrderCreatePayload {
  customer_id: string;
  status?: OrderStatus;
  currency?: string;
  shipping_fee?: string;
  notes?: string;
  items: OrderItemPayload[];
}

export interface OrderUpdatePayload {
  customer_id?: string;
  status?: OrderStatus;
  currency?: string;
  shipping_fee?: string;
  notes?: string;
}

export interface ListOrdersParams {
  page?: number;
  page_size?: number;
  search?: string;
  customer_id?: string;
  status?: OrderStatus;
  payment_status?: string;
  date_from?: string;
  date_to?: string;
}

export interface PaymentPayload {
  order_id: string;
  amount: string;
  method: string;
  status?: string;
  transaction_id?: string;
  paid_at?: string;
  notes?: string;
}

export interface PaymentUpdatePayload {
  amount?: string;
  method?: string;
  status?: string;
  transaction_id?: string;
  paid_at?: string;
  notes?: string;
}

export const ordersApi = {
  list: (params: ListOrdersParams = {}) =>
    api.get<Paginated<Order>>("/orders", { params }),
  get: (id: string) => api.get<Order>(`/orders/${id}`),
  create: (payload: OrderCreatePayload) => api.post<Order>("/orders", payload),
  update: (id: string, payload: OrderUpdatePayload) =>
    api.patch<Order>(`/orders/${id}`, payload),
  remove: (id: string) => api.delete<{ message: string }>(`/orders/${id}`),
};

export const inventoryApi = {
  list: (params: { page?: number; page_size?: number; search?: string; warehouse?: string; low_stock?: boolean } = {}) =>
    api.get<Paginated<Inventory>>("/inventory", { params }),
  lowStock: (limit = 50) =>
    api.get<Inventory[]>("/inventory/low-stock", { params: { limit } }),
  getByProduct: (productId: string) => api.get<Inventory>(`/inventory/products/${productId}`),
  adjust: (productId: string, payload: { delta: string; movement_type: string; reference?: string; note?: string }) =>
    api.post<Inventory>(`/inventory/products/${productId}/adjust`, payload),
  movements: (params: { page?: number; page_size?: number; product_id?: string; movement_type?: string } = {}) =>
    api.get<Paginated<InventoryMovementRecord>>("/inventory/movements", { params }),
};

export const paymentsApi = {
  list: (params: {
    page?: number;
    page_size?: number;
    search?: string;
    order_id?: string;
    status?: string;
    method?: string;
    date_from?: string;
    date_to?: string;
  } = {}) => api.get<Paginated<Payment>>("/payments", { params }),
  get: (id: string) => api.get<Payment>(`/payments/${id}`),
  create: (payload: PaymentPayload) => api.post<Payment>("/payments", payload),
  update: (id: string, payload: PaymentUpdatePayload) =>
    api.patch<Payment>(`/payments/${id}`, payload),
  remove: (id: string) => api.delete<{ message: string }>(`/payments/${id}`),
};
