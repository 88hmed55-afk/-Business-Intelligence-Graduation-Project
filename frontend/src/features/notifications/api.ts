import { api } from "@/lib/api";
import type { Notification, NotificationType, Paginated } from "@/types";

export interface NotificationCreatePayload {
  title: string;
  body?: string;
  notification_type?: NotificationType;
  data?: Record<string, unknown>;
  user_id?: string;
}

export interface ListNotificationsParams {
  page?: number;
  page_size?: number;
  is_read?: boolean;
}

export const notificationsApi = {
  list: (params: ListNotificationsParams = {}) =>
    api.get<Paginated<Notification>>("/notifications", { params }),
  get: (id: string) => api.get<Notification>(`/notifications/${id}`),
  create: (payload: NotificationCreatePayload) =>
    api.post<Notification>("/notifications", payload),
  markRead: (id: string) =>
    api.patch<Notification>(`/notifications/${id}/read`),
  markAllRead: () => api.post<{ marked: number }>("/notifications/read-all"),
  unreadCount: () => api.get<{ count: number }>("/notifications/unread-count"),
};
