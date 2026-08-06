import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { PenLine, Plus, Search, Trash2 } from "lucide-react";

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
import { ApiClientError } from "@/lib/api";
import { cn, formatDateShort, initials, toTitleCase } from "@/lib/utils";
import type { User, UserRole } from "@/types";

const PAGE_SIZE = 10;

const roleVariant: Record<UserRole, "default" | "secondary" | "outline"> = {
  admin: "default",
  analyst: "secondary",
  viewer: "outline",
};

export function UsersPage() {
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
      toast({ title: "User status updated", variant: "success" });
    },
    onError: (error: unknown) => {
      toast({
        title: "Could not update user",
        description: error instanceof ApiClientError ? error.message : "Unexpected error",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.remove(id),
    onSuccess: () => {
      toast({ title: "User deleted", variant: "success" });
      setDeleting(null);
    },
    onError: (error: unknown) => {
      toast({
        title: "Could not delete user",
        description: error instanceof ApiClientError ? error.message : "Unexpected error",
        variant: "destructive",
      });
    },
  });

  if (isError) {
    return <ErrorState message="Could not load users." onRetry={() => void refetch()} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Users" description="Manage user accounts and permissions">
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          New user
        </Button>
      </PageHeader>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search users…"
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
          title="No users found"
          description="Create a user account to grant access to the platform."
        />
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last login</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
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
                    <Badge variant={roleVariant[user.role]}>{toTitleCase(user.role)}</Badge>
                    {user.is_superuser && (
                      <Badge variant="warning" className="ml-1">
                        Super
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.is_active ? "success" : "destructive"}>
                      {user.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.last_login_at ? formatDateShort(user.last_login_at) : "Never"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateShort(user.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <span className="sr-only">Actions</span>
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
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => toggleActiveMutation.mutate({ id: user.id, isActive: !user.is_active })}
                        >
                          {user.is_active ? "Deactivate" : "Activate"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleting(user)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 />
                          Delete
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
        title="Delete user"
        description={deleting ? `Are you sure you want to delete "${deleting.full_name}"?` : undefined}
        confirmLabel="Delete"
      />
    </div>
  );
}
