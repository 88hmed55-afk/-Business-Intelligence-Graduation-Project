import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Boxes, PenLine, Plus, Trash2 } from "lucide-react";
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
import { categoriesApi } from "@/features/categories/api";
import { inventoryApi } from "@/features/orders/api";
import { ProductDialog } from "@/features/products/ProductDialog";
import { productsApi } from "@/features/products/api";
import { suppliersApi } from "@/features/suppliers/api";
import { fetchAllPages } from "@/lib/api";
import { getErrorMessage } from "@/lib/error-messages";
import { cn, formatCurrency, parseNum } from "@/lib/utils";
import type { Product } from "@/types";

const PAGE_SIZE = 10;

export function ProductsPage() {
  const { toast } = useToast();
  const { t } = useTranslation();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["products", page, debouncedSearch],
    queryFn: () =>
      productsApi.list({
        page,
        page_size: PAGE_SIZE,
        search: debouncedSearch || undefined,
      }),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: () => fetchAllPages((page) => categoriesApi.list({ page, page_size: 100 })),
  });

  const { data: suppliersData } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => fetchAllPages((page) => suppliersApi.list({ page, page_size: 100 })),
  });

  const { data: inventoryData } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => fetchAllPages((page) => inventoryApi.list({ page, page_size: 100 })),
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const categoryMap = new Map((categoriesData?.items ?? []).map((item) => [item.id, item]));
  const supplierMap = new Map((suppliersData?.items ?? []).map((item) => [item.id, item]));
  const stockByProduct = new Map<string, number>();
  for (const item of inventoryData?.items ?? []) {
    stockByProduct.set(item.product_id, parseNum(item.available_quantity));
  }

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productsApi.remove(id),
    onSuccess: () => {
      toast({ title: t("products:deletedToast"), variant: "success" });
      setDeleting(null);
    },
    onError: (error: unknown) => {
      toast({
        title: t("products:deleteFailedToast"),
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  if (isError) {
    return <ErrorState message={t("products:loadFailed")} onRetry={() => void refetch()} />;
  }

  const products = data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title={t("products:title")} description={t("products:description")}>
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          {t("products:add")}
        </Button>
      </PageHeader>

      <div className="relative w-full max-w-xs">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("products:searchPlaceholder")}
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
        ) : products.length === 0 ? (
          <div className="p-12 text-center">
            <Boxes className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 font-medium">{t("products:emptyTitle")}</p>
            <p className="text-sm text-muted-foreground">{t("products:emptyDescription")}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-start text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">{t("products:table.product")}</th>
                <th className="px-4 py-3 font-medium">{t("products:table.category")}</th>
                <th className="px-4 py-3 font-medium">{t("products:table.supplier")}</th>
                <th className="px-4 py-3 font-medium">{t("products:table.price")}</th>
                <th className="px-4 py-3 font-medium">{t("products:table.cost")}</th>
                <th className="px-4 py-3 font-medium">{t("products:table.stock")}</th>
                <th className="px-4 py-3 font-medium">{t("products:table.status")}</th>
                <th className="px-4 py-3 text-end font-medium">{t("products:table.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const stock = stockByProduct.get(product.id) ?? 0;
                const lowStock = parseNum(product.reorder_level) > 0 && stock <= parseNum(product.reorder_level);
                return (
                  <tr key={product.id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Boxes className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium">{product.name}</p>
                          <p className="font-mono text-xs text-muted-foreground">{product.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {product.category_id ? categoryMap.get(product.category_id)?.name ?? "—" : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {product.supplier_id ? supplierMap.get(product.supplier_id)?.name ?? "—" : "—"}
                    </td>
                    <td className="px-4 py-3 font-medium">{formatCurrency(product.unit_price)}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatCurrency(product.cost_price)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={lowStock ? "destructive" : "secondary"}>{stock}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={product.is_active ? "success" : "secondary"}>
                        {product.is_active ? t("statuses.active") : t("statuses.inactive")}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <span className="sr-only">{t("products:table.actions")}</span>
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
                              setEditing(product);
                              setDialogOpen(true);
                            }}
                          >
                            <PenLine />
                            {t("actions.edit")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeleting(product)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 />
                            {t("actions.delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <DataPagination
        page={page}
        pages={data?.pages ?? 1}
        total={data?.total ?? 0}
        onPageChange={setPage}
        className={cn(isLoading || products.length === 0 ? "hidden" : "")}
      />

      <ProductDialog open={dialogOpen} onOpenChange={setDialogOpen} product={editing} />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        onConfirm={() => (deleting ? deleteMutation.mutateAsync(deleting.id) : Promise.resolve())}
        title={t("products:deleteConfirmTitle")}
        description={deleting ? t("products:deleteConfirmDescription", { name: deleting.name }) : undefined}
        confirmLabel={t("actions.delete")}
      />
    </div>
  );
}
