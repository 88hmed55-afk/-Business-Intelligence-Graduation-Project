import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Eye, PenLine, Plus, ShoppingCart, Trash2 } from "lucide-react";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataPagination } from "@/components/common/DataPagination";
import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { OrderDialog } from "@/features/orders/OrderDialog";
import { ordersApi } from "@/features/orders/api";
import { ApiClientError } from "@/lib/api";
import { cn, formatCurrency, formatDateShort, parseNum, toTitleCase } from "@/lib/utils";
import type { Order, OrderStatus } from "@/types";

const PAGE_SIZE = 10;

const orderStatusVariant: Record<OrderStatus, "default" | "warning" | "info" | "success" | "destructive" | "secondary"> = {
  pending: "warning",
  processing: "info",
  shipped: "default",
  delivered: "success",
  cancelled: "destructive",
  refunded: "secondary",
};

const statusOptions: Array<{ value: string; label: string }> = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
  { value: "refunded", label: "Refunded" },
];

export function OrdersPage() {
  const { toast } = useToast();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Order | null>(null);
  const [viewing, setViewing] = useState<Order | null>(null);
  const [deleting, setDeleting] = useState<Order | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["orders", page, debouncedSearch, status],
    queryFn: () =>
      ordersApi.list({
        page,
        page_size: PAGE_SIZE,
        search: debouncedSearch || undefined,
        status: status || undefined,
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
    mutationFn: (id: string) => ordersApi.remove(id),
    onSuccess: () => {
      toast({ title: "Order deleted", variant: "success" });
      setDeleting(null);
    },
    onError: (error: unknown) => {
      toast({
        title: "Could not delete order",
        description: error instanceof ApiClientError ? error.message : "Unexpected error",
        variant: "destructive",
      });
    },
  });

  if (isError) {
    return <ErrorState message="Could not load orders." onRetry={() => void refetch()} />;
  }

  const orders = data?.items ?? [];
  const viewingOrder = viewing ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        description="Track orders, line items, and delivery status."
      >
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          New order
        </Button>
      </PageHeader>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search orders…"
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
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value as OrderStatus | "");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-12 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center">
            <ShoppingCart className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 font-medium">No orders found</p>
            <p className="text-sm text-muted-foreground">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Payment</th>
                <th className="px-4 py-3 font-medium">Items</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-mono text-xs font-medium">{order.order_number}</p>
                  </td>
                  <td className="px-4 py-3">{order.customer_name ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDateShort(order.order_date)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={orderStatusVariant[order.status]}>{toTitleCase(order.status)}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={order.payment_status === "paid" ? "success" : "warning"}>
                      {toTitleCase(order.payment_status)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{order.items.length}</td>
                  <td className="px-4 py-3 font-medium">{formatCurrency(order.total_amount)}</td>
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
                        <DropdownMenuItem onClick={() => setViewing(order)}>
                          <Eye />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setEditing(order);
                            setDialogOpen(true);
                          }}
                        >
                          <PenLine />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleting(order)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 />
                          Delete
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
        className={cn(isLoading || orders.length === 0 ? "hidden" : "")}
      />

      <OrderDialog open={dialogOpen} onOpenChange={setDialogOpen} order={editing} />

      <Dialog open={viewingOrder !== null} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          {viewingOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-primary" />
                  Order {viewingOrder.order_number}
                </DialogTitle>
                <DialogDescription>
                  {viewingOrder.customer_name} · {formatDateShort(viewingOrder.order_date)}
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-wrap gap-2">
                <Badge variant={orderStatusVariant[viewingOrder.status]}>
                  {toTitleCase(viewingOrder.status)}
                </Badge>
                <Badge variant={viewingOrder.payment_status === "paid" ? "success" : "warning"}>
                  {toTitleCase(viewingOrder.payment_status)}
                </Badge>
              </div>
              <div className="overflow-hidden rounded-xl border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                      <th className="px-3 py-2 font-medium">Product</th>
                      <th className="px-3 py-2 font-medium">Qty</th>
                      <th className="px-3 py-2 font-medium">Price</th>
                      <th className="px-3 py-2 text-right font-medium">Line total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewingOrder.items.map((item) => (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="px-3 py-2">{item.product_name ?? item.product_id}</td>
                        <td className="px-3 py-2">{parseNum(item.quantity)}</td>
                        <td className="px-3 py-2">{formatCurrency(item.unit_price)}</td>
                        <td className="px-3 py-2 text-right font-medium">
                          {formatCurrency(item.line_total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="space-y-1 rounded-xl bg-muted/40 p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{formatCurrency(viewingOrder.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="font-medium">−{formatCurrency(viewingOrder.discount_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="font-medium">{formatCurrency(viewingOrder.tax_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="font-medium">{formatCurrency(viewingOrder.shipping_fee)}</span>
                </div>
                <div className="flex justify-between border-t pt-1 font-semibold">
                  <span>Total</span>
                  <span>{formatCurrency(viewingOrder.total_amount)}</span>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        onConfirm={() => (deleting ? deleteMutation.mutateAsync(deleting.id) : Promise.resolve())}
        title="Delete order"
        description={deleting ? `Are you sure you want to delete order "${deleting.order_number}"?` : undefined}
        confirmLabel="Delete"
      />
    </div>
  );
}
