import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { PenLine, Plus, Search, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataPagination } from "@/components/common/DataPagination";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/common/PageHeader";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { useToast } from "@/components/ui/use-toast";
import { UserDialog } from "@/features/users/UserDialog";
import { usersApi } from "@/features/users/api";
import { getErrorMessage } from "@/lib/error-messages";
import { cn, formatDateShort, initials, toTitleCase } from "@/lib/utils";
import type { User, UserRole } from "@/types";

const PAGE_SIZE = 10;

const roleVariant: Record<UserRole, "default" | "secondary" | "outline"> = {
  admin: "default",
  analyst: "secondary",
  viewer: "outline",
};

export function UsersPage() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [deleting, setDeleting] = useState<User | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["users", page, debouncedSearch],
    queryFn: () =>
      usersApi.list({
        page,
        page_size: PAGE_SIZE,
        search: debouncedSearch || undefined,
      }),
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      usersApi.update(id, { is_active: isActive }),
    onSuccess: () => {
      toast({ title: t("users:statusUpdatedToast"), variant: "success" });
    },
    onError: (error: unknown) => {
      toast({
        title: t("users:updateFailedToast"),
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.remove(id),
    onSuccess: () => {
      toast({ title: t("users:deletedToast"), variant: "success" });
      setDeleting(null);
    },
    onError: (error: unknown) => {
      toast({
        title: t("users:deleteFailedToast"),
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  if (isError) {
    return <ErrorState message={t("users:loadFailed")} onRetry={() => void refetch()} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("users:title")} description={t("users:description")}>
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          {t("users:add")}
        </Button>
      </PageHeader>

      <div className="relative max-w-sm">
        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="ps-9"
          placeholder={t("users:searchPlaceholder")}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      ) : (data?.items.length ?? 0) === 0 ? (
        <EmptyState
          title={t("users:emptyTitle")}
          description={t("users:emptyDescription")}
        />
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("users:table.user")}</TableHead>
                <TableHead>{t("users:table.role")}</TableHead>
                <TableHead>{t("users:table.status")}</TableHead>
                <TableHead>{t("users:table.lastLogin")}</TableHead>
                <TableHead>{t("users:table.created")}</TableHead>
                <TableHead className="text-end">{t("users:table.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.items.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback>{initials(user.full_name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-medium">{user.full_name}</p>
                        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={roleVariant[user.role]}>
                      {t("users:roles." + user.role, { defaultValue: toTitleCase(user.role) })}
                    </Badge>
                    {user.is_superuser && (
                      <Badge variant="warning" className="ms-1">
                        {t("users:super")}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.is_active ? "success" : "destructive"}>
                      {user.is_active ? t("users:statuses.active") : t("users:statuses.inactive")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.last_login_at ? formatDateShort(user.last_login_at) : t("users:never")}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateShort(user.created_at)}
                  </TableCell>
                  <TableCell className="text-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <span className="sr-only">{t("users:table.actions")}</span>
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
                            setEditing(user);
                            setDialogOpen(true);
                          }}
                        >
                          <PenLine />
                          {t("actions.edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => toggleActiveMutation.mutate({ id: user.id, isActive: !user.is_active })}
                        >
                          {user.is_active ? t("users:deactivate") : t("users:activate")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleting(user)}
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

      <UserDialog open={dialogOpen} onOpenChange={setDialogOpen} user={editing} />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        onConfirm={() => (deleting ? deleteMutation.mutateAsync(deleting.id) : Promise.resolve())}
        title={t("users:deleteConfirmTitle")}
        description={deleting ? t("users:deleteConfirmDescription", { name: deleting.full_name }) : undefined}
        confirmLabel={t("actions.delete")}
      />
    </div>
  );
}
