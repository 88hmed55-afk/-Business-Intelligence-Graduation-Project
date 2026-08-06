import { api } from "@/lib/api";

export interface BIKPIDetail {
  key: string;
  label: string;
  value: number;
  previous_value: number | null;
  change_pct: number | null;
  trend: string;
  format: string;
  icon: string | null;
}

export interface ExecutiveOverview {
  kpis: BIKPIDetail[];
  revenue_chart: Array<{ period: string; revenue: number; cumulative: number }>;
  profit_chart: Array<{ period: string; profit: number; cumulative: number }>;
  order_status: Record<string, number>;
  top_products: Array<{ name: string; value: number; secondary: number | null }>;
  top_customers: Array<{ name: string; value: number; orders: number | null }>;
  category_split: Array<{ name: string; value: number; percentage: number }>;
  monthly_trend: Array<{ period: string; revenue: number; profit: number }>;
}

export interface ForecastPoint {
  period: string;
  actual: number | null;
  predicted: number;
  lower_bound: number;
  upper_bound: number;
}

export interface ForecastResponse {
  metric: string;
  points: ForecastPoint[];
  trend: string;
  growth_pct: number;
  confidence: number;
}

export interface ComparisonPeriod {
  label: string;
  revenue: number;
  orders: number;
  profit: number;
  customers: number;
  avg_order_value: number;
  units_sold: number;
}

export interface ComparisonResponse {
  current: ComparisonPeriod;
  previous: ComparisonPeriod;
  changes: Record<string, number>;
}

export interface InsightItem {
  id: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  metric: string | null;
  change_pct: number | null;
  period: string | null;
}

export interface InsightsResponse {
  insights: InsightItem[];
  generated_at: string;
}

export interface AggregationBucket {
  label: string;
  value: number;
  count: number;
  percentage: number;
}

export interface AggregationResponse {
  dimension: string;
  buckets: AggregationBucket[];
  total: number;
}

export interface RankingItem {
  rank: number;
  id: string | null;
  name: string;
  value: number;
  secondary_value: number | null;
  change_pct: number | null;
}

export interface RankingResponse {
  dimension: string;
  items: RankingItem[];
  period: string | null;
}

export interface TrendDataPoint {
  period: string;
  value: number;
  cumulative: number;
}

export interface TrendResponse {
  metric: string;
  granularity: string;
  points: TrendDataPoint[];
  total: number;
  average: number;
  min_value: number;
  max_value: number;
}

export interface BIParams {
  date_from?: string;
  date_to?: string;
}

export const biApi = {
  overview: (params: BIParams = {}) =>
    api.get<ExecutiveOverview>("/bi/overview", { params }),

  forecast: (metric: string, periods: number, params: BIParams = {}) =>
    api.get<ForecastResponse>("/bi/forecast", { params: { metric, periods, ...params } }),

  compare: (params: BIParams = {}) =>
    api.get<ComparisonResponse>("/bi/compare", { params }),

  insights: (params: BIParams = {}) =>
    api.get<InsightsResponse>("/bi/insights", { params }),

  aggregate: (dimension: string, params: BIParams = {}) =>
    api.get<AggregationResponse>("/bi/aggregate", { params: { dimension, ...params } }),

  rankings: (dimension: string, params: BIParams = {}, limit = 10) =>
    api.get<RankingResponse>("/bi/rankings", { params: { dimension, limit, ...params } }),

  trend: (metric: string, granularity: string, params: BIParams = {}) =>
    api.get<TrendResponse>("/bi/trend", { params: { metric, granularity, ...params } }),
};
