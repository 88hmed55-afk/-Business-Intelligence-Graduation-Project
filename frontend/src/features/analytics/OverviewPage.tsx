import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { BarChart3, Gauge, Layers, FileText } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Link } from "react-router-dom";

import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { analyticsApi } from "@/features/analytics/api";
import { toTitleCase } from "@/lib/utils";

export function OverviewPage() {
  const { t } = useTranslation();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["analytics", "overview"],
    queryFn: analyticsApi.overview,
  });

  const { data: performance } = useQuery({
    queryKey: ["analytics", "performance"],
    queryFn: () => analyticsApi.performance(8),
  });

  if (isError) {
    return (
      <ErrorState
        message={t("bi:common.loadFailed")}
        onRetry={() => void refetch()}
      />
    );
  }

  const metrics = data?.metrics ?? [];
  const getMetric = (label: string) => metrics.find((m) => m.label === label);

  const kpisMetric = getMetric("KPIs Tracked");
  const dashboardsMetric = getMetric("Dashboards");
  const reportsMetric = getMetric("Reports");
  const achievementMetric = getMetric("Avg Achievement");

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("bi:analytics.overview")}
        description={t("bi:analytics.overviewSubtitle")}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-[124px] rounded-xl" />
          ))
        ) : (
          <>
            <StatCard title={t("bi:analytics.statCards.kpisTracked")} value={kpisMetric?.value} icon={<Gauge />} />
            <StatCard title={t("bi:analytics.statCards.dashboards")} value={dashboardsMetric?.value} icon={<Layers />} />
            <StatCard title={t("bi:analytics.statCards.reports")} value={reportsMetric?.value} icon={<FileText />} />
            <StatCard
              title={t("bi:analytics.statCards.avgAchievement")}
              value={achievementMetric?.value}
              delta={achievementMetric?.delta}
              deltaPercent={achievementMetric?.delta_percent}
              suffix="%"
              icon={<BarChart3 />}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="glass-card lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("bi:analytics.achievementTrend")}</CardTitle>
            <CardDescription>{t("bi:analytics.achievementTrendDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={(data?.trends ?? []).map((point) => ({
                      ...point,
                      name: point.period,
                    }))}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value: number) => `${value}%`}
                    />
                    <Tooltip
                      formatter={(value: unknown) => [`${value}%`, t("bi:analytics.achievement")]}
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid hsl(var(--border))",
                        background: "hsl(var(--popover))",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2.5}
                      fill="url(#trendFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>{t("bi:analytics.performanceByCategory")}</CardTitle>
            <CardDescription>{t("bi:analytics.performanceByCategoryDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-10 w-full" />
                ))}
              </div>
            ) : (data?.categories?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">{t("bi:analytics.noCategoryData")}</p>
            ) : (
              data?.categories?.map((category) => (
                <div key={category.category} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{toTitleCase(category.category)}</span>
                    <span className="text-muted-foreground">
                      {category.total} · {category.achievement.toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={category.achievement} className="h-2" />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t("bi:analytics.topPerformingKpis")}</CardTitle>
            <CardDescription>{t("bi:analytics.topPerformingKpisDescription")}</CardDescription>
          </div>
          <Link to="/kpis" className="text-sm font-medium text-primary hover:underline">
            {t("actions.viewAll")}
          </Link>
        </CardHeader>
        <CardContent>
          {performance === undefined ? (
            <LoadingState label={t("bi:common.loading")} />
          ) : performance.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("bi:analytics.noPerformanceData")}</p>
          ) : (
            <div className="divide-y">
              {performance.map((item) => (
                <div key={item.kpi_id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.kpi_name}</p>
                    <p className="text-xs text-muted-foreground">{toTitleCase(item.category)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {item.current_value !== null && (
                      <span className="text-sm font-semibold">
                        {item.current_value?.toLocaleString()}
                        {item.unit ? ` ${item.unit}` : ""}
                      </span>
                    )}
                    <Badge
                      variant={
                        item.achievement_pct === null
                          ? "secondary"
                          : item.achievement_pct >= 100
                            ? "success"
                            : item.achievement_pct >= 70
                              ? "info"
                              : "warning"
                      }
                    >
                      {item.achievement_pct === null ? "N/A" : `${item.achievement_pct.toFixed(0)}%`}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
