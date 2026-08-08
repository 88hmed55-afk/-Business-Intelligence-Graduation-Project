import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  DollarSign,
  Package,
  ShoppingCart,
  Target,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";

import { LineChartCard, DonutChartCard } from "@/components/charts";
import { DateFilter } from "@/components/common/DateFilter";
import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { biApi } from "@/features/bi/api";
import { cn, formatCurrency, toTitleCase } from "@/lib/utils";
import { useDateFilterStore } from "@/stores/date-filter-store";

const ICONS: Record<string, React.ReactNode> = {
  dollar: <DollarSign className="h-5 w-5" />,
  "trending-up": <TrendingUp className="h-5 w-5" />,
  "shopping-cart": <ShoppingCart className="h-5 w-5" />,
  users: <Users className="h-5 w-5" />,
  target: <Target className="h-5 w-5" />,
  package: <Package className="h-5 w-5" />,
};

function KPICard({ kpi, loading }: { kpi?: any; loading?: boolean }) {
  const { t } = useTranslation();
  if (loading || !kpi) {
    return (
      <Card className="glass-card">
        <CardContent className="p-5">
          <Skeleton className="mb-3 h-8 w-8 rounded-lg" />
          <Skeleton className="mb-2 h-4 w-24" />
          <Skeleton className="mb-1 h-7 w-32" />
          <Skeleton className="h-3 w-20" />
        </CardContent>
      </Card>
    );
  }
  const isPositive = kpi.change_pct !== null ? kpi.change_pct >= 0 : true;
  const formatted = kpi.format === "currency"
    ? formatCurrency(kpi.value)
    : kpi.value >= 1000
      ? `${(kpi.value / 1000).toFixed(1)}K`
      : Math.round(kpi.value).toLocaleString();

  return (
    <Card className="glass-card group relative overflow-hidden transition-all hover:shadow-glow">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <CardContent className="relative p-5">
        <div className={cn(
          "mb-3 flex h-10 w-10 items-center justify-center rounded-xl",
          isPositive ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive",
        )}>
          {ICONS[kpi.icon ?? ""] ?? <BarChart3 className="h-5 w-5" />}
        </div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{kpi.label}</p>
        <p className="mt-1 text-2xl font-bold tracking-tight">{formatted}</p>
        {kpi.change_pct !== null && (
          <div className={cn("mt-1 flex items-center gap-1 text-xs font-medium",
            isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
          )}>
            {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(kpi.change_pct).toFixed(1)}%
            <span className="text-muted-foreground">{t("bi:executiveDashboard.compare")}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InsightCard({ insight }: { insight: any }) {
  const severityColors: Record<string, string> = {
    success: "border-emerald-400 bg-emerald-500/10",
    warning: "border-amber-400 bg-amber-500/10",
    error: "border-red-400 bg-red-500/10",
    info: "border-sky-400 bg-sky-500/10",
  };
  return (
    <div className={cn("rounded-xl border-s-4 p-3", severityColors[insight.severity] ?? "border-muted bg-muted/50")}>
      <p className="text-sm font-semibold">{insight.title}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{insight.description}</p>
      {insight.change_pct !== null && (
        <Badge variant={insight.change_pct >= 0 ? "success" : "destructive"} className="mt-1.5 text-[10px]">
          {insight.change_pct >= 0 ? "+" : ""}{insight.change_pct.toFixed(1)}%
        </Badge>
      )}
    </div>
  );
}

function RankingList({ title, items, format }: { title: string; items: any[]; format?: string }) {
  const { t } = useTranslation();
  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.slice(0, 8).map((item: any, i: number) => (
          <div key={i} className="flex items-center gap-3 text-sm">
            <span className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
              i < 3 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
            )}>
              {item.rank ?? i + 1}
            </span>
            <span className="flex-1 truncate">{item.name}</span>
            <span className="font-medium">
              {format === "currency" ? formatCurrency(item.value) : item.value.toLocaleString()}
            </span>
          </div>
        ))}
        {items.length === 0 && (
          <p className="py-4 text-center text-xs text-muted-foreground">{t("bi:executiveDashboard.noData")}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function ExecutiveDashboard() {
  const { t } = useTranslation();
  const { dateFrom, dateTo, getParams } = useDateFilterStore();
  const params = getParams();

  const { data: overview, isLoading: loadingOverview, isError: errOverview } = useQuery({
    queryKey: ["bi", "overview", dateFrom, dateTo],
    queryFn: () => biApi.overview(params),
  });

  const { data: insights } = useQuery({
    queryKey: ["bi", "insights", dateFrom, dateTo],
    queryFn: () => biApi.insights(params),
  });

  const { data: compare } = useQuery({
    queryKey: ["bi", "compare", dateFrom, dateTo],
    queryFn: () => biApi.compare(params),
  });

  const { data: catAgg } = useQuery({
    queryKey: ["bi", "aggregate", "category", dateFrom, dateTo],
    queryFn: () => biApi.aggregate("category", params),
  });

  if (errOverview) return <ErrorState message={t("bi:common.loadFailed")} />;

  const kpis = overview?.kpis ?? [];
  const revenueData = overview?.revenue_chart ?? [];
  const profitData = overview?.profit_chart ?? [];
  const orderStatus = overview?.order_status ?? {};
  const topProducts = overview?.top_products ?? [];
  const topCustomers = overview?.top_customers ?? [];
  const categorySplit = overview?.category_split ?? catAgg?.buckets?.map(b => ({ name: b.label, value: b.value, percentage: b.percentage })) ?? [];
  const insightList = insights?.insights ?? [];
  const changes = compare?.changes ?? {};

  const orderStatusData = Object.entries(orderStatus).map(([name, value]) => ({ name: toTitleCase(name), value }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("bi:executiveDashboard.title")}
        description={t("bi:executiveDashboard.subtitle")}
      >
        <DateFilter />
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {loadingOverview
          ? Array.from({ length: 6 }).map((_, i) => <KPICard key={i} loading />)
          : kpis.map((kpi: any) => <KPICard key={kpi.key} kpi={kpi} />)
        }
      </div>

      {Object.keys(changes).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(changes).map(([key, val]) => (
            <Badge key={key} variant={val >= 0 ? "success" : "destructive"} className="text-xs">
              {toTitleCase(key)}: {val >= 0 ? "+" : ""}{val.toFixed(1)}%
            </Badge>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <LineChartCard
          title={t("bi:executiveDashboard.monthlyTrend")}
          description={t("bi:executiveDashboard.revenueTrendDescription")}
          data={revenueData}
          xKey="period"
          series={[{ key: "revenue", name: t("bi:trends.revenue"), color: "hsl(var(--chart-1))" }]}
          height={320}
        />
        <LineChartCard
          title={t("bi:executiveDashboard.profitTrend")}
          description={t("bi:executiveDashboard.profitTrendDescription")}
          data={profitData}
          xKey="period"
          series={[{ key: "profit", name: t("bi:trends.profit"), color: "hsl(var(--chart-2))" }]}
          height={320}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <DonutChartCard
          title={t("bi:executiveDashboard.orderStatusDistribution")}
          description={t("bi:executiveDashboard.orderStatusDistributionDescription")}
          data={orderStatusData}
          height={280}
        />
        <DonutChartCard
          title={t("bi:executiveDashboard.categoryRevenueSplit")}
          description={t("bi:executiveDashboard.categoryRevenueSplitDescription")}
          data={categorySplit.map(c => ({ name: c.name ?? t("labels.unknown"), value: c.value }))}
          height={280}
        />
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t("bi:executiveDashboard.periodComparison")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {compare && [
              { label: t("bi:trends.revenue"), curr: compare.current.revenue, prev: compare.previous.revenue, fmt: true },
              { label: t("bi:trends.orders"), curr: compare.current.orders, prev: compare.previous.orders, fmt: false },
              { label: t("bi:trends.profit"), curr: compare.current.profit, prev: compare.previous.profit, fmt: true },
              { label: t("bi:trends.customers"), curr: compare.current.customers, prev: compare.previous.customers, fmt: false },
              { label: t("bi:executiveDashboard.avgOrderValue"), curr: compare.current.avg_order_value, prev: compare.previous.avg_order_value, fmt: true },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{item.label}</span>
                <div className="text-right">
                  <span className="font-medium">{item.fmt ? formatCurrency(item.curr) : Math.round(item.curr).toLocaleString()}</span>
                  <span className="ms-2 text-xs text-muted-foreground">
                    {t("bi:executiveDashboard.compare")} {item.fmt ? formatCurrency(item.prev) : Math.round(item.prev).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RankingList title={t("bi:executiveDashboard.topProducts")} items={topProducts.map((p, i) => ({ rank: i + 1, name: p.name, value: p.value }))} format="currency" />
        <RankingList title={t("bi:insights.topCustomers")} items={topCustomers.map((c, i) => ({ rank: i + 1, name: c.name, value: c.value }))} format="currency" />
      </div>

      {insightList.length > 0 && (
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Zap className="h-4 w-4 text-primary" />
              {t("bi:executiveDashboard.smartInsights")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {insightList.map((insight: any) => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
