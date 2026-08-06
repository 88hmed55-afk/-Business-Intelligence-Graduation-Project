import { useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
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
import { customersApi } from "@/features/customers/api";
import { ordersApi, type OrderCreatePayload, type OrderUpdatePayload } from "@/features/orders/api";
import { productsApi } from "@/features/products/api";
import { ApiClientError, fetchAllPages } from "@/lib/api";
import { formatCurrency, parseNum } from "@/lib/utils";
import type { Order } from "@/types";

const orderStatusOptions: Array<{ value: string; label: string }> = [
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
  { value: "refunded", label: "Refunded" },
];

const itemSchema = z.object({
  product_id: z.string().min(1, "Product is required"),
  quantity: z
    .string()
    .min(1, "Quantity is required")
    .refine((value) => !Number.isNaN(Number(value)) && Number(value) > 0, "Must be positive"),
  unit_price: z.string(),
  discount_amount: z.string(),
});

const schema = z.object({
  customer_id: z.string().min(1, "Customer is required"),
  status: z.enum(["pending", "processing", "shipped", "delivered", "cancelled", "refunded"]),
  currency: z.string().min(1, "Currency is required").max(10),
  shipping_fee: z.string(),
  notes: z.string().max(2000).optional().or(z.literal("")),
  items: z.array(itemSchema).min(1, "Add at least one item"),
});

type OrderFormValues = z.infer<typeof schema>;

interface OrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order?: Order | null;
}

