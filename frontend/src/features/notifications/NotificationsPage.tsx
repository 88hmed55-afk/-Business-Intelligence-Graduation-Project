import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Bell, Check, CheckCheck, Info, TriangleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";

import { DataPagination } from "@/components/common/DataPagination";
import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { notificationsApi } from "@/features/notifications/api";
import { getErrorMessage } from "@/lib/error-messages";
import { cn, formatDate } from "@/lib/utils";
import type { NotificationType } from "@/types";

const PAGE_SIZE = 12;

const typeVariant: Record<NotificationType, "info" | "success" | "warning" | "destructive"> = {
  info: "info",
  success: "success",
  warning: "warning",
  error: "destructive",
};

const typeIcon: Record<NotificationType, React.ReactNode> = {
  info: <Info className="h-4 w-4" />,
  success: <Check className="h-4 w-4" />,
  warning: <TriangleAlert className="h-4 w-4" />,
  error: <TriangleAlert className="h-4 w-4" />,
};

const filterOptions: Array<{ value: string; label: string }> = [
  { value: "", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "read", label: "Read" },
];

export function NotificationsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<"" | "unread" | "read">("");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["notifications", page, filter],
    queryFn: () =>
      notificationsApi.list({
        page,
        page_size: PAGE_SIZE,
        is_read: filter === "" ? undefined : filter === "read",
      }),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
    },
    onError: (error: unknown) => {
      toast({
        title: t("notifications:updateFailed"),
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      toast({ title: t("notifications:readAllToast"), variant: "success" });
    },
    onError: (error: unknown) => {
      toast({
        title: t("notifications:markReadFailed"),
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const notifications = data?.items ?? [];
  const unread = notifications.filter((notification) => !notification.is_read).length;

  if (isError) {
    return <ErrorState message={t("notifications:loadFailed")} onRetry={() => void refetch()} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("notifications:title")}
        description={t("notifications:description")}
      >
        <Button
          variant="outline"
          disabled={unread === 0 || markAllMutation.isPending}
          onClick={() => markAllMutation.mutate()}
        >
          <CheckCheck className="h-4 w-4" />
          {t("notifications:markAllRead")}
        </Button>
      </PageHeader>

      <div className="flex items-center gap-3">
        <Select
          value={filter}
          onValueChange={(value) => {
            setFilter(value as "" | "unread" | "read");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder={t("labels.all")} />
          </SelectTrigger>
          <SelectContent>
            {filterOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.value === ""
                  ? t("labels.all")
                  : t(`notifications:statuses.${option.value}`, { defaultValue: option.label })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {unread > 0 && (
          <Badge variant="info">{t("notifications:unreadCount", { count: unread })}</Badge>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-xl border bg-muted/50" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-xl border p-12 text-center">
          <Bell className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 font-medium">{t("notifications:emptyTitle")}</p>
          <p className="text-sm text-muted-foreground">{t("notifications:emptyDescription")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {notifications.map((notification) => (
            <button
              key={notification.id}
              type="button"
              onClick={() => {
                if (!notification.is_read) markReadMutation.mutate(notification.id);
              }}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-4 text-start transition-colors",
                notification.is_read
                  ? "bg-background hover:bg-muted/40"
                  : "border-primary/30 bg-primary/5 hover:bg-primary/10",
              )}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
                {typeIcon[notification.notification_type]}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{notification.title}</p>
                  <Badge variant={typeVariant[notification.notification_type]}>
                    {t(`notifications:types.${notification.notification_type}`)}
                  </Badge>
                </div>
                {notification.body && (
                  <p className="mt-1 text-sm text-muted-foreground">{notification.body}</p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">{formatDate(notification.created_at)}</p>
              </div>
              {!notification.is_read && (
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
              )}
            </button>
          ))}
        </div>
      )}

      <DataPagination
        page={page}
        pages={data?.pages ?? 1}
        total={data?.total ?? 0}
        onPageChange={setPage}
        className={cn(isLoading || notifications.length === 0 ? "hidden" : "")}
      />
    </div>
  );
}
