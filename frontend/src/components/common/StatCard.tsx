import type { ReactNode } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Card, CardContent } from "@/components/ui/card";
import { cn, formatCompact } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: number | null | undefined;
  icon?: ReactNode;
  delta?: number | null;
  deltaPercent?: number | null;
  suffix?: string;
  className?: string;
  children?: ReactNode;
}

export function StatCard({
  title,
  value,
  icon,
  delta,
  deltaPercent,
  suffix,
  className,
  children,
}: StatCardProps) {
  const { t } = useTranslation();
  const hasDelta = delta !== null && delta !== undefined && delta !== 0;
  const isPositive = (delta ?? 0) > 0;

  return (
    <Card className={cn("glass-card overflow-hidden", className)}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {icon && (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {icon}
            </div>
          )}
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          {children ?? (
            <span className="text-3xl font-bold tracking-tight">
              {formatCompact(value)}
              {suffix && <span className="ms-1 text-lg font-semibold text-muted-foreground">{suffix}</span>}
            </span>
          )}
        </div>
        {hasDelta && (
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium",
                isPositive
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  : "bg-rose-500/15 text-rose-600 dark:text-rose-400",
              )}
            >
              {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {isPositive ? "+" : ""}
              {deltaPercent !== null && deltaPercent !== undefined
                ? `${deltaPercent.toFixed(1)}%`
                : `${delta.toFixed(1)}`}
            </span>
            <span className="text-muted-foreground">{t("nav:stats.vsLastPeriod")}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
