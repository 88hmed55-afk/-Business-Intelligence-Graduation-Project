import { useQuery } from "@tanstack/react-query";
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
        message="Could not load analytics data."
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
        title="Analytics"
        description="Explore trends, performance and category breakdowns"
      />

      <Tabs defaultValue="trends">
        <TabsList>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="mt-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Achievement Trend</CardTitle>
              <CardDescription>Average KPI achievement percentage per month</CardDescription>
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
                        formatter={(value: unknown) => [`${value}%`, "Achievement"]}
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
              <CardTitle>Category Achievement</CardTitle>
              <CardDescription>Average achievement percentage by KPI category</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[320px] w-full" />
              ) : categoryData.length === 0 ? (
                <p className="text-sm text-muted-foreground">No category data yet.</p>
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
                        formatter={(value: unknown) => [`${value}%`, "Achievement"]}
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
              <CardTitle>KPI Performance</CardTitle>
              <CardDescription>Latest recorded values versus targets</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[320px] w-full" />
              ) : (performanceQuery.data?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">No performance data yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>KPI</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Target</TableHead>
                      <TableHead className="text-right">Current</TableHead>
                      <TableHead className="text-right">Achievement</TableHead>
                      <TableHead>Trend</TableHead>
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
