import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { PenLine, Plus, Shield, Trash2 } from "lucide-react";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataPagination } from "@/components/common/DataPagination";
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
import { useToast } from "@/components/ui/use-toast";
import { RoleDialog } from "@/features/roles/RoleDialog";
import { rolesApi } from "@/features/roles/api";
import { ApiClientError } from "@/lib/api";
import { cn, formatDateShort } from "@/lib/utils";
import type { Role, RoleDetail } from "@/types";

const PAGE_SIZE = 10;

export function RolesPage() {
  const { toast } = useToast();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [editingDetail, setEditingDetail] = useState<RoleDetail | null>(null);
  const [deleting, setDeleting] = useState<Role | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["roles", page, debouncedSearch],
    queryFn: () =>
      rolesApi.list({
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

  const deleteMutation = useMutation({
    mutationFn: (id: string) => rolesApi.remove(id),
    onSuccess: () => {
      toast({ title: "Role deleted", variant: "success" });
      setDeleting(null);
    },
    onError: (error: unknown) => {
      toast({
        title: "Could not delete role",
        description: error instanceof ApiClientError ? error.message : "Unexpected error",
        variant: "destructive",
      });
    },
  });

  const openEdit = (role: Role) => {
    setEditing(role);
    setEditingDetail(null);
    setDialogOpen(true);
    void rolesApi.get(role.id).then((detail) => setEditingDetail(detail)).catch(() => setEditingDetail(null));
  };

  if (isError) {
    return <ErrorState message="Could not load roles." onRetry={() => void refetch()} />;
  }

  const roles = data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles & permissions"
        description="Manage access roles and the permissions granted to each."
      >
        <Button
          onClick={() => {
            setEditing(null);
            setEditingDetail(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          New role
        </Button>
      </PageHeader>

      <div className="relative w-full max-w-xs">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search roles…"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <svg
          viewBox="0 0 24 24"
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </div>

      <div className="rounded-xl border">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-12 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : roles.length === 0 ? (
          <div className="p-12 text-center">
            <Shield className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 font-medium">No roles found</p>
            <p className="text-sm text-muted-foreground">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Shield className="h-4 w-4" />
                      </div>
                      <p className="font-medium">{role.name}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{role.description ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge variant={role.is_system ? "default" : "secondary"}>
                      {role.is_system ? "System" : "Custom"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDateShort(role.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
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
                        <DropdownMenuItem onClick={() => openEdit(role)}>
                          <PenLine />
                          Edit
                        </DropdownMenuItem>
                        {!role.is_system && (
                          <DropdownMenuItem
                            onClick={() => setDeleting(role)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <DataPagination
        page={page}
        pages={data?.pages ?? 1}
        total={data?.total ?? 0}
        onPageChange={setPage}
        className={cn(isLoading || roles.length === 0 ? "hidden" : "")}
      />

      <RoleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        role={editing}
        roleDetail={editingDetail}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        onConfirm={() => (deleting ? deleteMutation.mutateAsync(deleting.id) : Promise.resolve())}
        title="Delete role"
        description={deleting ? `Are you sure you want to delete role "${deleting.name}"?` : undefined}
        confirmLabel="Delete"
      />
    </div>
  );
}
