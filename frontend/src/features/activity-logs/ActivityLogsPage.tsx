import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";

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
    return <ErrorState message="Could not load activity logs." onRetry={() => void refetch()} />;
  }

  const logs = data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activity log"
        description="Audit trail of actions performed across the platform."
      />

      <Select
        value={action}
        onValueChange={(value) => {
          setAction(value as ActivityAction | "");
          setPage(1);
        }}
      >
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue placeholder="All actions" />
        </SelectTrigger>
        <SelectContent>
          {actionOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
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
            <p className="mt-3 font-medium">No activity recorded</p>
            <p className="text-sm text-muted-foreground">Actions across the platform will appear here.</p>
          </div>
        ) : (
          <div className="divide-y">
            {logs.map((log) => (
              <div key={log.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={actionVariant[log.action]}>{toTitleCase(log.action)}</Badge>
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
                  <p>{log.user_email ?? "System"}</p>
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
