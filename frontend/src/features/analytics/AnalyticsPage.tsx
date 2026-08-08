import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { analyticsApi } from "@/features/analytics/api";
import { toTitleCase } from "@/lib/utils";

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid hsl(var(--border))",
  background: "hsl(var(--popover))",
} as const;

export function AnalyticsPage() {
  const { t } = useTranslation();
  const overviewQuery = useQuery({
    queryKey: ["analytics", "overview"],
    queryFn: analyticsApi.overview,
  });

  const trendsQuery = useQuery({
    queryKey: ["analytics", "trends", 12],
    queryFn: () => analyticsApi.trends(12),
  });

  const performanceQuery = useQuery({
    queryKey: ["analytics", "performance", 50],
    queryFn: () => analyticsApi.performance(50),
  });

  if (overviewQuery.isError || trendsQuery.isError || performanceQuery.isError) {
    return (
      <ErrorState
        message={t("bi:common.loadFailed")}
        onRetry={() => {
          void overviewQuery.refetch();
          void trendsQuery.refetch();
          void performanceQuery.refetch();
        }}
      />
    );
  }

  const loading = overviewQuery.isLoading || trendsQuery.isLoading || performanceQuery.isLoading;

  const categoryData = (overviewQuery.data?.categories ?? []).map((c) => ({
    name: toTitleCase(c.category),
    achievement: c.achievement,
  }));

  const trendData = (trendsQuery.data ?? []).map((point) => ({
    name: point.period,
    achievement: point.value,
    kpis: point.kpis,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("bi:analytics.title")}
        description={t("bi:analytics.subtitle")}
      />

      <Tabs defaultValue="trends">
        <TabsList>
          <TabsTrigger value="trends">{t("bi:analytics.tabs.trends")}</TabsTrigger>
          <TabsTrigger value="categories">{t("bi:analytics.tabs.categories")}</TabsTrigger>
          <TabsTrigger value="performance">{t("bi:analytics.tabs.performance")}</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="mt-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>{t("bi:analytics.achievementTrend")}</CardTitle>
              <CardDescription>{t("bi:analytics.achievementTrendDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[320px] w-full" />
              ) : (
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value: number) => `${value}%`}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(value: unknown) => [`${value}%`, t("bi:analytics.achievement")]}
                      />
                      <Line
                        type="monotone"
                        dataKey="achievement"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2.5}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="mt-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>{t("bi:analytics.categoryAchievement")}</CardTitle>
              <CardDescription>{t("bi:analytics.categoryAchievementDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[320px] w-full" />
              ) : categoryData.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("bi:analytics.noCategoryData")}</p>
              ) : (
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value: number) => `${value}%`}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                        formatter={(value: unknown) => [`${value}%`, t("bi:analytics.achievement")]}
                      />
                      <Bar
                        dataKey="achievement"
                        fill="hsl(var(--primary))"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={48}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="mt-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>{t("bi:analytics.kpiPerformance")}</CardTitle>
              <CardDescription>{t("bi:analytics.kpiPerformanceDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[320px] w-full" />
              ) : (performanceQuery.data?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">{t("bi:analytics.noPerformanceData")}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("bi:analytics.table.kpi")}</TableHead>
                      <TableHead>{t("labels.category")}</TableHead>
                      <TableHead className="text-right">{t("bi:analytics.table.target")}</TableHead>
                      <TableHead className="text-right">{t("bi:analytics.table.current")}</TableHead>
                      <TableHead className="text-right">{t("bi:analytics.achievement")}</TableHead>
                      <TableHead>{t("bi:forecasting.trend")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {performanceQuery.data?.map((item) => (
                      <TableRow key={item.kpi_id}>
                        <TableCell className="font-medium">{item.kpi_name}</TableCell>
                        <TableCell>{toTitleCase(item.category)}</TableCell>
                        <TableCell className="text-right">
                          {item.target_value?.toLocaleString() ?? "—"}
                          {item.unit ? ` ${item.unit}` : ""}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.current_value?.toLocaleString() ?? "—"}
                          {item.unit ? ` ${item.unit}` : ""}
                        </TableCell>
                        <TableCell className="text-right">
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
                            {item.achievement_pct === null
                              ? "N/A"
                              : `${item.achievement_pct.toFixed(1)}%`}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{toTitleCase(item.trend)}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
