import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Download, FileSpreadsheet } from "lucide-react";
import { useTranslation } from "react-i18next";

import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import {
  businessReportsApi,
  exportBusinessReport,
} from "@/features/reports/api";
import { getErrorMessage } from "@/lib/error-messages";
import { cn, formatCurrency, formatNumber, formatPercent, parseNum } from "@/lib/utils";
import type {
  CustomerReportRow,
  InventoryReportRow,
  MonthlyReportRow,
  ProductReportRow,
  ProfitReportRow,
  ReportExportFormat,
  SalesReportRow,
  YearlyReportRow,
} from "@/types";

type ReportKey = "sales" | "profit" | "customers" | "products" | "inventory" | "monthly" | "yearly";

const reportTabs: Array<{ key: ReportKey; label: string }> = [
  { key: "sales", label: "reports:tabs.sales" },
  { key: "profit", label: "reports:tabs.profit" },
  { key: "customers", label: "reports:tabs.customers" },
  { key: "products", label: "reports:tabs.products" },
  { key: "inventory", label: "reports:tabs.inventory" },
  { key: "monthly", label: "reports:tabs.monthly" },
  { key: "yearly", label: "reports:tabs.yearly" },
];

function lastDays(days: number) {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { start: fmt(start), end: fmt(end) };
}

function RowCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="mt-0.5 font-semibold">{value}</p>
    </div>
  );
}

type BusinessReportData = {
  rows?: unknown[];
  summary?: Record<string, string | number> | null;
};

