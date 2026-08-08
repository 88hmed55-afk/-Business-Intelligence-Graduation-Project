import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Archive, FileText, PenLine, Plus, Search, Send, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataPagination } from "@/components/common/DataPagination";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { ReportDialog } from "@/features/reports/ReportDialog";
import { reportsApi } from "@/features/reports/api";
import { getErrorMessage } from "@/lib/error-messages";
import { cn, formatDateShort } from "@/lib/utils";
import type { Report, ReportStatus } from "@/types";

const PAGE_SIZE = 10;

const statusVariant: Record<ReportStatus, "success" | "secondary" | "outline"> = {
  published: "success",
  draft: "secondary",
  archived: "outline",
};

const statusOptions: Array<{ value: ReportStatus | "all"; label: string }> = [
  { value: "all", label: "allStatuses" },
  { value: "draft", label: "statuses.draft" },
  { value: "published", label: "statuses.published" },
  { value: "archived", label: "statuses.archived" },
];

export function ReportsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<ReportStatus | "all">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Report | null>(null);
  const [deleting, setDeleting] = useState<Report | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["reports", page, debouncedSearch, status],
    queryFn: () =>
      reportsApi.list({
        page,
        page_size: PAGE_SIZE,
        search: debouncedSearch || undefined,
        status: status === "all" ? undefined : status,
      }),
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const publishMutation = useMutation({
    mutationFn: (id: string) => reportsApi.publish(id),
    onSuccess: () => {
      toast({ title: t("reports:publishedToast"), variant: "success" });
    },
    onError: (error: unknown) => {
      toast({
        title: t("reports:publishFailedToast"),
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => reportsApi.archive(id),
    onSuccess: () => {
      toast({ title: t("reports:archivedToast"), variant: "success" });
    },
    onError: (error: unknown) => {
      toast({
        title: t("reports:archiveFailedToast"),
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => reportsApi.remove(id),
    onSuccess: () => {
      toast({ title: t("reports:deletedToast"), variant: "success" });
      setDeleting(null);
    },
    onError: (error: unknown) => {
      toast({
        title: t("reports:deleteFailedToast"),
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  if (isError) {
    return <ErrorState message={t("reports:loadFailed")} onRetry={() => void refetch()} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("reports:title")} description={t("reports:savedDescription")}>
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          {t("reports:add")}
        </Button>
      </PageHeader>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="ps-9"
            placeholder={t("reports:searchPlaceholder")}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <Select
          value={status}
          onValueChange={(value: ReportStatus | "all") => {
            setStatus(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder={t("reports:filterStatus")} />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {t(`reports:${option.label}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full" />
          ))}
        </div>
      ) : (data?.items.length ?? 0) === 0 ? (
        <EmptyState
          title={t("reports:noSavedTitle")}
          description={t("reports:noSavedDescription")}
        />
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("reports:table.name")}</TableHead>
                <TableHead>{t("labels.description")}</TableHead>
                <TableHead>{t("reports:table.status")}</TableHead>
                <TableHead>{t("reports:table.schedule")}</TableHead>
                <TableHead>{t("reports:table.updated")}</TableHead>
                <TableHead className="text-end">{t("labels.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.items.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-medium">
                    <span className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      {report.name}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-[240px] truncate text-muted-foreground">
                    {report.description || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[report.status]}>
                      {t(`reports:statuses.${report.status}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {report.schedule ? (
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{report.schedule}</code>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateShort(report.updated_at)}
                  </TableCell>
                  <TableCell className="text-end">
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
                        <DropdownMenuItem
                          onClick={() => {
                            setEditing(report);
                            setDialogOpen(true);
                          }}
                        >
                          <PenLine />
                          {t("actions.edit")}
                        </DropdownMenuItem>
                        {report.status !== "published" && (
                          <DropdownMenuItem onClick={() => publishMutation.mutate(report.id)}>
                            <Send />
                            {t("reports:publish")}
                          </DropdownMenuItem>
                        )}
                        {report.status !== "archived" && (
                          <DropdownMenuItem onClick={() => archiveMutation.mutate(report.id)}>
                            <Archive />
                            {t("reports:archive")}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => setDeleting(report)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 />
                          {t("actions.delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <DataPagination
        page={page}
        pages={data?.pages ?? 1}
        total={data?.total ?? 0}
        onPageChange={setPage}
        className={cn(isLoading || (data?.items.length ?? 0) === 0 ? "hidden" : "")}
      />

      <ReportDialog open={dialogOpen} onOpenChange={setDialogOpen} report={editing} />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        onConfirm={() => (deleting ? deleteMutation.mutateAsync(deleting.id) : Promise.resolve())}
        title={t("reports:deleteConfirmTitle")}
        description={deleting ? t("reports:deleteConfirmDescription", { name: deleting.name }) : undefined}
        confirmLabel={t("actions.delete")}
      />
    </div>
  );
}
