import { api } from "@/lib/api";
import type { ActivityAction, ActivityLog, Paginated } from "@/types";

export interface ListActivityLogsParams {
  page?: number;
  page_size?: number;
  user_id?: string;
  module?: string;
  action?: ActivityAction;
  date_from?: string;
  date_to?: string;
}

export const activityLogsApi = {
  list: (params: ListActivityLogsParams = {}) =>
    api.get<Paginated<ActivityLog>>("/activity-logs", { params }),
  get: (id: string) => api.get<ActivityLog>(`/activity-logs/${id}`),
};
