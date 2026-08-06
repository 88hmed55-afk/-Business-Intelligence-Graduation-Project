import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, PackagePlus } from "lucide-react";
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
import { FormInput, FormSelect } from "@/components/forms";
import { inventoryApi } from "@/features/orders/api";
import { ApiClientError } from "@/lib/api";
import type { InventoryMovementType } from "@/types";

const schema = z.object({
  delta: z
    .string()
    .min(1, "Delta is required")
    .refine((value) => !Number.isNaN(Number(value)), "Must be a number"),
  movement_type: z.string().min(1, "Movement type is required"),
  reference: z.string().max(100).optional().or(z.literal("")),
  note: z.string().max(1000).optional().or(z.literal("")),
});

type AdjustFormValues = z.infer<typeof schema>;

const movementOptions: Array<{ value: string; label: string }> = [
  { value: "received", label: "Received (+)" },
  { value: "adjusted", label: "Adjusted" },
  { value: "returned", label: "Returned (+)" },
  { value: "shipped", label: "Shipped (−)" },
];

interface InventoryAdjustDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  productId: string;
}

export function InventoryAdjustDialog({
  open,
  onOpenChange,
  productName,
  productId,
}: InventoryAdjustDialogProps) {
  const { toast } = useToast();

  const form = useForm<AdjustFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { delta: "", movement_type: "received", reference: "", note: "" },
  });

  useEffect(() => {
    if (open) {
      form.reset({ delta: "", movement_type: "received", reference: "", note: "" });
    }
  }, [open, form]);

  const mutation = useMutation({
    mutationFn: (payload: { delta: string; movement_type: InventoryMovementType; reference?: string; note?: string }) =>
      inventoryApi.adjust(productId, payload),
    onSuccess: () => {
      toast({ title: "Stock adjusted", variant: "success" });
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      toast({
        title: "Could not adjust stock",
        description: error instanceof ApiClientError ? error.message : "Unexpected error",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: AdjustFormValues) => {
    mutation.mutate({
      delta: values.delta,
      movement_type: values.movement_type as InventoryMovementType,
      reference: values.reference || undefined,
      note: values.note || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackagePlus className="h-5 w-5 text-primary" />
            Adjust stock
          </DialogTitle>
          <DialogDescription>{productName}</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormSelect
              label="Movement type"
              required
              control={form.control}
              name="movement_type"
              options={movementOptions}
            />
            <FormInput
              label="Quantity delta"
              required
              type="number"
              step="1"
              placeholder="e.g. 10 or -5"
              value={form.watch("delta")}
              onChange={(v) => form.setValue("delta", v, { shouldValidate: true })}
              error={form.formState.errors.delta?.message}
            />
          </div>
          <FormInput
            label="Reference"
            placeholder="PO-12345, invoice number…"
            value={form.watch("reference")}
            onChange={(v) => form.setValue("reference", v)}
          />
          <FormInput
            label="Note"
            value={form.watch("note")}
            onChange={(v) => form.setValue("note", v)}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Adjust stock
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
