import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Zap } from "lucide-react";

import { BarChartCard } from "@/components/charts";
import { DateFilter } from "@/components/common/DateFilter";
import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { biApi } from "@/features/bi/api";
import { cn } from "@/lib/utils";
import { useDateFilterStore } from "@/stores/date-filter-store";

const METRICS = [
  { key: "revenue", label: "Revenue", format: "currency" as const },
  { key: "orders", label: "Orders", format: "number" as const },
  { key: "profit", label: "Profit", format: "currency" as const },
  { key: "customers", label: "Customers", format: "number" as const },
];

const PERIODS_OPTIONS = [3, 6, 12, 24];

export function ForecastPage() {
  const { dateFrom, dateTo, getParams } = useDateFilterStore();
  const params = getParams();
  const [metric, setMetric] = useState("revenue");
  const [periods, setPeriods] = useState(6);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["bi", "forecast", metric, periods, dateFrom, dateTo],
    queryFn: () => biApi.forecast(metric, periods, params),
  });

  if (isError) return <ErrorState message="Could not load forecast." onRetry={() => void refetch()} />;

  const points = data?.points ?? [];
  const chartData = points.map(p => ({
    period: p.period,
    actual: p.actual,
    predicted: p.predicted,
    lower: p.lower_bound,
    upper: p.upper_bound,
  }));

  const trendColors: Record<string, string> = {
    up: "text-emerald-600 dark:text-emerald-400",
    down: "text-red-600 dark:text-red-400",
    stable: "text-muted-foreground",
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Forecasting"
        description="Predictive analytics and trend projections"
      >
        <DateFilter />
      </PageHeader>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Metric:</span>
          <div className="flex gap-1">
            {METRICS.map(m => (
              <Button
                key={m.key}
                variant={metric === m.key ? "default" : "outline"}
                size="sm"
                onClick={() => setMetric(m.key)}
              >
                {m.label}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Forecast:</span>
          <div className="flex gap-1">
            {PERIODS_OPTIONS.map(p => (
              <Button
                key={p}
                variant={periods === p ? "default" : "outline"}
                size="sm"
                onClick={() => setPeriods(p)}
              >
                {p}M
              </Button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <Card className="glass-card">
          <CardContent className="p-6 space-y-3">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
            <Card className="glass-card lg:col-span-3">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <TrendingUp className="h-4 w-4" />
                  {METRICS.find(m => m.key === metric)?.label} Forecast
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ height: 360 }}>
                  <svg viewBox="0 0 800 340" className="h-full w-full">
                    {(() => {
                      if (chartData.length === 0) return null;
                      const vals = chartData.flatMap(d => [d.predicted, d.upper, d.actual ?? d.predicted]);
                      const minV = Math.min(...vals) * 0.9;
                      const maxV = Math.max(...vals) * 1.1;
                      const pad = { l: 60, r: 20, t: 20, b: 40 };
                      const w = 800 - pad.l - pad.r;
                      const h = 340 - pad.t - pad.b;

                      const sx = (i: number) => pad.l + (i / (chartData.length - 1)) * w;
                      const sy = (v: number) => pad.t + h - ((v - minV) / (maxV - minV)) * h;

                      const gridLines = 5;
                      const gridTicks = Array.from({ length: gridLines }, (_, i) => {
                        const v = minV + ((maxV - minV) * i) / (gridLines - 1);
                        return v;
                      });

                      const actualPath = chartData
                        .filter(d => d.actual !== null && d.actual !== undefined)
                        .map((d, i) => `${i === 0 ? "M" : "L"} ${sx(chartData.indexOf(d))} ${sy(d.actual!)}`)
                        .join(" ");

                      const predPath = chartData
                        .map((d, i) => `${i === 0 ? "M" : "L"} ${sx(i)} ${sy(d.predicted)}`)
                        .join(" ");

                      const bandPoints = chartData
                        .map((d, i) => `${sx(i)},${sy(d.upper)}`)
                        .concat([...chartData].reverse().map((d, i) => `${sx(chartData.length - 1 - i)},${sy(d.lower)}`))
                        .join(" ");

                      const splitIdx = chartData.findIndex(d => d.actual === null || d.actual === undefined);

                      return (
                        <g>
                          {gridTicks.map((v, i) => (
                            <g key={i}>
                              <line x1={pad.l} y1={sy(v)} x2={800 - pad.r} y2={sy(v)} stroke="hsl(var(--border))" strokeDasharray="4 4" />
                              <text x={pad.l - 8} y={sy(v) + 4} textAnchor="end" fontSize={11} fill="hsl(var(--muted-foreground))">
                                {metric === "orders" || metric === "customers" ? Math.round(v).toLocaleString() : `$${(v / 1000).toFixed(0)}K`}
                              </text>
                            </g>
                          ))}
                          {chartData.map((d, i) => (
                            <text key={i} x={sx(i)} y={340 - pad.b + 20} textAnchor="middle" fontSize={9} fill="hsl(var(--muted-foreground))">
                              {d.period.slice(5)}
                            </text>
                          ))}
                          {bandPoints && <polygon points={bandPoints} fill="hsl(var(--primary))" fillOpacity={0.08} />}
                          {actualPath && <path d={actualPath} fill="none" stroke="hsl(var(--chart-1))" strokeWidth={2.5} />}
                          {splitIdx > 0 && (
                            <line x1={sx(splitIdx - 1)} y1={pad.t} x2={sx(splitIdx - 1)} y2={pad.t + h} stroke="hsl(var(--muted-foreground))" strokeDasharray="6 4" strokeOpacity={0.5} />
                          )}
                          <path d={predPath} fill="none" stroke="hsl(var(--primary))" strokeWidth={2} strokeDasharray={splitIdx > 0 ? "" : "6 4"} />
                          {chartData.map((d, i) => (
                            <circle key={i} cx={sx(i)} cy={sy(d.predicted)} r={3} fill={d.actual !== null && d.actual !== undefined ? "hsl(var(--chart-1))" : "hsl(var(--primary))"} />
                          ))}
                          <g>
                            <rect x={pad.l} y={8} width={12} height={3} rx={1.5} fill="hsl(var(--chart-1))" />
                            <text x={pad.l + 16} y={12} fontSize={10} fill="hsl(var(--muted-foreground))">Actual</text>
                            <rect x={pad.l + 80} y={8} width={12} height={3} rx={1.5} fill="hsl(var(--primary))" />
                            <text x={pad.l + 96} y={12} fontSize={10} fill="hsl(var(--muted-foreground))">Forecast</text>
                            <rect x={pad.l + 160} y={8} width={12} height={3} rx={1.5} fill="hsl(var(--primary))" fillOpacity={0.2} />
                            <text x={pad.l + 176} y={12} fontSize={10} fill="hsl(var(--muted-foreground))">Confidence Band</text>
                          </g>
                        </g>
                      );
                    })()}
                  </svg>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card className="glass-card">
                <CardContent className="p-5 text-center">
                  <TrendingUp className="mx-auto mb-2 h-8 w-8 text-primary" />
                  <p className="text-xs text-muted-foreground">Forecast Trend</p>
                  <p className={cn("text-2xl font-bold capitalize", trendColors[data?.trend ?? "stable"] ?? "")}>
                    {data?.trend ?? "—"}
                  </p>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="p-5 text-center">
                  <Zap className="mx-auto mb-2 h-8 w-8 text-amber-500" />
                  <p className="text-xs text-muted-foreground">Growth Rate</p>
                  <p className="text-2xl font-bold">
                    {data?.growth_pct !== undefined ? `${data.growth_pct >= 0 ? "+" : ""}${data.growth_pct.toFixed(1)}%` : "—"}
                  </p>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="p-5 text-center">
                  <p className="text-xs text-muted-foreground">Confidence</p>
                  <p className="mt-1 text-2xl font-bold">
                    {data?.confidence !== undefined ? `${(data.confidence * 100).toFixed(0)}%` : "—"}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          <BarChartCard
            title="Forecast Comparison"
            description="Actual vs Predicted values"
            data={chartData.map(d => ({
              period: d.period,
              ...(d.actual !== null && d.actual !== undefined ? { Actual: d.actual } : {}),
              Predicted: d.predicted,
            }))}
            xKey="period"
            series={[
              ...(chartData.some(d => d.actual !== null) ? [{ key: "Actual", name: "Actual", color: "hsl(var(--chart-1))" }] : []),
              { key: "Predicted", name: "Predicted", color: "hsl(var(--primary))" },
            ]}
            height={280}
          />
        </>
      )}
    </div>
  );
}
