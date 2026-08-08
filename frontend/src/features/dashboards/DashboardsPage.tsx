import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus, Search, Star, Trash2, Eye, Pencil } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataPagination } from "@/components/common/DataPagination";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { DashboardDialog } from "@/features/dashboards/DashboardDialog";
import { dashboardsApi } from "@/features/dashboards/api";
import { getErrorMessage } from "@/lib/error-messages";
import { cn } from "@/lib/utils";
import type { Dashboard } from "@/types";

const PAGE_SIZE = 9;

export function DashboardsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Dashboard | null>(null);
  const [deleting, setDeleting] = useState<Dashboard | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["dashboards", page, debouncedSearch],
    queryFn: () =>
      dashboardsApi.list({
        page,
        page_size: PAGE_SIZE,
        search: debouncedSearch || undefined,
      }),
  });

  const favoriteMutation = useMutation({
    mutationFn: (id: string) => dashboardsApi.toggleFavorite(id),
    onSuccess: () => {
    },
    onError: (error: unknown) => {
      toast({
        title: t("dashboards:actionFailed"),
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => dashboardsApi.remove(id),
    onSuccess: () => {
      toast({ title: t("dashboards:deletedToast"), variant: "success" });
      setDeleting(null);
    },
    onError: (error: unknown) => {
      toast({
        title: t("dashboards:deleteFailedToast"),
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  if (isError) {
    return <ErrorState message={t("dashboards:loadFailed")} onRetry={() => void refetch()} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("dashboards:title")} description={t("dashboards:description")}>
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          {t("dashboards:add")}
        </Button>
      </PageHeader>

      <div className="relative max-w-sm">
        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="ps-9"
          placeholder={t("dashboards:searchPlaceholder")}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : (data?.items.length ?? 0) === 0 ? (
        <EmptyState
          title={t("dashboards:emptyTitle")}
          description={t("dashboards:emptyDescription")}
          actionLabel={t("dashboards:create")}
          onAction={() => setDialogOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data?.items.map((dashboard) => (
            <Card key={dashboard.id} className="glass-card group overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <Link to={`/dashboards/${dashboard.id}`} className="min-w-0">
                    <CardTitle className="truncate text-base transition-colors group-hover:text-primary">
                      {dashboard.name}
                    </CardTitle>
                    <CardDescription className="mt-1 line-clamp-2 min-h-[2rem]">
                      {dashboard.description || t("dashboards:noDescription")}
                    </CardDescription>
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <span className="sr-only">{t("labels.actions")}</span>
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                          <circle cx="12" cy="5" r="1.5" />
                          <circle cx="12" cy="12" r="1.5" />
                          <circle cx="12" cy="19" r="1.5" />
                        </svg>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setEditing(dashboard); setDialogOpen(true); }}>
                        <Pencil />
                        {t("actions.edit")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => favoriteMutation.mutate(dashboard.id)}>
                        <Star className={dashboard.is_favorite ? "fill-current" : undefined} />
                        {dashboard.is_favorite ? t("dashboards:unfavorite") : t("dashboards:favorite")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDeleting(dashboard)} className="text-destructive focus:text-destructive">
                        <Trash2 />
                        {t("actions.delete")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={dashboard.is_public ? "info" : "secondary"}>
                      {dashboard.is_public ? t("dashboards:public") : t("dashboards:private")}
                    </Badge>
                    {dashboard.is_favorite && (
                      <Badge variant="warning">
                        <Star className="ms-1 h-3 w-3 fill-current" />
                        {t("dashboards:favorite")}
                      </Badge>
                    )}
                    <Badge variant="outline">{t("dashboards:kpiCount", { count: dashboard.kpi_count })}</Badge>
                  </div>
                  <Button asChild variant="ghost" size="sm">
                    <Link to={`/dashboards/${dashboard.id}`}>
                      <Eye className="h-4 w-4" />
                      {t("actions.open")}
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <DataPagination
        page={page}
        pages={data?.pages ?? 1}
        total={data?.total ?? 0}
        onPageChange={setPage}
        className={cn(isLoading || (data?.items.length ?? 0) === 0 ? "hidden" : "")}
      />

      <DashboardDialog open={dialogOpen} onOpenChange={setDialogOpen} dashboard={editing} />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        onConfirm={() => (deleting ? deleteMutation.mutateAsync(deleting.id) : Promise.resolve())}
        title={t("dashboards:deleteConfirmTitle")}
        description={
          deleting
            ? t("dashboards:deleteConfirmDescription", { name: deleting.name })
            : undefined
        }
        confirmLabel={t("actions.delete")}
      />
    </div>
  );
}
