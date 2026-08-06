import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownToLine, ArrowUpFromLine, Boxes, PackageMinus, Warehouse } from "lucide-react";

import { DataPagination } from "@/components/common/DataPagination";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { InventoryAdjustDialog } from "@/features/inventory/InventoryAdjustDialog";
import { inventoryApi } from "@/features/orders/api";
import { productsApi } from "@/features/products/api";
import { fetchAllPages } from "@/lib/api";
import { cn, formatDateShort, parseNum, toTitleCase } from "@/lib/utils";
import type { InventoryMovementType } from "@/types";

const PAGE_SIZE = 10;

const movementVariant: Record<InventoryMovementType, "success" | "warning" | "secondary" | "destructive" | "outline"> = {
  received: "success",
  returned: "success",
  adjusted: "warning",
  shipped: "destructive",
  reserved: "secondary",
  released: "secondary",
};

type Tab = "stock" | "movements";

export function InventoryPage() {
  const [tab, setTab] = useState<Tab>("stock");
  const [page, setPage] = useState(1);
  const [movementsPage, setMovementsPage] = useState(1);
  const [adjusting, setAdjusting] = useState<{ id: string; name: string } | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["inventory", page],
    queryFn: () => inventoryApi.list({ page, page_size: PAGE_SIZE }),
  });

  const { data: movementsData, isLoading: movementsLoading } = useQuery({
    queryKey: ["inventory-movements", movementsPage],
    queryFn: () => inventoryApi.movements({ page: movementsPage, page_size: PAGE_SIZE }),
    enabled: tab === "movements",
  });

  const { data: lowStockData } = useQuery({
    queryKey: ["inventory-low-stock"],
    queryFn: () => inventoryApi.lowStock(50),
  });

  const { data: productsData } = useQuery({
    queryKey: ["products", "all"],
    queryFn: () => fetchAllPages((page) => productsApi.list({ page, page_size: 100 })),
  });

  const productMap = new Map((productsData?.items ?? []).map((item) => [item.id, item.name]));

  if (isError) {
    return <ErrorState message="Could not load inventory." onRetry={() => void refetch()} />;
  }

  const items = data?.items ?? [];
  const movements = movementsData?.items ?? [];
  const lowStockCount = lowStockData?.length ?? 0;
  const totalUnits = items.reduce((sum, item) => sum + parseNum(item.quantity), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description="Monitor stock levels, warehouses, and movement history."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Stock on hand" value={totalUnits} icon={<Boxes />} />
        <StatCard
          title="Low stock items"
          value={lowStockCount}
          icon={<PackageMinus />}
          className={cn(lowStockCount > 0 && "border-destructive/40")}
        />
        <StatCard
          title="Warehouses"
          value={new Set(items.map((item) => item.warehouse)).size}
          icon={<Warehouse />}
        />
        <StatCard
          title="Stock records"
          value={data?.total ?? 0}
          icon={<ArrowDownToLine />}
        />
      </div>

      <div className="inline-flex rounded-lg border bg-muted/40 p-1">
        {(
          [
            { key: "stock", label: "Stock" },
            { key: "movements", label: "Movements" },
          ] as const
        ).map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
              tab === item.key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "stock" && (
        <>
          <div className="rounded-xl border">
            {isLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-12 w-full" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <EmptyState title="No stock records" description="Add products to start tracking inventory." className="my-6" />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Product</th>
                    <th className="px-4 py-3 font-medium">Warehouse</th>
                    <th className="px-4 py-3 font-medium">Location</th>
                    <th className="px-4 py-3 font-medium">On hand</th>
                    <th className="px-4 py-3 font-medium">Reserved</th>
                    <th className="px-4 py-3 font-medium">Available</th>
                    <th className="px-4 py-3 font-medium">Last restocked</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const available = parseNum(item.available_quantity);
                    return (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                              <Boxes className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium">{productMap.get(item.product_id) ?? "Unknown product"}</p>
                              <p className="font-mono text-xs text-muted-foreground">{item.product_id.slice(0, 8)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">{item.warehouse}</td>
                        <td className="px-4 py-3 text-muted-foreground">{item.location ?? "—"}</td>
                        <td className="px-4 py-3 font-medium">{parseNum(item.quantity)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{parseNum(item.reserved_quantity)}</td>
                        <td className="px-4 py-3">
                          <Badge variant={available > 0 ? "success" : "destructive"}>{available}</Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {item.last_restocked_at ? formatDateShort(item.last_restocked_at) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setAdjusting({
                                id: item.product_id,
                                name: productMap.get(item.product_id) ?? "Unknown product",
                              })
                            }
                          >
                            <ArrowUpFromLine className="h-4 w-4" />
                            Adjust
                          </Button>
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
            className={cn(isLoading || items.length === 0 ? "hidden" : "")}
          />
        </>
      )}

      {tab === "movements" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Movement history</CardTitle>
            </CardHeader>
            <CardContent>
              {movementsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Skeleton key={index} className="h-10 w-full" />
                  ))}
                </div>
              ) : movements.length === 0 ? (
                <EmptyState title="No movements recorded" description="Stock adjustments will appear here." className="my-4" />
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="px-3 py-2 font-medium">Type</th>
                      <th className="px-3 py-2 font-medium">Product</th>
                      <th className="px-3 py-2 font-medium">Change</th>
                      <th className="px-3 py-2 font-medium">Reference</th>
                      <th className="px-3 py-2 font-medium">Note</th>
                      <th className="px-3 py-2 font-medium">Moved at</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((movement) => (
                      <tr key={movement.id} className="border-b last:border-0">
                        <td className="px-3 py-2">
                          <Badge variant={movementVariant[movement.movement_type]}>
                            {toTitleCase(movement.movement_type)}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">{productMap.get(movement.product_id) ?? "Unknown"}</td>
                        <td
                          className={cn(
                            "px-3 py-2 font-medium",
                            parseNum(movement.quantity_change) >= 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-destructive",
                          )}
                        >
                          {parseNum(movement.quantity_change) >= 0 ? "+" : ""}
                          {movement.quantity_change}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                          {movement.reference ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{movement.note ?? "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground">{formatDateShort(movement.moved_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
          <DataPagination
            page={movementsPage}
            pages={movementsData?.pages ?? 1}
            total={movementsData?.total ?? 0}
            onPageChange={setMovementsPage}
            className={cn(movementsLoading || movements.length === 0 ? "hidden" : "")}
          />
        </>
      )}

      {adjusting && (
        <InventoryAdjustDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setAdjusting(null);
          }}
          productId={adjusting.id}
          productName={adjusting.name}
        />
      )}
    </div>
  );
}
