import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Gauge, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useIsRTL } from "@/hooks/use-direction";
import { Link, useParams } from "react-router-dom";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { DashboardDialog } from "@/features/dashboards/DashboardDialog";
import { dashboardsApi } from "@/features/dashboards/api";
import { kpisApi } from "@/features/kpis/api";
import { getErrorMessage } from "@/lib/error-messages";
import { cn, toTitleCase } from "@/lib/utils";

export function DashboardDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const { toast } = useToast();

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const dashboardQuery = useQuery({
    queryKey: ["dashboards", id],
    queryFn: () => dashboardsApi.get(id),
    enabled: Boolean(id),
  });

  const kpisQuery = useQuery({
    queryKey: ["kpis", { dashboard_id: id }],
    queryFn: () => kpisApi.list({ dashboard_id: id, page_size: 100 }),
    enabled: Boolean(id),
  });

  const favoriteMutation = useMutation({
    mutationFn: () => dashboardsApi.toggleFavorite(id),
    onError: (error: unknown) => {
      toast({
        title: t("dashboards:actionFailed"),
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => dashboardsApi.remove(id),
    onSuccess: () => {
      toast({ title: t("dashboards:deletedToast"), variant: "success" });
      setDeleteOpen(false);
    },
    onError: (error: unknown) => {
      toast({
        title: t("dashboards:deleteFailedToast"),
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  if (dashboardQuery.isError) {
    return (
      <ErrorState
        message={t("dashboards:loadDetailFailed")}
        onRetry={() => void dashboardQuery.refetch()}
      />
    );
  }

  if (dashboardQuery.isLoading) {
    return <LoadingState label={t("dashboards:loading")} />;
  }

  const dashboard = dashboardQuery.data;
  if (!dashboard) {
    return <ErrorState message={t("dashboards:notFound")} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-3 -ms-2">
          <Link to="/dashboards">
            <BackIcon className="h-4 w-4" />
            {t("dashboards:allDashboards")}
          </Link>
        </Button>
        <PageHeader
          title={dashboard.name}
          description={dashboard.description ?? t("dashboards:noDescription")}
        >
          <Button
            variant="outline"
            onClick={() => favoriteMutation.mutate()}
            className={dashboard.is_favorite ? "text-amber-500" : undefined}
          >
            <Star className={cn("h-4 w-4", dashboard.is_favorite && "fill-current")} />
            {dashboard.is_favorite ? t("dashboards:favorited") : t("dashboards:favorite")}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label={t("dashboards:actionsLabel")}>
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                  <circle cx="12" cy="5" r="1.5" />
                  <circle cx="12" cy="12" r="1.5" />
                  <circle cx="12" cy="19" r="1.5" />
                </svg>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setDialogOpen(true)}>
                <Pencil />
                {t("actions.edit")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDeleteOpen(true)} className="text-destructive focus:text-destructive">
                <Trash2 />
                {t("actions.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button asChild>
            <Link to="/kpis">
              <Plus className="h-4 w-4" />
              {t("dashboards:addKpi")}
            </Link>
          </Button>
        </PageHeader>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant={dashboard.is_public ? "info" : "secondary"}>
          {dashboard.is_public ? t("dashboards:public") : t("dashboards:private")}
        </Badge>
        <Badge variant="outline">
          {t("dashboards:createdOn", { date: new Date(dashboard.created_at).toLocaleDateString() })}
        </Badge>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold">{t("dashboards:kpisHeading")}</h2>
        {kpisQuery.isLoading ? (
          <LoadingState label={t("dashboards:loadingKpis")} />
        ) : (kpisQuery.data?.items.length ?? 0) === 0 ? (
          <EmptyState
            title={t("dashboards:noKpisTitle")}
            description={t("dashboards:noKpisDescription")}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {kpisQuery.data?.items.map((kpi) => {
              const target = kpi.target_value ? Number(kpi.target_value) : null;
              const current = kpi.current_value ? Number(kpi.current_value) : null;
              const progress = kpi.progress ?? (target && current ? (current / target) * 100 : null);
              return (
                <Card key={kpi.id} className="glass-card">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{kpi.name}</p>
                        <p className="text-xs text-muted-foreground">{toTitleCase(kpi.category)}</p>
                      </div>
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Gauge className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-4 flex items-baseline gap-2">
                      <span className="text-2xl font-bold">
                        {current?.toLocaleString() ?? "—"}
                        {kpi.unit ? <span className="ms-1 text-sm text-muted-foreground">{kpi.unit}</span> : null}
                      </span>
                      {target && <span className="text-xs text-muted-foreground">/ {target.toLocaleString()}</span>}
                    </div>
                    {progress !== null && (
                      <div className="mt-3 space-y-1.5">
                        <Progress
                          value={progress}
                          className="h-1.5"
                          indicatorClassName={progress >= 100 ? "bg-emerald-500" : progress >= 70 ? "bg-primary" : "bg-amber-500"}
                        />
                        <p className="text-right text-xs font-medium text-muted-foreground">
                          {t("dashboards:progressAchieved", { progress: progress.toFixed(0) })}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <DashboardDialog open={dialogOpen} onOpenChange={setDialogOpen} dashboard={dashboard} />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={() => deleteMutation.mutateAsync()}
        title={t("dashboards:deleteConfirmTitle")}
        description={t("dashboards:deleteConfirmDescription", { name: dashboard.name })}
        confirmLabel={t("actions.delete")}
      />
    </div>
  );
}
