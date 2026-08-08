import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, PackagePlus } from "lucide-react";
import { useTranslation } from "react-i18next";
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
import i18n from "@/i18n";
import { getErrorMessage } from "@/lib/error-messages";
import type { InventoryMovementType } from "@/types";

const schema = z.object({
  delta: z
    .string()
    .min(1, { error: () => i18n.t("validation.required") })
    .refine((value) => !Number.isNaN(Number(value)), { error: () => i18n.t("validation.invalidNumber") }),
  movement_type: z.string().min(1, { error: () => i18n.t("validation.required") }),
  reference: z.string().max(100).optional().or(z.literal("")),
  note: z.string().max(1000).optional().or(z.literal("")),
});

type AdjustFormValues = z.infer<typeof schema>;

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
  const { t } = useTranslation();
  const { toast } = useToast();

  const movementOptions = [
    { value: "received", label: `${t("inventory:movementTypes.received")} (+)` },
    { value: "adjusted", label: t("inventory:movementTypes.adjusted") },
    { value: "returned", label: `${t("inventory:movementTypes.returned")} (+)` },
    { value: "shipped", label: `${t("inventory:movementTypes.shipped")} (−)` },
  ];

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
      toast({ title: t("inventory:adjustSuccess"), variant: "success" });
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      toast({
        title: t("inventory:adjustFailed"),
        description: getErrorMessage(error),
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
            {t("inventory:adjust")}
          </DialogTitle>
          <DialogDescription>{productName}</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormSelect
              label={t("inventory:fields.movementType")}
              required
              control={form.control}
              name="movement_type"
              options={movementOptions}
            />
            <FormInput
              label={t("inventory:fields.quantityDelta")}
              required
              type="number"
              step="1"
              placeholder={t("inventory:fields.quantityDeltaPlaceholder")}
              value={form.watch("delta")}
              onChange={(v) => form.setValue("delta", v, { shouldValidate: true })}
              error={form.formState.errors.delta?.message}
            />
          </div>
          <FormInput
            label={t("inventory:fields.reference")}
            placeholder={t("inventory:fields.referencePlaceholder")}
            value={form.watch("reference")}
            onChange={(v) => form.setValue("reference", v)}
          />
          <FormInput
            label={t("inventory:fields.notes")}
            value={form.watch("note")}
            onChange={(v) => form.setValue("note", v)}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
              {t("actions.cancel")}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("inventory:adjust")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
