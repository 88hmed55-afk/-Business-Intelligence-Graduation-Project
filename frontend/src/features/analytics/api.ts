import { api } from "@/lib/api";
import type {
  AnalyticsOverview,
  DashboardSummaryItem,
  PerformanceItem,
  TrendPoint,
} from "@/types";

export const analyticsApi = {
  overview: () => api.get<AnalyticsOverview>("/analytics/overview"),

  trends: (limit = 12) => api.get<TrendPoint[]>("/analytics/trends", { params: { limit } }),

  performance: (limit = 10) =>
    api.get<PerformanceItem[]>("/analytics/performance", { params: { limit } }),

  dashboardSummary: (limit = 10) =>
    api.get<DashboardSummaryItem[]>("/analytics/dashboard-summary", { params: { limit } }),
};
