import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowUpRight,
  Boxes,
  CircleDollarSign,
  Package,
  Receipt,
  ShoppingCart,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

import { AreaChartCard, BarChartCard, DonutChartCard, LineChartCard } from "@/components/charts";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { activityLogsApi } from "@/features/activity-logs/api";
import { businessReportsApi } from "@/features/reports/api";
import { customersApi } from "@/features/customers/api";
import { inventoryApi, ordersApi } from "@/features/orders/api";
import { productsApi } from "@/features/products/api";
import { useAuthStore } from "@/stores/auth-store";
import { cn, formatCurrency, formatDate, parseNum, toTitleCase } from "@/lib/utils";

function todayRange(months = 12) {
  const end = new Date();
  const start = new Date(end);
  start.setMonth(start.getMonth() - (months - 1));
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { start: fmt(start), end: fmt(end) };
}

const orderStatusVariant: Record<
  string,
  "default" | "secondary" | "outline" | "success" | "warning" | "info" | "destructive"
> = {
  pending: "warning",
  processing: "info",
  shipped: "secondary",
  delivered: "success",
  cancelled: "destructive",
  refunded: "outline",
};

const actionVariant: Record<
  string,
  "default" | "secondary" | "outline" | "success" | "warning" | "info" | "destructive"
> = {
  create: "success",
  update: "info",
  delete: "destructive",
  login: "secondary",
  export: "outline",
};

