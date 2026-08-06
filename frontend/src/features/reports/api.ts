import { api, http } from "@/lib/api";
import type {
  CommerceOverview,
  CustomerReportRow,
  InventoryReportRow,
  MonthlyReportRow,
  Paginated,
  ProductReportRow,
  ProfitReportRow,
  Report,
  ReportExportFormat,
  ReportResponse,
  ReportStatus,
  SalesReportRow,
  YearlyReportRow,
} from "@/types";

export interface ReportCreatePayload {
  name: string;
  description?: string;
  query: string;
  schedule?: string;
  status: ReportStatus;
}

export interface ReportUpdatePayload {
  name?: string;
  description?: string;
  query?: string;
  schedule?: string;
  status?: ReportStatus;
}

export const reportsApi = {
  list: (params: { page?: number; page_size?: number; search?: string; status?: ReportStatus } = {}) =>
    api.get<Paginated<Report>>("/reports", { params }),
  get: (id: string) => api.get<Report>(`/reports/${id}`),
  create: (payload: ReportCreatePayload) => api.post<Report>("/reports", payload),
  update: (id: string, payload: ReportUpdatePayload) => api.patch<Report>(`/reports/${id}`, payload),
  publish: (id: string) => api.post<Report>(`/reports/${id}/publish`),
  archive: (id: string) => api.post<Report>(`/reports/${id}/archive`),
  remove: (id: string) => api.delete<{ message: string }>(`/reports/${id}`),
};

export const businessReportsApi = {
  sales: (dateFrom: string, dateTo: string) =>
    api.get<ReportResponse<SalesReportRow>>("/business/reports/sales", {
      params: { date_from: dateFrom, date_to: dateTo },
    }),
  profit: (dateFrom: string, dateTo: string) =>
    api.get<ReportResponse<ProfitReportRow>>("/business/reports/profit", {
      params: { date_from: dateFrom, date_to: dateTo },
    }),
  customers: (dateFrom: string, dateTo: string, limit = 100) =>
    api.get<ReportResponse<CustomerReportRow>>("/business/reports/customers", {
      params: { date_from: dateFrom, date_to: dateTo, limit },
    }),
  products: (dateFrom: string, dateTo: string) =>
    api.get<ReportResponse<ProductReportRow>>("/business/reports/products", {
      params: { date_from: dateFrom, date_to: dateTo },
    }),
  inventory: () =>
    api.get<ReportResponse<InventoryReportRow>>("/business/reports/inventory"),
  monthly: (dateFrom: string, dateTo: string) =>
    api.get<ReportResponse<MonthlyReportRow>>("/business/reports/monthly", {
      params: { date_from: dateFrom, date_to: dateTo },
    }),
  yearly: () =>
    api.get<ReportResponse<YearlyReportRow>>("/business/reports/yearly"),
  overview: () => api.get<CommerceOverview>("/business/reports/overview"),
};

export async function exportBusinessReport(
  reportType: string,
  format: ReportExportFormat,
  dateFrom?: string,
  dateTo?: string,
): Promise<string> {
  const response = await http.post(
    "/business/reports/export",
    null,
    {
      params: { report_type: reportType, format, date_from: dateFrom, date_to: dateTo },
      responseType: "blob",
    },
  );
  const disposition = response.headers["content-disposition"] as string | undefined;
  const match = disposition?.match(/filename="?([^"]+)"?/);
  const ext = format === "xlsx" ? "xlsx" : format === "pdf" ? "pdf" : "csv";
  const filename = match?.[1] ?? `${reportType}-report.${ext}`;
  const url = URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return filename;
}

export const statisticsApi = {
  snapshot: (dateFrom: string, dateTo: string) =>
    api.get<{ snapshots: Record<string, Record<string, string>>; days: number }>(
      "/statistics",
      { params: { date_from: dateFrom, date_to: dateTo } },
    ),
  refresh: () => api.post<{ updated: boolean; metrics: Record<string, string> }>("/statistics/refresh"),
};
