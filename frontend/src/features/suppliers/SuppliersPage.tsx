import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Building2, Globe, Mail, PenLine, Phone, Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

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
import { SupplierDialog } from "@/features/suppliers/SupplierDialog";
import { suppliersApi } from "@/features/suppliers/api";
import { getErrorMessage } from "@/lib/error-messages";
import { cn, formatDateShort } from "@/lib/utils";
import type { Supplier } from "@/types";

const PAGE_SIZE = 10;

export function SuppliersPage() {
  const { toast } = useToast();
  const { t } = useTranslation();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [deleting, setDeleting] = useState<Supplier | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["suppliers", page, debouncedSearch],
    queryFn: () =>
      suppliersApi.list({
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
    mutationFn: (id: string) => suppliersApi.remove(id),
    onSuccess: () => {
      toast({ title: t("suppliers:deletedToast"), variant: "success" });
      setDeleting(null);
    },
    onError: (error: unknown) => {
      toast({
        title: t("suppliers:deleteFailedToast"),
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  if (isError) {
    return <ErrorState message={t("suppliers:loadFailed")} onRetry={() => void refetch()} />;
  }

  const suppliers = data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title={t("suppliers:title")} description={t("suppliers:description")}>
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          {t("suppliers:add")}
        </Button>
      </PageHeader>

      <div className="relative w-full max-w-xs">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("suppliers:searchPlaceholder")}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 ps-9 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <svg
          viewBox="0 0 24 24"
          className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
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
        ) : suppliers.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 font-medium">{t("suppliers:emptyTitle")}</p>
            <p className="text-sm text-muted-foreground">{t("suppliers:emptyDescription")}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-start text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">{t("suppliers:table.supplier")}</th>
                <th className="px-4 py-3 font-medium">{t("suppliers:table.contact")}</th>
                <th className="px-4 py-3 font-medium">{t("suppliers:table.location")}</th>
                <th className="px-4 py-3 font-medium">{t("suppliers:table.taxId")}</th>
                <th className="px-4 py-3 font-medium">{t("suppliers:table.status")}</th>
                <th className="px-4 py-3 font-medium">{t("suppliers:table.created")}</th>
                <th className="px-4 py-3 text-end font-medium">{t("suppliers:table.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((supplier) => (
                <tr key={supplier.id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium">{supplier.name}</p>
                        {supplier.contact_name && (
                          <p className="truncate text-xs text-muted-foreground">
                            {supplier.contact_name}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {supplier.email && (
                      <p className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5" />
                        <span className="truncate">{supplier.email}</span>
                      </p>
                    )}
                    {supplier.phone && (
                      <p className="flex items-center gap-1.5 text-xs">
                        <Phone className="h-3.5 w-3.5" />
                        {supplier.phone}
                      </p>
                    )}
                    {supplier.website && (
                      <p className="flex items-center gap-1.5 text-xs">
                        <Globe className="h-3.5 w-3.5" />
                        <span className="truncate">{supplier.website}</span>
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {[supplier.city, supplier.country].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {supplier.tax_id ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={supplier.is_active ? "success" : "secondary"}>
                      {supplier.is_active ? t("statuses.active") : t("statuses.inactive")}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDateShort(supplier.created_at)}
                  </td>
                  <td className="px-4 py-3 text-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <span className="sr-only">{t("suppliers:table.actions")}</span>
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
                            setEditing(supplier);
                            setDialogOpen(true);
                          }}
                        >
                          <PenLine />
                          {t("actions.edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleting(supplier)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 />
                          {t("actions.delete")}
                        </DropdownMenuItem>
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
        className={cn(isLoading || suppliers.length === 0 ? "hidden" : "")}
      />

      <SupplierDialog open={dialogOpen} onOpenChange={setDialogOpen} supplier={editing} />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        onConfirm={() => (deleting ? deleteMutation.mutateAsync(deleting.id) : Promise.resolve())}
        title={t("suppliers:deleteConfirmTitle")}
        description={deleting ? t("suppliers:deleteConfirmDescription", { name: deleting.name }) : undefined}
        confirmLabel={t("actions.delete")}
      />
    </div>
  );
}