export function DashboardPage() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === "admin";
  const range = todayRange(12);

  const { data: overview } = useQuery({
    queryKey: ["dashboard", "overview"],
    queryFn: businessReportsApi.overview,
  });

  const { data: monthly, isLoading: loadingMonthly } = useQuery({
    queryKey: ["dashboard", "monthly", range.start, range.end],
    queryFn: () => businessReportsApi.monthly(range.start, range.end),
  });

  const { data: yearly, isLoading: loadingYearly } = useQuery({
    queryKey: ["dashboard", "yearly"],
    queryFn: businessReportsApi.yearly,
  });

  const { data: topSellers } = useQuery({
    queryKey: ["dashboard", "top-sellers"],
    queryFn: () => productsApi.topSellers(6),
  });

  const { data: topCustomers } = useQuery({
    queryKey: ["dashboard", "top-customers"],
    queryFn: () => businessReportsApi.customers(range.start, range.end, 6),
  });

  const { data: recentOrders } = useQuery({
    queryKey: ["dashboard", "recent-orders"],
    queryFn: () => ordersApi.list({ page: 1, page_size: 6 }),
  });

  const { data: inventoryPage } = useQuery({
    queryKey: ["dashboard", "inventory-count"],
    queryFn: () => inventoryApi.list({ page: 1, page_size: 1 }),
  });

  const { data: lowStock } = useQuery({
    queryKey: ["dashboard", "low-stock"],
    queryFn: () => inventoryApi.lowStock(1),
  });

  const { data: activityLogs } = useQuery({
    queryKey: ["dashboard", "activity"],
    queryFn: () => activityLogsApi.list({ page: 1, page_size: 6 }),
    enabled: isAdmin,
  });

  const { data: customerPage } = useQuery({
    queryKey: ["dashboard", "customers-count"],
    queryFn: () => customersApi.list({ page: 1, page_size: 1 }),
  });

  const monthlyData = (monthly?.rows ?? []).map((row) => ({
    ...row,
    name: row.month,
    revenue: parseNum(row.revenue),
    profit: parseNum(row.profit),
    cogs: parseNum(row.cogs),
  }));

  const yearlyData = (yearly?.rows ?? []).map((row) => ({
    ...row,
    name: String(row.year),
    revenue: parseNum(row.revenue),
    profit: parseNum(row.profit),
  }));

  const categoryData = (() => {
    const map = new Map<string, number>();
    for (const row of topSellers ?? []) {
      map.set(row.product_name, parseNum(row.revenue));
    }
    return Array.from(map.entries())
      .slice(0, 6)
      .map(([name, value]) => ({ name, value }));
  })();

  const revenue = parseNum(overview?.revenue);
  const profit = parseNum(overview?.gross_profit);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("dashboard:greeting", { name: user?.full_name?.split(" ")[0] ?? "there" })}
        description={t("dashboard:greetingDescription")}
      >
        <Button asChild>
          <Link to="/orders">
            <ShoppingCart className="h-4 w-4" />
            {t("dashboard:actions.newOrder")}
          </Link>
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            title: t("dashboard:kpis.revenue"),
            value: revenue,
            icon: <CircleDollarSign className="h-4 w-4" />,
            suffix: "",
            render: () => <span className="text-3xl font-bold tracking-tight">{formatCurrency(revenue)}</span>,
          },
          {
            title: t("dashboard:kpis.grossProfit"),
            value: profit,
            icon: <TrendingUp className="h-4 w-4" />,
            render: () => <span className="text-3xl font-bold tracking-tight">{formatCurrency(profit)}</span>,
          },
          {
            title: t("dashboard:kpis.orders"),
            value: overview?.total_orders,
            icon: <Receipt className="h-4 w-4" />,
            render: null,
          },
          {
            title: t("dashboard:kpis.customers"),
            value: overview?.total_customers ?? customerPage?.total,
            icon: <Users className="h-4 w-4" />,
            render: null,
          },
          {
            title: t("dashboard:kpis.products"),
            value: overview?.total_products,
            icon: <Package className="h-4 w-4" />,
            render: null,
          },
          {
            title: t("dashboard:kpis.avgOrderValue"),
            value: parseNum(overview?.avg_order_value),
            icon: <Wallet className="h-4 w-4" />,
            render: () => (
              <span className="text-3xl font-bold tracking-tight">{formatCurrency(overview?.avg_order_value)}</span>
            ),
          },
          {
            title: t("dashboard:kpis.inventoryRecords"),
            value: inventoryPage?.total,
            icon: <Boxes className="h-4 w-4" />,
            render: null,
          },
          {
            title: t("dashboard:kpis.lowStockAlerts"),
            value: lowStock?.length,
            icon: <Activity className="h-4 w-4" />,
            render: null,
          },
        ].map((card, index) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            {card.render ? (
              <StatCard title={card.title} value={0} icon={card.icon}>
                <div className="mt-3">{card.render()}</div>
              </StatCard>
            ) : (
              <StatCard title={card.title} value={card.value} icon={card.icon} />
            )}
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {loadingMonthly ? (
          <Skeleton className="h-[340px] rounded-xl" />
        ) : (
          <LineChartCard
            title={t("dashboard:charts.monthlySalesTrend")}
            description={t("dashboard:descriptions.monthlySalesTrend")}
            data={monthlyData}
            xKey="name"
            series={[
              { key: "revenue", name: t("dashboard:labels.revenue") },
              { key: "profit", name: t("dashboard:labels.profit"), color: "hsl(var(--chart-3))" },
            ]}
            height={340}
          />
        )}

        {loadingYearly ? (
          <Skeleton className="h-[340px] rounded-xl" />
        ) : (
          <BarChartCard
            title={t("dashboard:charts.yearlyComparison")}
            description={t("dashboard:descriptions.yearlyComparison")}
            data={yearlyData}
            xKey="name"
            series={[
              { key: "revenue", name: t("dashboard:labels.revenue") },
              { key: "cogs", name: t("dashboard:labels.cogs"), color: "hsl(var(--chart-2))" },
            ]}
            height={340}
          />
        )}

        {monthlyData.length > 0 ? (
          <AreaChartCard
            title={t("dashboard:sections.revenueTrend")}
            description={t("dashboard:descriptions.revenueTrend")}
            data={monthlyData}
            xKey="name"
            series={[
              { key: "revenue", name: t("dashboard:labels.revenue") },
              { key: "profit", name: t("dashboard:labels.profit"), color: "hsl(var(--chart-3))" },
            ]}
            height={340}
          />
        ) : (
          <Skeleton className="h-[340px] rounded-xl" />
        )}

        {categoryData.length > 0 ? (
          <DonutChartCard
            title={t("dashboard:charts.revenueByProduct")}
            description={t("dashboard:descriptions.revenueByProduct")}
            data={categoryData}
            height={340}
          />
        ) : (
          <Skeleton className="h-[340px] rounded-xl" />
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{t("dashboard:sections.topProducts")}</CardTitle>
              <CardDescription>{t("dashboard:descriptions.topProducts")}</CardDescription>
            </div>
            <Link to="/products" className="text-sm font-medium text-primary hover:underline">
              {t("actions.viewAll")}
            </Link>
          </CardHeader>
          <CardContent>
            {!topSellers ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-10 w-full" />
                ))}
              </div>
            ) : topSellers.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("dashboard:labels.noSalesYet")}</p>
            ) : (
              <div className="space-y-3">
                {topSellers.map((item, index) => (
                  <div key={item.product_id} className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.product_name}</p>
                      <p className="text-xs text-muted-foreground">{item.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{formatCurrency(item.revenue)}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("dashboard:labels.units", { count: item.units_sold })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{t("dashboard:sections.topCustomers")}</CardTitle>
              <CardDescription>{t("dashboard:descriptions.topCustomers")}</CardDescription>
            </div>
            <Link to="/customers" className="text-sm font-medium text-primary hover:underline">
              {t("actions.viewAll")}
            </Link>
          </CardHeader>
          <CardContent>
            {!topCustomers ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-10 w-full" />
                ))}
              </div>
            ) : topCustomers.rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("dashboard:labels.noCustomersYet")}</p>
            ) : (
              <div className="space-y-3">
                {topCustomers.rows.map((item) => (
                  <div key={item.customer_id} className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.customer_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("dashboard:labels.ordersCount", { count: item.total_orders })} · {formatDate(item.last_order_date)}
                      </p>
                    </div>
                    <p className="text-sm font-semibold">{formatCurrency(item.total_spent)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{t("dashboard:sections.recentOrders")}</CardTitle>
              <CardDescription>{t("dashboard:descriptions.recentOrders")}</CardDescription>
            </div>
            <Link to="/orders" className="text-sm font-medium text-primary hover:underline">
              {t("actions.viewAll")}
            </Link>
          </CardHeader>
          <CardContent>
            {!recentOrders ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-10 w-full" />
                ))}
              </div>
            ) : recentOrders.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("dashboard:labels.noOrdersYet")}</p>
            ) : (
              <div className="divide-y">
                {recentOrders.items.map((order) => (
                  <div key={order.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{order.order_number}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {order.customer_name ?? "—"} · {formatDate(order.order_date)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold">{formatCurrency(order.total_amount)}</span>
                      <Badge variant={orderStatusVariant[order.status] ?? "secondary"}>
                        {toTitleCase(order.status)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {isAdmin ? (
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t("dashboard:sections.recentActivity")}</CardTitle>
                <CardDescription>{t("dashboard:descriptions.recentActivity")}</CardDescription>
              </div>
              <Link to="/activity-logs" className="text-sm font-medium text-primary hover:underline">
                {t("actions.viewAll")}
              </Link>
            </CardHeader>
            <CardContent>
              {!activityLogs ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Skeleton key={index} className="h-10 w-full" />
                  ))}
                </div>
              ) : activityLogs.items.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("dashboard:labels.noActivityYet")}</p>
              ) : (
                <div className="divide-y">
                  {activityLogs.items.map((log) => (
                    <div key={log.id} className="flex items-center gap-3 py-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                        <ArrowUpRight className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">{log.summary}</p>
                        <p className="text-xs text-muted-foreground">
                          {log.module} · {formatDate(log.created_at)}
                        </p>
                      </div>
                      <Badge variant={actionVariant[log.action] ?? "secondary"}>{log.action}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>{t("dashboard:sections.quickInsights")}</CardTitle>
              <CardDescription>{t("dashboard:descriptions.quickInsights")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: t("dashboard:labels.grossProfitMargin"), value: revenue ? ((profit / revenue) * 100).toFixed(1) + "%" : "—" },
                { label: t("dashboard:kpis.avgOrderValue"), value: formatCurrency(overview?.avg_order_value) },
                { label: t("dashboard:kpis.inventoryRecords"), value: inventoryPage?.total ?? "—" },
              ].map((insight) => (
                <div
                  key={insight.label}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <span className="text-sm text-muted-foreground">{insight.label}</span>
                  <span className={cn("text-sm font-semibold")}>{insight.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