export function OrderDialog({ open, onOpenChange, order }: OrderDialogProps) {
  const { toast } = useToast();

  const { data: customersData } = useQuery({
    queryKey: ["customers"],
    queryFn: () => fetchAllPages((page) => customersApi.list({ page, page_size: 100 })),
  });

  const { data: productsData } = useQuery({
    queryKey: ["products", "all"],
    queryFn: () => fetchAllPages((page) => productsApi.list({ page, page_size: 100 })),
  });

  const customers = customersData?.items ?? [];
  const products = productsData?.items ?? [];

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      customer_id: "",
      status: "pending",
      currency: "USD",
      shipping_fee: "0",
      notes: "",
      items: [{ product_id: "", quantity: "1", unit_price: "", discount_amount: "0" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  useEffect(() => {
    if (open) {
      if (order) {
        form.reset({
          customer_id: order.customer_id,
          status: order.status,
          currency: order.currency || "USD",
          shipping_fee: order.shipping_fee,
          notes: order.notes ?? "",
          items:
            order.items.length > 0
              ? order.items.map((item) => ({
                  product_id: item.product_id,
                  quantity: item.quantity,
                  unit_price: item.unit_price,
                  discount_amount: item.discount_amount,
                }))
              : [{ product_id: "", quantity: "1", unit_price: "", discount_amount: "0" }],
        });
      } else {
        form.reset({
          customer_id: "",
          status: "pending",
          currency: "USD",
          shipping_fee: "0",
          notes: "",
          items: [{ product_id: "", quantity: "1", unit_price: "", discount_amount: "0" }],
        });
      }
    }
  }, [open, order, form]);

  const createMutation = useMutation({
    mutationFn: (payload: OrderCreatePayload) => ordersApi.create(payload),
    onSuccess: () => {
      toast({ title: "Order created", variant: "success" });
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      toast({
        title: "Could not create order",
        description: error instanceof ApiClientError ? error.message : "Unexpected error",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: OrderUpdatePayload }) =>
      ordersApi.update(id, payload),
    onSuccess: () => {
      toast({ title: "Order updated", variant: "success" });
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      toast({
        title: "Could not update order",
        description: error instanceof ApiClientError ? error.message : "Unexpected error",
        variant: "destructive",
      });
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const productPrice = (productId: string): string => {
    const product = products.find((item) => item.id === productId);
    return product ? product.unit_price : "";
  };

  const setProduct = (index: number, productId: string) => {
    form.setValue(`items.${index}.product_id`, productId);
    const price = productPrice(productId);
    if (price) form.setValue(`items.${index}.unit_price`, price);
  };

  const subtotal = form
    .watch("items")
    .reduce(
      (sum, item) =>
        sum + parseNum(item.unit_price) * parseNum(item.quantity) - parseNum(item.discount_amount),
      0,
    );
  const shipping = parseNum(form.watch("shipping_fee"));
  const total = subtotal + shipping;

  const onSubmit = (values: OrderFormValues) => {
    const payload: OrderCreatePayload = {
      customer_id: values.customer_id,
      status: values.status,
      currency: values.currency,
      shipping_fee: values.shipping_fee || "0",
      notes: values.notes || undefined,
      items: values.items.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price || undefined,
        discount_amount: item.discount_amount || undefined,
      })),
    };
    if (order) {
      const updatePayload: OrderUpdatePayload = {
        customer_id: values.customer_id,
        status: values.status,
        currency: values.currency,
        shipping_fee: values.shipping_fee,
        notes: values.notes || undefined,
      };
      updateMutation.mutate({ id: order.id, payload: updatePayload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            {order ? `Edit order ${order.order_number}` : "Create order"}
          </DialogTitle>
          <DialogDescription>
            {order ? "Update the order details." : "Add a new order with its line items."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormSelect
              label="Customer"
              required
              className="sm:col-span-2"
              control={form.control}
              name="customer_id"
              placeholder="Select customer…"
              options={customers.map((customer) => ({
                value: customer.id,
                label: customer.full_name,
              }))}
            />
            <FormSelect
              label="Status"
              control={form.control}
              name="status"
              options={orderStatusOptions}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Currency"
              value={form.watch("currency")}
              onChange={(v) => form.setValue("currency", v, { shouldValidate: true })}
              error={form.formState.errors.currency?.message}
            />
            <FormInput
              label="Shipping fee"
              type="number"
              min={0}
              step="0.01"
              value={form.watch("shipping_fee")}
              onChange={(v) => form.setValue("shipping_fee", v)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Items</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({ product_id: "", quantity: "1", unit_price: "", discount_amount: "0" })
                }
              >
                <Plus className="h-4 w-4" />
                Add item
              </Button>
            </div>
            {form.formState.errors.items?.root && (
              <p className="text-xs font-medium text-destructive">
                {form.formState.errors.items.root.message}
              </p>
            )}
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-12 items-end gap-2 rounded-lg border p-3">
                <div className="col-span-12 sm:col-span-4">
                  <FormSelect
                    label={index === 0 ? "Product" : undefined}
                    control={form.control}
                    name={`items.${index}.product_id`}
                    placeholder="Select product…"
                    options={products.map((product) => ({
                      value: product.id,
                      label: `${product.name} (${product.sku})`,
                    }))}
                    onValueChange={(value: string) => setProduct(index, value)}
                  />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <FormInput
                    label={index === 0 ? "Qty" : undefined}
                    type="number"
                    min={1}
                    value={form.watch(`items.${index}.quantity`)}
                    onChange={(v) => form.setValue(`items.${index}.quantity`, v)}
                  />
                </div>
                <div className="col-span-4 sm:col-span-3">
                  <FormInput
                    label={index === 0 ? "Unit price" : undefined}
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.watch(`items.${index}.unit_price`)}
                    onChange={(v) => form.setValue(`items.${index}.unit_price`, v)}
                  />
                </div>
                <div className="col-span-3 sm:col-span-2">
                  <FormInput
                    label={index === 0 ? "Discount" : undefined}
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.watch(`items.${index}.discount_amount`)}
                    onChange={(v) => form.setValue(`items.${index}.discount_amount`, v)}
                  />
                </div>
                <div className="col-span-1 flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-10 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            <div className="rounded-lg bg-muted/40 px-4 py-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span className="font-medium">{formatCurrency(shipping)}</span>
              </div>
              <div className="flex justify-between border-t pt-1 font-semibold">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

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
              {order ? "Save changes" : "Create order"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
