import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { AreaChartCard, DonutChartCard, LineChartCard, RadarChartCard } from "@/components/charts";
import { DateFilter } from "@/components/common/DateFilter";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { biApi } from "@/features/bi/api";
import { formatCurrency } from "@/lib/utils";
import { useDateFilterStore } from "@/stores/date-filter-store";

const METRICS = ["revenue", "orders", "profit", "customers"];
const GRANULARITIES = [{ key: "daily" }, { key: "monthly" }, { key: "quarterly" }];

export function TrendsPage() {
  const { t } = useTranslation();
  const { dateFrom, dateTo, getParams } = useDateFilterStore();
  const params = getParams();
  const [granularity, setGranularity] = useState("monthly");

  const granularityLabels: Record<string, string> = {
    daily: t("bi:trends.daily"),
    monthly: t("bi:trends.monthly"),
    quarterly: t("bi:trends.quarterly"),
  };

  const metricLabels: Record<string, string> = {
    revenue: t("bi:trends.revenue"),
    orders: t("bi:trends.orders"),
    profit: t("bi:trends.profit"),
    customers: t("bi:trends.customers"),
  };

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
        title={t("bi:trends.title")}
        description={t("bi:trends.subtitle")}
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
            {granularityLabels[g.key]}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {queries.map(({ metric, data, isLoading }) => (
          <Card key={metric} className="glass-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{t("bi:trends.metricTrend", { metric: metricLabels[metric] })}</CardTitle>
                {data && (
                  <div className="text-right text-xs">
                    <span className="font-semibold">{t("bi:trends.total")}: </span>
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
                    { key: metric, name: metricLabels[metric], color: trendColors[metric] },
                    { key: "cumulative", name: t("bi:trends.cumulative"), color: "hsl(var(--muted-foreground))" },
                  ]}
                  height={260}
                />
              )}
              {data && (
                <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
                  <span>{t("bi:trends.min")}: {metric === "revenue" || metric === "profit" ? formatCurrency(data.min_value) : data.min_value.toLocaleString()}</span>
                  <span>{t("bi:trends.avg")}: {metric === "revenue" || metric === "profit" ? formatCurrency(data.average) : data.average.toLocaleString()}</span>
                  <span>{t("bi:trends.max")}: {metric === "revenue" || metric === "profit" ? formatCurrency(data.max_value) : data.max_value.toLocaleString()}</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DonutChartCard
          title={t("bi:executiveDashboard.categoryBreakdown")}
          description={t("bi:trends.revenueByCategoryDescription")}
          data={(catAgg?.buckets ?? []).map(b => ({ name: b.label, value: b.value }))}
          height={280}
        />
        <AreaChartCard
          title={t("bi:trends.cumulativeRevenue")}
          description={t("bi:trends.cumulativeRevenueDescription")}
          data={(revenueQ.data?.points ?? []).map(p => ({ period: p.period, cumulative: p.cumulative }))}
          xKey="period"
          series={[{ key: "cumulative", name: t("bi:trends.cumulative"), color: "hsl(var(--chart-1))" }]}
          height={280}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RadarChartCard
          title={t("bi:trends.performanceRadar")}
          description={t("bi:trends.performanceRadarDescription")}
          data={METRICS.map(m => {
            const q = queries.find(q => q.metric === m);
            const maxV = q?.data?.max_value ?? 1;
            return { subject: metricLabels[m], score: maxV > 0 ? Math.min(100, Math.round((q?.data?.average ?? 0) / maxV * 100)) : 0 };
          })}
          series={[{ key: "score", name: t("bi:trends.score"), color: "hsl(var(--primary))" }]}
          height={320}
        />
        <DonutChartCard
          title={t("bi:trends.revenueByCountry")}
          description={t("bi:trends.revenueByCountryDescription")}
          data={(countryAgg?.buckets ?? []).slice(0, 8).map(b => ({ name: b.label, value: b.value }))}
          height={320}
        />
      </div>
    </div>
  );
}
