import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";
import { useTranslation } from "react-i18next";

import { DataPagination } from "@/components/common/DataPagination";
import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { activityLogsApi } from "@/features/activity-logs/api";
import { cn, formatDate, toTitleCase } from "@/lib/utils";
import type { ActivityAction } from "@/types";

const PAGE_SIZE = 15;

const actionVariant: Record<ActivityAction, "success" | "info" | "destructive" | "secondary" | "warning" | "outline"> = {
  create: "success",
  update: "info",
  delete: "destructive",
  login: "secondary",
  logout: "secondary",
  export: "outline",
  publish: "warning",
  archive: "secondary",
  restore: "success",
  import: "outline",
};

const actionKeys: Record<ActivityAction, string> = {
  create: "created",
  update: "updated",
  delete: "deleted",
  login: "logged_in",
  logout: "logged_out",
  export: "exported",
  publish: "publish",
  archive: "archive",
  restore: "restore",
  import: "import",
};

const actionOptions: Array<{ value: string; label: string }> = [
  { value: "", label: "All actions" },
  { value: "create", label: "Create" },
  { value: "update", label: "Update" },
  { value: "delete", label: "Delete" },
  { value: "login", label: "Login" },
  { value: "logout", label: "Logout" },
  { value: "export", label: "Export" },
  { value: "publish", label: "Publish" },
  { value: "archive", label: "Archive" },
  { value: "restore", label: "Restore" },
  { value: "import", label: "Import" },
];

export function ActivityLogsPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [action, setAction] = useState<ActivityAction | "">("");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["activity-logs", page, action],
    queryFn: () =>
      activityLogsApi.list({
        page,
        page_size: PAGE_SIZE,
        action: action || undefined,
      }),
  });

  if (isError) {
    return <ErrorState message={t("activityLogs:loadFailed")} onRetry={() => void refetch()} />;
  }

  const logs = data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("activityLogs:title")}
        description={t("activityLogs:description")}
      />

      <Select
        value={action}
        onValueChange={(value) => {
          setAction(value as ActivityAction | "");
          setPage(1);
        }}
      >
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue placeholder={t("activityLogs:filterAction")} />
        </SelectTrigger>
        <SelectContent>
          {actionOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.value === ""
                ? t("activityLogs:filterAction")
                : t(`activityLogs:actions.${actionKeys[option.value as ActivityAction]}`, { defaultValue: option.label })}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="rounded-xl border">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="h-10 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <History className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 font-medium">{t("activityLogs:noActivityTitle")}</p>
            <p className="text-sm text-muted-foreground">{t("activityLogs:noActivityDescription")}</p>
          </div>
        ) : (
          <div className="divide-y">
            {logs.map((log) => (
              <div key={log.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={actionVariant[log.action]}>
                      {t(`activityLogs:actions.${actionKeys[log.action]}`, { defaultValue: toTitleCase(log.action) })}
                    </Badge>
                    <span className="text-sm font-medium">
                      {log.module} {log.summary && <span className="font-normal text-muted-foreground">· {log.summary}</span>}
                    </span>
                  </div>
                  {log.details && Object.keys(log.details).length > 0 && (
                    <pre className="mt-2 max-w-full overflow-x-auto rounded-lg bg-muted/60 p-2 text-xs text-muted-foreground">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  )}
                </div>
                <div className="shrink-0 text-right text-xs text-muted-foreground">
                  <p className="whitespace-nowrap">{formatDate(log.created_at)}</p>
                  <p>{log.user_email ?? t("activityLogs:system")}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <DataPagination
        page={page}
        pages={data?.pages ?? 1}
        total={data?.total ?? 0}
        onPageChange={setPage}
        className={cn(isLoading || logs.length === 0 ? "hidden" : "")}
      />
    </div>
  );
}
