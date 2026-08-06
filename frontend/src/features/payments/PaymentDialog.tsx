import { useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CreditCard, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { FormInput, FormSelect, FormTextarea } from "@/components/forms";
import { ordersApi, paymentsApi, type PaymentPayload, type PaymentUpdatePayload } from "@/features/orders/api";
import { ApiClientError, fetchAllPages } from "@/lib/api";
import { formatDateInput } from "@/lib/utils";
import type { Payment, PaymentMethod, PaymentStatus } from "@/types";

const methodOptions: Array<{ value: string; label: string }> = [
  { value: "credit_card", label: "Credit card" },
  { value: "debit_card", label: "Debit card" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "cash", label: "Cash" },
  { value: "wallet", label: "Wallet" },
  { value: "paypal", label: "PayPal" },
];

const statusOptions: Array<{ value: string; label: string }> = [
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
];

const schema = z.object({
  order_id: z.string().min(1, "Order is required"),
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine((value) => !Number.isNaN(Number(value)) && Number(value) > 0, "Must be positive"),
  method: z.enum(["credit_card", "debit_card", "bank_transfer", "cash", "wallet", "paypal"]),
  status: z.enum(["pending", "completed", "failed", "refunded"]),
  transaction_id: z.string().max(128).optional().or(z.literal("")),
  paid_at: z.string().optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

type PaymentFormValues = z.infer<typeof schema>;

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment?: Payment | null;
}

export function PaymentDialog({ open, onOpenChange, payment }: PaymentDialogProps) {
  const { toast } = useToast();

  const { data: ordersData } = useQuery({
    queryKey: ["orders"],
    queryFn: () => fetchAllPages((page) => ordersApi.list({ page, page_size: 100 })),
  });

  const orders = ordersData?.items ?? [];

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      order_id: "",
      amount: "",
      method: "credit_card",
      status: "pending",
      transaction_id: "",
      paid_at: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        order_id: payment?.order_id ?? "",
        amount: payment?.amount ?? "",
        method: (payment?.method as PaymentMethod) ?? "credit_card",
        status: (payment?.status as PaymentStatus) ?? "pending",
        transaction_id: payment?.transaction_id ?? "",
        paid_at: payment?.paid_at ? formatDateInput(payment.paid_at) : "",
        notes: payment?.notes ?? "",
      });
    }
  }, [open, payment, form]);

  const createMutation = useMutation({
    mutationFn: (payload: PaymentPayload) => paymentsApi.create(payload),
    onSuccess: () => {
      toast({ title: "Payment recorded", variant: "success" });
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      toast({
        title: "Could not record payment",
        description: error instanceof ApiClientError ? error.message : "Unexpected error",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: PaymentUpdatePayload }) =>
      paymentsApi.update(id, payload),
    onSuccess: () => {
      toast({ title: "Payment updated", variant: "success" });
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      toast({
        title: "Could not update payment",
        description: error instanceof ApiClientError ? error.message : "Unexpected error",
        variant: "destructive",
      });
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (values: PaymentFormValues) => {
    const payload: PaymentPayload = {
      order_id: values.order_id,
      amount: values.amount,
      method: values.method,
      status: values.status,
      transaction_id: values.transaction_id || undefined,
      paid_at: values.paid_at ? new Date(values.paid_at).toISOString() : undefined,
      notes: values.notes || undefined,
    };
    if (payment) {
      updateMutation.mutate({ id: payment.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            {payment ? "Edit payment" : "Record payment"}
          </DialogTitle>
          <DialogDescription>
            {payment ? `Update payment ${payment.payment_number}.` : "Record a payment against an order."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormSelect
            label="Order"
            required
            control={form.control}
            name="order_id"
            placeholder="Select order…"
            options={orders.map((order) => ({
              value: order.id,
              label: `${order.order_number} — ${order.customer_name ?? "Unknown"}`,
            }))}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormInput
              label="Amount"
              required
              type="number"
              min={0}
              step="0.01"
              value={form.watch("amount")}
              onChange={(v) => form.setValue("amount", v, { shouldValidate: true })}
              error={form.formState.errors.amount?.message}
            />
            <FormInput
              label="Paid at"
              type="date"
              value={form.watch("paid_at")}
              onChange={(v) => form.setValue("paid_at", v)}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormSelect label="Method" required control={form.control} name="method" options={methodOptions} />
            <FormSelect label="Status" required control={form.control} name="status" options={statusOptions} />
          </div>
          <FormInput
            label="Transaction ID"
            value={form.watch("transaction_id")}
            onChange={(v) => form.setValue("transaction_id", v)}
          />
          <FormTextarea
            label="Notes"
            rows={2}
            value={form.watch("notes")}
            onChange={(v) => form.setValue("notes", v)}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {payment ? "Save changes" : "Record payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
