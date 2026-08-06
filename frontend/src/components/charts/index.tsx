import type { ReactElement, ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid hsl(var(--border))",
  background: "hsl(var(--popover))",
  fontSize: 13,
} as const;

interface ChartCardProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  height?: number;
  children?: ReactElement;
  className?: string;
}

export function ChartCard({ title, description, actions, height, children, className }: ChartCardProps) {
  return (
    <Card className={`glass-card ${className ?? ""}`}>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-base">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {actions}
      </CardHeader>
      <CardContent>
        <div style={{ height: height ?? 300 }} className="w-full">
          {children ? (
            <ResponsiveContainer width="100%" height="100%">
              {children}
            </ResponsiveContainer>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

interface SeriesConfig {
  key: string;
  name: string;
  color?: string;
}

interface AxisChartProps {
  data: Array<Record<string, unknown>>;
  xKey: string;
  series: SeriesConfig[];
  height?: number;
  stacked?: boolean;
}

function axisProps() {
  return {
    tick: { fontSize: 12 },
    tickLine: false as const,
    axisLine: false as const,
    stroke: "hsl(var(--muted-foreground))",
  };
}

export function LineChartCard({ data, xKey, series, height, ...props }: AxisChartProps & ChartCardProps) {
  return (
    <ChartCard height={height} {...props}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
        <XAxis dataKey={xKey} {...axisProps()} />
        <YAxis {...axisProps()} />
        <Tooltip contentStyle={tooltipStyle} />
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={s.color ?? "hsl(var(--primary))"}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5 }}
          />
        ))}
      </LineChart>
    </ChartCard>
  );
}

export function AreaChartCard({ data, xKey, series, height, stacked, ...props }: AxisChartProps & ChartCardProps) {
  return (
    <ChartCard height={height} {...props}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <defs>
          {series.map((s, index) => (
            <linearGradient key={s.key} id={`grad-${index}`} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor={s.color ?? "hsl(var(--primary))"}
                stopOpacity={0.4}
              />
              <stop
                offset="95%"
                stopColor={s.color ?? "hsl(var(--primary))"}
                stopOpacity={0}
              />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
        <XAxis dataKey={xKey} {...axisProps()} />
        <YAxis {...axisProps()} />
        <Tooltip contentStyle={tooltipStyle} />
        {stacked && <Legend />}
        {series.map((s, index) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stackId={stacked ? "stack" : undefined}
            stroke={s.color ?? "hsl(var(--primary))"}
            strokeWidth={2}
            fill={`url(#grad-${index})`}
          />
        ))}
      </AreaChart>
    </ChartCard>
  );
}

export function BarChartCard({ data, xKey, series, height, stacked, ...props }: AxisChartProps & ChartCardProps) {
  return (
    <ChartCard height={height} {...props}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
        <XAxis dataKey={xKey} {...axisProps()} />
        <YAxis {...axisProps()} />
        <Tooltip contentStyle={tooltipStyle} />
        {stacked && <Legend />}
        {series.map((s, index) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.name}
            stackId={stacked ? "stack" : undefined}
            fill={s.color ?? `hsl(var(--chart-${(index % 5) + 1}))`}
            radius={stacked ? [0, 0, 4, 4] : [6, 6, 0, 0]}
            maxBarSize={stacked ? 32 : 44}
          />
        ))}
      </BarChart>
    </ChartCard>
  );
}

const PIE_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

interface PieSlice {
  name: string;
  value: number;
}

export function DonutChartCard({
  data,
  height,
  ...props
}: { data: PieSlice[]; height?: number } & ChartCardProps) {
  return (
    <ChartCard height={height} {...props}>
      <PieChart>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend />
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius="55%"
          outerRadius="85%"
          paddingAngle={3}
        >
          {data.map((_, index) => (
            <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
          ))}
        </Pie>
      </PieChart>
    </ChartCard>
  );
}

export function PieChartCard({
  data,
  height,
  ...props
}: { data: PieSlice[]; height?: number } & ChartCardProps) {
  return (
    <ChartCard height={height} {...props}>
      <PieChart>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend />
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius="85%"
        >
          {data.map((_, index) => (
            <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
          ))}
        </Pie>
      </PieChart>
    </ChartCard>
  );
}

export { PIE_COLORS };

interface HorizontalBarChartProps {
  data: Array<Record<string, unknown>>;
  yKey: string;
  series: SeriesConfig[];
  height?: number;
}

export function HorizontalBarChartCard({ data, yKey, series, height, ...props }: HorizontalBarChartProps & ChartCardProps) {
  return (
    <ChartCard height={height} {...props}>
      <BarChart data={data} layout="vertical" margin={{ top: 10, right: 10, left: 60, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
        <XAxis type="number" {...axisProps()} />
        <YAxis type="category" dataKey={yKey} {...axisProps()} width={80} />
        <Tooltip contentStyle={tooltipStyle} />
        {series.map((s, index) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.name}
            fill={s.color ?? `hsl(var(--chart-${(index % 5) + 1}))`}
            radius={[0, 6, 6, 0]}
            maxBarSize={28}
          />
        ))}
      </BarChart>
    </ChartCard>
  );
}