export function BusinessReportsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const defaultRange = lastDays(90);
  const [active, setActive] = useState<ReportKey>("sales");
  const [dateFrom, setDateFrom] = useState(defaultRange.start);
  const [dateTo, setDateTo] = useState(defaultRange.end);
  const [applied, setApplied] = useState(defaultRange);

  const { data, isLoading, isError, refetch } = useQuery<BusinessReportData>({
    queryKey: ["business-reports", active, applied.start, applied.end],
    queryFn: async () => {
      let response;
      switch (active) {
        case "sales":
          response = await businessReportsApi.sales(applied.start, applied.end);
          break;
        case "profit":
          response = await businessReportsApi.profit(applied.start, applied.end);
          break;
        case "customers":
          response = await businessReportsApi.customers(applied.start, applied.end);
          break;
        case "products":
          response = await businessReportsApi.products(applied.start, applied.end);
          break;
        case "inventory":
          response = await businessReportsApi.inventory();
          break;
        case "monthly":
          response = await businessReportsApi.monthly(applied.start, applied.end);
          break;
        case "yearly":
          response = await businessReportsApi.yearly();
          break;
      }
      return {
        rows: (response as { rows?: unknown[] } | undefined)?.rows,
        summary: (response as { summary?: Record<string, string | number> | null } | undefined)?.summary,
      };
    },
  });

  const exportMutation = useMutation({
    mutationFn: ({ format }: { format: ReportExportFormat }) =>
      exportBusinessReport(active, format, applied.start, applied.end),
    onSuccess: (filename) => {
      toast({ title: t("reports:exportStarted"), description: filename, variant: "success" });
    },
    onError: (error: unknown) => {
      toast({
        title: t("reports:exportFailed"),
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const rows = useMemo(() => data?.rows ?? [], [data]);
  const summary = useMemo(() => (data?.summary ?? {}) as Record<string, string | number>, [data]);

  const hasDateRange = active !== "inventory" && active !== "yearly";

  const renderRows = () => {
    if (isLoading) {
      return (
        <div className="space-y-2 p-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-9 w-full" />
          ))}
        </div>
      );
    }
    if (rows.length === 0) {
      return (
        <div className="p-10 text-center">
          <FileSpreadsheet className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 font-medium">{t("reports:emptyTitle")}</p>
          <p className="text-sm text-muted-foreground">{t("reports:emptyDescription")}</p>
        </div>
      );
    }

    switch (active) {
      case "sales":
        return (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-start text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">{t("reports:table.period")}</th>
                <th className="px-4 py-3 font-medium">{t("reports:table.orders")}</th>
                <th className="px-4 py-3 font-medium">{t("reports:table.units")}</th>
                <th className="px-4 py-3 font-medium">{t("reports:table.grossRevenue")}</th>
                <th className="px-4 py-3 font-medium">{t("reports:table.discounts")}</th>
                <th className="px-4 py-3 font-medium">{t("reports:table.netRevenue")}</th>
                <th className="px-4 py-3 font-medium">{t("reports:table.avgOrderValue")}</th>
              </tr>
            </thead>
            <tbody>
              {(rows as SalesReportRow[]).map((row, index) => (
                <tr key={`${row.period}-${index}`} className="border-b last:border-0">
                  <td className="px-4 py-2.5 font-medium">{row.period}</td>
                  <td className="px-4 py-2.5">{formatNumber(row.order_count, 0)}</td>
                  <td className="px-4 py-2.5">{formatNumber(parseNum(row.units_sold), 0)}</td>
                  <td className="px-4 py-2.5">{formatCurrency(row.gross_revenue)}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{formatCurrency(row.discount_total)}</td>
                  <td className="px-4 py-2.5 font-medium">{formatCurrency(row.net_revenue)}</td>
                  <td className="px-4 py-2.5">{formatCurrency(row.avg_order_value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case "profit":
        return (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-start text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">{t("reports:table.period")}</th>
                <th className="px-4 py-3 font-medium">{t("reports:table.revenue")}</th>
                <th className="px-4 py-3 font-medium">{t("reports:table.cogs")}</th>
                <th className="px-4 py-3 font-medium">{t("reports:table.grossProfit")}</th>
                <th className="px-4 py-3 font-medium">{t("reports:table.margin")}</th>
                <th className="px-4 py-3 font-medium">{t("reports:table.tax")}</th>
                <th className="px-4 py-3 font-medium">{t("reports:table.netProfit")}</th>
              </tr>
            </thead>
            <tbody>
              {(rows as ProfitReportRow[]).map((row, index) => (
                <tr key={`${row.period}-${index}`} className="border-b last:border-0">
                  <td className="px-4 py-2.5 font-medium">{row.period}</td>
                  <td className="px-4 py-2.5">{formatCurrency(row.revenue)}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{formatCurrency(row.cogs)}</td>
                  <td className="px-4 py-2.5">{formatCurrency(row.gross_profit)}</td>
                  <td className="px-4 py-2.5">
                    <Badge variant={parseNum(row.margin_pct) >= 0 ? "success" : "destructive"}>
                      {formatPercent(row.margin_pct)}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{formatCurrency(row.tax_total)}</td>
                  <td className="px-4 py-2.5 font-medium">{formatCurrency(row.net_profit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case "customers":
        return (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-start text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">{t("reports:table.customer")}</th>
                <th className="px-4 py-3 font-medium">{t("reports:table.orders")}</th>
                <th className="px-4 py-3 font-medium">{t("reports:table.totalSpent")}</th>
                <th className="px-4 py-3 font-medium">{t("reports:table.avgOrderValue")}</th>
                <th className="px-4 py-3 font-medium">{t("reports:table.lastOrder")}</th>
              </tr>
            </thead>
            <tbody>
              {(rows as CustomerReportRow[]).map((row) => (
                <tr key={row.customer_id} className="border-b last:border-0">
                  <td className="px-4 py-2.5 font-medium">{row.customer_name}</td>
                  <td className="px-4 py-2.5">{formatNumber(row.total_orders, 0)}</td>
                  <td className="px-4 py-2.5 font-medium">{formatCurrency(row.total_spent)}</td>
                  <td className="px-4 py-2.5">{formatCurrency(row.avg_order_value)}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{row.last_order_date ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case "products":
        return (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-start text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">{t("reports:table.product")}</th>
                <th className="px-4 py-3 font-medium">{t("reports:table.category")}</th>
                <th className="px-4 py-3 font-medium">{t("reports:table.unitsSold")}</th>
                <th className="px-4 py-3 font-medium">{t("reports:table.revenue")}</th>
                <th className="px-4 py-3 font-medium">{t("reports:table.cogs")}</th>
                <th className="px-4 py-3 font-medium">{t("reports:table.profit")}</th>
              </tr>
            </thead>
            <tbody>
              {(rows as ProductReportRow[]).map((row) => (
                <tr key={row.product_id} className="border-b last:border-0">
                  <td className="px-4 py-2.5">
                    <p className="font-medium">{row.product_name}</p>
                    <p className="font-mono text-xs text-muted-foreground">{row.sku}</p>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{row.category ?? "—"}</td>
                  <td className="px-4 py-2.5">{formatNumber(parseNum(row.units_sold), 0)}</td>
                  <td className="px-4 py-2.5 font-medium">{formatCurrency(row.revenue)}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{formatCurrency(row.cogs)}</td>
                  <td className="px-4 py-2.5 font-medium">{formatCurrency(row.profit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case "inventory":
        return (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-start text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">{t("reports:table.product")}</th>
                <th className="px-4 py-3 font-medium">{t("reports:table.warehouse")}</th>
                <th className="px-4 py-3 font-medium">{t("reports:table.available")}</th>
                <th className="px-4 py-3 font-medium">{t("reports:table.reserved")}</th>
                <th className="px-4 py-3 font-medium">{t("reports:table.reorderLevel")}</th>
                <th className="px-4 py-3 font-medium">{t("reports:table.stockValue")}</th>
                <th className="px-4 py-3 font-medium">{t("labels.status")}</th>
              </tr>
            </thead>
            <tbody>
              {(rows as InventoryReportRow[]).map((row, index) => (
                <tr key={`${row.product_id}-${row.warehouse}-${index}`} className="border-b last:border-0">
                  <td className="px-4 py-2.5">
                    <p className="font-medium">{row.product_name}</p>
                    <p className="font-mono text-xs text-muted-foreground">{row.sku}</p>
                  </td>
                  <td className="px-4 py-2.5">{row.warehouse}</td>
                  <td className="px-4 py-2.5 font-medium">{formatNumber(parseNum(row.available_quantity), 0)}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{formatNumber(parseNum(row.reserved_quantity), 0)}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{formatNumber(parseNum(row.reorder_level), 0)}</td>
                  <td className="px-4 py-2.5 font-medium">{formatCurrency(row.stock_value)}</td>
                  <td className="px-4 py-2.5">
                    <Badge variant={row.status === "out_of_stock" ? "destructive" : row.status === "low_stock" ? "warning" : "success"}>
                      {row.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case "monthly":
        return (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-start text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">{t("reports:table.month")}</th>
                <th className="px-4 py-3 font-medium">{t("reports:table.orders")}</th>
                <th className="px-4 py-3 font-medium">{t("reports:table.revenue")}</th>
                <th className="px-4 py-3 font-medium">{t("reports:table.profit")}</th>
                <th className="px-4 py-3 font-medium">{t("reports:table.margin")}</th>
                <th className="px-4 py-3 font-medium">{t("reports:table.newCustomers")}</th>
              </tr>
            </thead>
            <tbody>
              {(rows as MonthlyReportRow[]).map((row, index) => (
                <tr key={`${row.month}-${index}`} className="border-b last:border-0">
                  <td className="px-4 py-2.5 font-medium">{row.month}</td>
                  <td className="px-4 py-2.5">{formatNumber(row.order_count, 0)}</td>
                  <td className="px-4 py-2.5 font-medium">{formatCurrency(row.revenue)}</td>
                  <td className="px-4 py-2.5">{formatCurrency(row.profit)}</td>
                  <td className="px-4 py-2.5">{formatPercent(row.margin_pct)}</td>
                  <td className="px-4 py-2.5">{formatNumber(row.new_customers, 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case "yearly":
        return (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-start text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">{t("reports:table.year")}</th>
                <th className="px-4 py-3 font-medium">{t("reports:table.orders")}</th>
                <th className="px-4 py-3 font-medium">{t("reports:table.revenue")}</th>
                <th className="px-4 py-3 font-medium">{t("reports:table.profit")}</th>
                <th className="px-4 py-3 font-medium">{t("reports:table.margin")}</th>
                <th className="px-4 py-3 font-medium">{t("reports:table.activeCustomers")}</th>
              </tr>
            </thead>
            <tbody>
              {(rows as YearlyReportRow[]).map((row) => (
                <tr key={row.year} className="border-b last:border-0">
                  <td className="px-4 py-2.5 font-medium">{row.year}</td>
                  <td className="px-4 py-2.5">{formatNumber(row.order_count, 0)}</td>
                  <td className="px-4 py-2.5 font-medium">{formatCurrency(row.revenue)}</td>
                  <td className="px-4 py-2.5">{formatCurrency(row.profit)}</td>
                  <td className="px-4 py-2.5">{formatPercent(row.margin_pct)}</td>
                  <td className="px-4 py-2.5">{formatNumber(row.active_customers, 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
    }
  };

  if (isError) {
    return <ErrorState message={t("reports:loadFailed")} onRetry={() => void refetch()} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("reports:businessReports")}
        description={t("reports:description")}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button disabled={exportMutation.isPending}>
              <Download className={cn("h-4 w-4", exportMutation.isPending && "animate-pulse")} />
              {exportMutation.isPending ? t("reports:exporting") : t("reports:export")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {(["csv", "xlsx", "pdf"] as const).map((format) => (
              <DropdownMenuItem key={format} onClick={() => exportMutation.mutate({ format })}>
                {t(`reports:formats.${format}`)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-2">
        {reportTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActive(tab.key)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
              active === tab.key
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:text-foreground",
            )}
          >
            {t(tab.label)}
          </button>
        ))}
      </div>

      {hasDateRange && (
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">{t("dates.from")}</label>
            <Input type="date" className="w-44" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">{t("dates.to")}</label>
            <Input type="date" className="w-44" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          </div>
          <Button
            variant="outline"
            onClick={() => setApplied({ start: dateFrom, end: dateTo })}
          >
            {t("reports:applyRange")}
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title={t("reports:rows")} value={rows.length} icon={<FileSpreadsheet />} />
        {Object.entries(summary).slice(0, 3).map(([key, value]) => {
          const num = parseNum(value);
          const isMoney = typeof value === "string" && /^[-\d,]+(\.\d+)?$/.test(value.replace(/,/g, "")) && !key.includes("count") && !key.includes("customers");
          return (
            <StatCard
              key={key}
              title={key.replace(/_/g, " ")}
              value={num}
              icon={<FileSpreadsheet />}
            >
              <span className="text-xl font-bold tracking-tight">
                {isMoney ? formatCurrency(value) : formatNumber(num, 0)}
              </span>
            </StatCard>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t(`reports:tabs.${active}`)}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {renderRows()}
        </CardContent>
      </Card>

      {Object.keys(summary).length > 3 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Object.entries(summary).slice(3).map(([key, value]) => (
            <RowCard key={key} title={key.replace(/_/g, " ")} value={String(value)} />
          ))}
        </div>
      )}
    </div>
  );
}
