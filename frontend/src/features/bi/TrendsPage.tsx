import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { AreaChartCard, DonutChartCard, LineChartCard, RadarChartCard } from "@/components/charts";
import { DateFilter } from "@/components/common/DateFilter";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { biApi } from "@/features/bi/api";
import { formatCurrency, toTitleCase } from "@/lib/utils";
import { useDateFilterStore } from "@/stores/date-filter-store";

const METRICS = ["revenue", "orders", "profit", "customers"];
const GRANULARITIES = [
  { key: "daily", label: "Daily" },
  { key: "monthly", label: "Monthly" },
  { key: "quarterly", label: "Quarterly" },
];

export function TrendsPage() {
  const { dateFrom, dateTo, getParams } = useDateFilterStore();
  const params = getParams();
  const [granularity, setGranularity] = useState("monthly");

  const revenueQ = useQuery({
    queryKey: ["bi", "trend", "revenue", granularity, dateFrom, dateTo],
    queryFn: () => biApi.trend("revenue", granularity, params),
  });
  const ordersQ = useQuery({
    queryKey: ["bi", "trend", "orders", granularity, dateFrom, dateTo],
    queryFn: () => biApi.trend("orders", granularity, params),
  });
  const profitQ = useQuery({
    queryKey: ["bi", "trend", "profit", granularity, dateFrom, dateTo],
    queryFn: () => biApi.trend("profit", granularity, params),
  });
  const customersQ = useQuery({
    queryKey: ["bi", "trend", "customers", granularity, dateFrom, dateTo],
    queryFn: () => biApi.trend("customers", granularity, params),
  });

  const queries = [
    { metric: "revenue", data: revenueQ.data, isLoading: revenueQ.isLoading },
    { metric: "orders", data: ordersQ.data, isLoading: ordersQ.isLoading },
    { metric: "profit", data: profitQ.data, isLoading: profitQ.isLoading },
    { metric: "customers", data: customersQ.data, isLoading: customersQ.isLoading },
  ];

  const { data: catAgg } = useQuery({
    queryKey: ["bi", "aggregate", "category", dateFrom, dateTo],
    queryFn: () => biApi.aggregate("category", params),
  });

  const { data: countryAgg } = useQuery({
    queryKey: ["bi", "aggregate", "country", dateFrom, dateTo],
    queryFn: () => biApi.aggregate("country", params),
  });

  const trendColors: Record<string, string> = {
    revenue: "hsl(var(--chart-1))",
    orders: "hsl(var(--chart-2))",
    profit: "hsl(var(--chart-3))",
    customers: "hsl(var(--chart-4))",
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trends & Analytics"
        description="Multi-dimensional trend analysis"
      >
        <DateFilter />
      </PageHeader>

      <div className="flex flex-wrap items-center gap-2">
        {GRANULARITIES.map(g => (
          <Button
            key={g.key}
            variant={granularity === g.key ? "default" : "outline"}
            size="sm"
            onClick={() => setGranularity(g.key)}
          >
            {g.label}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {queries.map(({ metric, data, isLoading }) => (
          <Card key={metric} className="glass-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{toTitleCase(metric)} Trend</CardTitle>
                {data && (
                  <div className="text-right text-xs">
                    <span className="font-semibold">Total: </span>
                    <span>{metric === "revenue" || metric === "profit" ? formatCurrency(data.total) : data.total.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[260px] w-full" />
              ) : (
                <LineChartCard
                  title=""
                  data={(data?.points ?? []).map(p => ({ period: p.period, [metric]: p.value, cumulative: p.cumulative }))}
                  xKey="period"
                  series={[
                    { key: metric, name: toTitleCase(metric), color: trendColors[metric] },
                    { key: "cumulative", name: "Cumulative", color: "hsl(var(--muted-foreground))" },
                  ]}
                  height={260}
                />
              )}
              {data && (
                <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
                  <span>Min: {metric === "revenue" || metric === "profit" ? formatCurrency(data.min_value) : data.min_value.toLocaleString()}</span>
                  <span>Avg: {metric === "revenue" || metric === "profit" ? formatCurrency(data.average) : data.average.toLocaleString()}</span>
                  <span>Max: {metric === "revenue" || metric === "profit" ? formatCurrency(data.max_value) : data.max_value.toLocaleString()}</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DonutChartCard
          title="Revenue by Category"
          description="Product category breakdown"
          data={(catAgg?.buckets ?? []).map(b => ({ name: b.label, value: b.value }))}
          height={280}
        />
        <AreaChartCard
          title="Cumulative Revenue"
          description="Running total over time"
          data={(revenueQ.data?.points ?? []).map(p => ({ period: p.period, cumulative: p.cumulative }))}
          xKey="period"
          series={[{ key: "cumulative", name: "Cumulative", color: "hsl(var(--chart-1))" }]}
          height={280}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RadarChartCard
          title="Performance Radar"
          description="Multi-metric comparison"
          data={METRICS.map(m => {
            const q = queries.find(q => q.metric === m);
            const maxV = q?.data?.max_value ?? 1;
            return { subject: toTitleCase(m), score: maxV > 0 ? Math.min(100, Math.round((q?.data?.average ?? 0) / maxV * 100)) : 0 };
          })}
          series={[{ key: "score", name: "Score", color: "hsl(var(--primary))" }]}
          height={320}
        />
        <DonutChartCard
          title="Revenue by Country"
          description="Geographic distribution"
          data={(countryAgg?.buckets ?? []).slice(0, 8).map(b => ({ name: b.label, value: b.value }))}
          height={320}
        />
      </div>
    </div>
  );
}