interface ScatterChartProps {
  data: Array<Record<string, unknown>>;
  xKey: string;
  yKey: string;
  zKey?: string;
  color?: string;
  height?: number;
}

export function ScatterChartCard({ data, xKey, yKey, zKey, color, height, ...props }: ScatterChartProps & Omit<ChartCardProps, "children">) {
  return (
    <ChartCard height={height} {...props}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
        <XAxis dataKey={xKey} {...axisProps()} />
        <YAxis dataKey={yKey} {...axisProps()} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar
          dataKey={yKey}
          fill={color ?? "hsl(var(--chart-1))"}
          radius={[6, 6, 0, 0]}
          maxBarSize={40}
        />
        {zKey && (
          <Bar dataKey={zKey} fill={color ?? "hsl(var(--chart-2))"} radius={[6, 6, 0, 0]} maxBarSize={40} />
        )}
      </BarChart>
    </ChartCard>
  );
}

interface RadarDataItem {
  subject: string;
  [key: string]: string | number;
}

interface RadarChartProps {
  data: RadarDataItem[];
  series: SeriesConfig[];
  height?: number;
}

export function RadarChartCard({ data, series, height, ...props }: RadarChartProps & Omit<ChartCardProps, "children">) {
  return (
    <ChartCard height={height} {...props}>
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        <svg viewBox="0 0 400 300" className="h-full w-full">
          {(() => {
            const cx = 200, cy = 150, maxR = 110;
            const n = data.length;
            if (n === 0) return null;
            const angleStep = (2 * Math.PI) / n;
            const rings = [1, 0.75, 0.5, 0.25];
            return (
              <>
                {rings.map((scale, ri) => (
                  <polygon
                    key={ri}
                    points={data.map((_, i) => {
                      const a = angleStep * i - Math.PI / 2;
                      return `${cx + maxR * scale * Math.cos(a)},${cy + maxR * scale * Math.sin(a)}`;
                    }).join(" ")}
                    fill="none"
                    stroke="hsl(var(--border))"
                    strokeWidth={1}
                    opacity={0.5}
                  />
                ))}
                {data.map((_, i) => {
                  const a = angleStep * i - Math.PI / 2;
                  const lx = cx + (maxR + 16) * Math.cos(a);
                  const ly = cy + (maxR + 16) * Math.sin(a);
                  return (
                    <text key={i} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
                      className="fill-muted-foreground" fontSize={10}>
                      {data[i].subject}
                    </text>
                  );
                })}
                {series.map((s, si) => {
                  const color = s.color ?? `hsl(var(--chart-${(si % 5) + 1}))`;
                  const maxVal = Math.max(...data.map(d => Number(d[s.key]) || 0), 1);
                  const pts = data.map((d, i) => {
                    const a = angleStep * i - Math.PI / 2;
                    const r = (Number(d[s.key]) || 0) / maxVal * maxR;
                    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
                  }).join(" ");
                  return (
                    <g key={s.key}>
                      <polygon points={pts} fill={color} fillOpacity={0.15} stroke={color} strokeWidth={2} />
                      {data.map((d, i) => {
                        const a = angleStep * i - Math.PI / 2;
                        const r = (Number(d[s.key]) || 0) / maxVal * maxR;
                        return (
                          <circle key={i} cx={cx + r * Math.cos(a)} cy={cy + r * Math.sin(a)}
                            r={3} fill={color} />
                        );
                      })}
                    </g>
                  );
                })}
              </>
            );
          })()}
        </svg>
      </div>
    </ChartCard>
  );
}

interface HeatMapCell {
  row: string;
  col: string;
  value: number;
}

interface HeatMapProps {
  cells: HeatMapCell[];
  rowKey: string;
  colKey: string;
  height?: number;
}

const HEAT_SCALE = ["hsl(210 40% 98%)", "hsl(var(--chart-2))", "hsl(var(--primary))", "hsl(var(--destructive))"];

function heatColor(value: number, min: number, max: number): string {
  if (max === min) return HEAT_SCALE[0];
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const idx = Math.min(Math.floor(t * (HEAT_SCALE.length - 1)), HEAT_SCALE.length - 2);
  return HEAT_SCALE[idx + 1];
}

export function HeatMapCard({ cells, rowKey, colKey, height, ...props }: HeatMapProps & Omit<ChartCardProps, "children">) {
  const rows = [...new Set(cells.map(c => c.row))];
  const cols = [...new Set(cells.map(c => c.col))];
  const values = cells.map(c => c.value);
  const min = Math.min(...values);
  const max = Math.max(...values);

  return (
    <ChartCard height={height} {...props}>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="p-1" />
              {cols.map(c => (
                <th key={c} className="p-1 text-center font-medium text-muted-foreground">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r}>
                <td className="p-1 font-medium text-muted-foreground whitespace-nowrap">{r}</td>
                {cols.map(c => {
                  const cell = cells.find(x => x.row === r && x.col === c);
                  const v = cell?.value ?? 0;
                  return (
                    <td key={c} className="p-0.5">
                      <div
                        className="flex h-8 items-center justify-center rounded text-[10px] font-medium"
                        style={{ backgroundColor: heatColor(v, min, max), color: v > (max - min) / 2 + min ? "#fff" : "inherit" }}
                      >
                        {v.toLocaleString()}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartCard>
  );
}
