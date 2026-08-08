import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CreditCard, PenLine, Plus, Trash2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { PaymentDialog } from "@/features/payments/PaymentDialog";
import { ordersApi, paymentsApi } from "@/features/orders/api";
import { getErrorMessage } from "@/lib/error-messages";
import { fetchAllPages } from "@/lib/api";
import { cn, formatCurrency, formatDateShort, toTitleCase } from "@/lib/utils";
import type { Payment, PaymentMethod, PaymentStatus } from "@/types";

const PAGE_SIZE = 10;

const statusVariant: Record<PaymentStatus, "success" | "warning" | "destructive" | "secondary"> = {
  pending: "warning",
  completed: "success",
  failed: "destructive",
  refunded: "secondary",
};

const methodOptions: Array<{ value: string; label: string }> = [
  { value: "", label: "" },
  { value: "credit_card", label: "Credit card" },
  { value: "debit_card", label: "Debit card" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "cash", label: "Cash" },
  { value: "wallet", label: "Wallet" },
  { value: "paypal", label: "PayPal" },
];

export function PaymentsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [method, setMethod] = useState<PaymentMethod | "">("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Payment | null>(null);
  const [deleting, setDeleting] = useState<Payment | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["payments", page, debouncedSearch, method],
    queryFn: () =>
      paymentsApi.list({
        page,
        page_size: PAGE_SIZE,
        search: debouncedSearch || undefined,
        method: method || undefined,
      }),
  });

  const { data: ordersData } = useQuery({
    queryKey: ["orders"],
    queryFn: () => fetchAllPages((page) => ordersApi.list({ page, page_size: 100 })),
  });

  const orderMap = new Map((ordersData?.items ?? []).map((order) => [order.id, order.order_number]));

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => paymentsApi.remove(id),
    onSuccess: () => {
      toast({ title: t("payments:deletedToast"), variant: "success" });
      setDeleting(null);
    },
    onError: (error: unknown) => {
      toast({
        title: t("payments:deleteFailedToast"),
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  if (isError) {
    return <ErrorState message={t("payments:loadFailed")} onRetry={() => void refetch()} />;
  }

  const payments = data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("payments:title")}
        description={t("payments:description")}
      >
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          {t("payments:create")}
        </Button>
      </PageHeader>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("payments:searchPlaceholder")}
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
        <Select
          value={method}
          onValueChange={(value) => {
            setMethod(value as PaymentMethod | "");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder={t("payments:filterMethod")} />
          </SelectTrigger>
          <SelectContent>
            {methodOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.value === ""
                  ? t("payments:filterMethod")
                  : t("payments:methods." + option.value, { defaultValue: option.label })}
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
        ) : payments.length === 0 ? (
          <div className="p-12 text-center">
            <CreditCard className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 font-medium">{t("payments:emptyTitle")}</p>
            <p className="text-sm text-muted-foreground">{t("payments:emptyDescription")}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-start text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">{t("payments:table.payment")}</th>
                <th className="px-4 py-3 font-medium">{t("payments:table.order")}</th>
                <th className="px-4 py-3 font-medium">{t("payments:table.method")}</th>
                <th className="px-4 py-3 font-medium">{t("payments:table.status")}</th>
                <th className="px-4 py-3 font-medium">{t("payments:table.amount")}</th>
                <th className="px-4 py-3 font-medium">{t("payments:fields.paymentDate")}</th>
                <th className="px-4 py-3 text-end font-medium">{t("payments:table.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-mono text-xs font-medium">{payment.payment_number}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {orderMap.get(payment.order_id) ?? payment.order_id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3">
                    {t("payments:methods." + payment.method, { defaultValue: payment.method })}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant[payment.status]}>
                      {t("payments:statuses." + payment.status, { defaultValue: toTitleCase(payment.status) })}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-medium">{formatCurrency(payment.amount)}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {payment.paid_at ? formatDateShort(payment.paid_at) : "—"}
                  </td>
                  <td className="px-4 py-3 text-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <span className="sr-only">{t("labels.actions")}</span>
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
                            setEditing(payment);
                            setDialogOpen(true);
                          }}
                        >
                          <PenLine />
                          {t("actions.edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleting(payment)}
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
        className={cn(isLoading || payments.length === 0 ? "hidden" : "")}
      />

      <PaymentDialog open={dialogOpen} onOpenChange={setDialogOpen} payment={editing} />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        onConfirm={() => (deleting ? deleteMutation.mutateAsync(deleting.id) : Promise.resolve())}
        title={t("payments:deleteConfirmTitle")}
        description={deleting ? t("payments:deleteConfirmDescription", { amount: formatCurrency(deleting.amount) }) : undefined}
        confirmLabel={t("actions.delete")}
      />
    </div>
  );
}
