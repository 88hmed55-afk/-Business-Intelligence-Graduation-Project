import { useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Boxes, Loader2 } from "lucide-react";
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
import { FormInput, FormSelect, FormTextarea } from "@/components/forms";
import { categoriesApi } from "@/features/categories/api";
import { productsApi, type ProductCreatePayload, type ProductUpdatePayload } from "@/features/products/api";
import { suppliersApi } from "@/features/suppliers/api";
import i18n from "@/i18n";
import { fetchAllPages } from "@/lib/api";
import { getErrorMessage } from "@/lib/error-messages";
import type { Product } from "@/types";

const NONE = "__none__";

const schema = z.object({
  name: z.string().min(1, { error: () => i18n.t("validation.required") }).max(300),
  sku: z.string().min(1, { error: () => i18n.t("validation.required") }).max(64),
  barcode: z.string().max(64).optional().or(z.literal("")),
  description: z.string().max(2000).optional().or(z.literal("")),
  category_id: z.string().optional().or(z.literal("")),
  supplier_id: z.string().optional().or(z.literal("")),
  unit_price: z
    .string()
    .refine((value) => value === "" || !Number.isNaN(Number(value)), { error: () => i18n.t("validation.invalidNumber") }),
  cost_price: z
    .string()
    .refine((value) => value === "" || !Number.isNaN(Number(value)), { error: () => i18n.t("validation.invalidNumber") }),
  reorder_level: z
    .string()
    .refine((value) => value === "" || !Number.isNaN(Number(value)), { error: () => i18n.t("validation.invalidNumber") }),
  weight_kg: z
    .string()
    .refine((value) => value === "" || !Number.isNaN(Number(value)), { error: () => i18n.t("validation.invalidNumber") }),
  is_active: z.string(),
});

type ProductFormValues = z.infer<typeof schema>;

interface ProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
}

export function ProductDialog({ open, onOpenChange, product }: ProductDialogProps) {
  const { toast } = useToast();
  const { t } = useTranslation();

  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: () => fetchAllPages((page) => categoriesApi.list({ page, page_size: 100 })),
  });

  const { data: suppliersData } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => fetchAllPages((page) => suppliersApi.list({ page, page_size: 100 })),
  });

  const categories = categoriesData?.items ?? [];
  const suppliers = suppliersData?.items ?? [];

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      sku: "",
      barcode: "",
      description: "",
      category_id: "",
      supplier_id: "",
      unit_price: "",
      cost_price: "",
      reorder_level: "0",
      weight_kg: "",
      is_active: "true",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: product?.name ?? "",
        sku: product?.sku ?? "",
        barcode: product?.barcode ?? "",
        description: product?.description ?? "",
        category_id: product?.category_id ?? "",
        supplier_id: product?.supplier_id ?? "",
        unit_price: product?.unit_price ?? "",
        cost_price: product?.cost_price ?? "",
        reorder_level: product?.reorder_level ?? "0",
        weight_kg: product?.weight_kg ?? "",
        is_active: String(product?.is_active ?? true),
      });
    }
  }, [open, product, form]);

  const createMutation = useMutation({
    mutationFn: (payload: ProductCreatePayload) => productsApi.create(payload),
    onSuccess: () => {
      toast({ title: t("products:createdToast"), variant: "success" });
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      toast({
        title: t("products:createFailedToast"),
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ProductUpdatePayload }) =>
      productsApi.update(id, payload),
    onSuccess: () => {
      toast({ title: t("products:updatedToast"), variant: "success" });
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      toast({
        title: t("products:updateFailedToast"),
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (values: ProductFormValues) => {
    const payload: ProductCreatePayload = {
      name: values.name,
      sku: values.sku,
      barcode: values.barcode || undefined,
      description: values.description || undefined,
      category_id:
        values.category_id && values.category_id !== NONE ? values.category_id : undefined,
      supplier_id:
        values.supplier_id && values.supplier_id !== NONE ? values.supplier_id : undefined,
      unit_price: values.unit_price || undefined,
      cost_price: values.cost_price || undefined,
      reorder_level: values.reorder_level || undefined,
      weight_kg: values.weight_kg || undefined,
      is_active: values.is_active === "true",
    };
    if (product) {
      updateMutation.mutate({ id: product.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const categoryOptions = [
    { value: NONE, label: t("products:noCategory") },
    ...categories.map((category) => ({ value: category.id, label: category.name })),
  ];
  const supplierOptions = [
    { value: NONE, label: t("products:noSupplier") },
    ...suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name })),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Boxes className="h-5 w-5 text-primary" />
            {product ? t("products:edit") : t("products:create")}
          </DialogTitle>
          <DialogDescription>
            {product ? t("products:editDescription") : t("products:createDescription")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormInput
            label={t("products:fields.name")}
            required
            value={form.watch("name")}
            onChange={(v) => form.setValue("name", v, { shouldValidate: true })}
            error={form.formState.errors.name?.message}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormInput
              label={t("products:fields.sku")}
              required
              value={form.watch("sku")}
              onChange={(v) => form.setValue("sku", v, { shouldValidate: true })}
              error={form.formState.errors.sku?.message}
            />
            <FormInput
              label={t("products:fields.barcode")}
              value={form.watch("barcode")}
              onChange={(v) => form.setValue("barcode", v)}
            />
          </div>
          <FormTextarea
            label={t("products:fields.description")}
            rows={3}
            value={form.watch("description")}
            onChange={(v) => form.setValue("description", v)}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormSelect
              label={t("products:fields.category")}
              control={form.control}
              name="category_id"
              options={categoryOptions}
              placeholder={t("products:selectCategoryPlaceholder")}
            />
            <FormSelect
              label={t("products:fields.supplier")}
              control={form.control}
              name="supplier_id"
              options={supplierOptions}
              placeholder={t("products:selectSupplierPlaceholder")}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label={t("products:fields.unitPrice")}
              type="number"
              min={0}
              step="0.01"
              value={form.watch("unit_price")}
              onChange={(v) => form.setValue("unit_price", v, { shouldValidate: true })}
              error={form.formState.errors.unit_price?.message}
            />
            <FormInput
              label={t("products:fields.costPrice")}
              type="number"
              min={0}
              step="0.01"
              value={form.watch("cost_price")}
              onChange={(v) => form.setValue("cost_price", v, { shouldValidate: true })}
              error={form.formState.errors.cost_price?.message}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label={t("products:fields.reorderLevel")}
              type="number"
              min={0}
              value={form.watch("reorder_level")}
              onChange={(v) => form.setValue("reorder_level", v, { shouldValidate: true })}
              error={form.formState.errors.reorder_level?.message}
            />
            <FormInput
              label={t("products:fields.weightKg")}
              type="number"
              min={0}
              step="0.01"
              value={form.watch("weight_kg")}
              onChange={(v) => form.setValue("weight_kg", v, { shouldValidate: true })}
              error={form.formState.errors.weight_kg?.message}
            />
          </div>
          <FormSelect
            label={t("products:fields.status")}
            control={form.control}
            name="is_active"
            options={[
              { value: "true", label: t("statuses.active") },
              { value: "false", label: t("statuses.inactive") },
            ]}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              {t("actions.cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {product ? t("actions.save") : t("products:create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
