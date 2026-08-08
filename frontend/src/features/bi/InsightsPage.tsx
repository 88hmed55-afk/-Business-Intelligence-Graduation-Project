import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  BarChart3,
  Filter,
  TrendingDown,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";

import { DonutChartCard, HorizontalBarChartCard } from "@/components/charts";
import { DateFilter } from "@/components/common/DateFilter";
import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { biApi } from "@/features/bi/api";
import { cn, formatCurrency, toTitleCase } from "@/lib/utils";
import { useDateFilterStore } from "@/stores/date-filter-store";

function InsightCard({ insight }: { insight: any }) {
  const severityMap: Record<string, { bg: string; icon: React.ReactNode }> = {
    success: { bg: "border-emerald-400 bg-emerald-500/10", icon: <TrendingUp className="h-4 w-4 text-emerald-600" /> },
    warning: { bg: "border-amber-400 bg-amber-500/10", icon: <TrendingDown className="h-4 w-4 text-amber-600" /> },
    error: { bg: "border-red-400 bg-red-500/10", icon: <Zap className="h-4 w-4 text-red-600" /> },
    info: { bg: "border-sky-400 bg-sky-500/10", icon: <Filter className="h-4 w-4 text-sky-600" /> },
  };
  const s = severityMap[insight.severity] ?? severityMap.info;

  return (
    <div className={cn("rounded-xl border-s-4 p-4 transition-all hover:shadow-md", s.bg)}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">{s.icon}</div>
        <div className="flex-1">
          <p className="text-sm font-semibold">{insight.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{insight.description}</p>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant={insight.type === "inventory" ? "destructive" : insight.severity === "success" ? "success" : "secondary"} className="text-[10px]">
              {toTitleCase(insight.type)}
            </Badge>
            {insight.change_pct !== null && (
              <span className={cn("text-xs font-medium",
                insight.change_pct >= 0 ? "text-emerald-600" : "text-red-600"
              )}>
                {insight.change_pct >= 0 ? "+" : ""}{insight.change_pct.toFixed(1)}%
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function InsightsPage() {
  const { t } = useTranslation();
  const { dateFrom, dateTo, getParams } = useDateFilterStore();
  const params = getParams();

  const { data: insightsData, isLoading: loadingInsights, isError: errInsights } = useQuery({
    queryKey: ["bi", "insights", dateFrom, dateTo],
    queryFn: () => biApi.insights(params),
  });

  const { data: rankData, isLoading: loadingRank } = useQuery({
    queryKey: ["bi", "rankings", "products", dateFrom, dateTo],
    queryFn: () => biApi.rankings("products", params, 10),
  });

  const { data: catAgg } = useQuery({
    queryKey: ["bi", "aggregate", "category", dateFrom, dateTo],
    queryFn: () => biApi.aggregate("category", params),
  });

  const { data: statusAgg } = useQuery({
    queryKey: ["bi", "aggregate", "status", dateFrom, dateTo],
    queryFn: () => biApi.aggregate("status", params),
  });

  const { data: warehouseAgg } = useQuery({
    queryKey: ["bi", "aggregate", "warehouse", dateFrom, dateTo],
    queryFn: () => biApi.aggregate("warehouse", params),
  });

  if (errInsights) return <ErrorState message={t("bi:common.loadFailed")} />;

  const insightList = insightsData?.insights ?? [];
  const rankItems = rankData?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("bi:insights.title")}
        description={t("bi:insights.subtitle")}
      >
        <DateFilter />
      </PageHeader>

      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Zap className="h-4 w-4 text-primary" />
            {t("bi:insights.businessInsights")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingInsights ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          ) : insightList.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {insightList.map((insight: any) => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("bi:insights.noData")}</p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Trophy className="h-4 w-4 text-primary" />
              {t("bi:insights.topProducts")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingRank ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <HorizontalBarChartCard
                title=""
                data={rankItems.map(i => ({ name: i.name, revenue: i.value }))}
                yKey="name"
                series={[{ key: "revenue", name: t("bi:trends.revenue") }]}
                height={Math.max(280, rankItems.length * 36)}
              />
            )}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <BarChart3 className="h-4 w-4 text-primary" />
              {t("bi:insights.topProductsByRank")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {rankItems.map((item: any) => (
              <div key={item.rank} className="flex items-center gap-3">
                <span className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  item.rank <= 3 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                )}>
                  {item.rank}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                </div>
                <span className="shrink-0 text-sm font-semibold">{formatCurrency(item.value)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <DonutChartCard
          title={t("bi:insights.categoryDistribution")}
          data={(catAgg?.buckets ?? []).map(b => ({ name: b.label, value: b.value }))}
          height={260}
        />
        <DonutChartCard
          title={t("bi:insights.orderStatus")}
          data={(statusAgg?.buckets ?? []).map(b => ({ name: b.label, value: b.value }))}
          height={260}
        />
        <DonutChartCard
          title={t("bi:insights.byWarehouse")}
          data={(warehouseAgg?.buckets ?? []).map(b => ({ name: b.label, value: b.value }))}
          height={260}
        />
      </div>
    </div>
  );
}
