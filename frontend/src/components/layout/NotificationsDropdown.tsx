import { useQuery } from "@tanstack/react-query";
import { Bell, BellOff, CheckCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { notificationsApi } from "@/features/notifications/api";
import { getErrorMessage } from "@/lib/error-messages";
import { cn, formatDateShort } from "@/lib/utils";
import { useNotificationStore } from "@/stores/notification-store";

const TYPE_STYLES: Record<string, string> = {
  info: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  success: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  warning: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  error: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
};

export function NotificationsDropdown() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { setUnreadCount, setRecent } = useNotificationStore();

  useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: async () => {
      const result = await notificationsApi.unreadCount();
      setUnreadCount(result.count);
      return result.count;
    },
    refetchInterval: 60_000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", "recent"],
    queryFn: async () => {
      const result = await notificationsApi.list({ page: 1, page_size: 8 });
      setRecent(result.items);
      return result;
    },
    refetchInterval: 60_000,
  });

  const markAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setUnreadCount(0);
      toast({ title: t("notifications:readAllToast"), variant: "success" });
    } catch (error) {
      toast({
        title: t("notifications:markReadFailed"),
        description: getErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  const count = useNotificationStore((state) => state.unreadCount);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={t("notifications:title")}>
          <Bell className="h-5 w-5" />
          {count > 0 && (
            <span className="absolute end-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>{t("notifications:title")}</span>
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={markAllRead}>
            <CheckCheck className="h-3.5 w-3.5" />
            {t("notifications:markAllRead")}
          </Button>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : (data?.items.length ?? 0) === 0 ? (
            <div className="flex flex-col items-center gap-2 p-6 text-center">
              <BellOff className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">{t("notifications:emptyTitle")}</p>
              <p className="text-xs text-muted-foreground">
                {t("notifications:emptyDescription")}
              </p>
            </div>
          ) : (
            data?.items.map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => navigate("/notifications")}
                className="flex w-full items-start gap-3 px-4 py-3 text-start transition-colors hover:bg-accent"
              >
                <span
                  className={cn(
                    "mt-1 h-2.5 w-2.5 shrink-0 rounded-full",
                    notification.is_read ? "bg-muted-foreground/40" : "bg-primary",
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">{notification.title}</span>
                    <Badge className={TYPE_STYLES[notification.notification_type] ?? TYPE_STYLES.info}>
                      {t(`notifications:types.${notification.notification_type}`, {
                        defaultValue: notification.notification_type,
                      })}
                    </Badge>
                  </span>
                  {notification.body && (
                    <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">
                      {notification.body}
                    </span>
                  )}
                  <span className="mt-1 block text-[11px] text-muted-foreground/70">
                    {formatDateShort(notification.created_at)}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
