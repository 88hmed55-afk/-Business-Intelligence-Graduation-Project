import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { FolderTree, Loader2 } from "lucide-react";
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
import {
  categoriesApi,
  type CategoryCreatePayload,
  type CategoryUpdatePayload,
} from "@/features/categories/api";
import i18n from "@/i18n";
import { getErrorMessage } from "@/lib/error-messages";
import type { Category } from "@/types";

const schema = z.object({
  name: z.string().min(1, { error: () => i18n.t("validation.required") }).max(120),
  description: z.string().max(1000).optional().or(z.literal("")),
  parent_id: z.string().optional().or(z.literal("")),
  sort_order: z
    .string()
    .refine((value) => value === "" || !Number.isNaN(Number(value)), { error: () => i18n.t("validation.invalidNumber") }),
});

type CategoryFormValues = z.infer<typeof schema>;

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category | null;
  categories?: Category[];
}

export function CategoryDialog({ open, onOpenChange, category, categories }: CategoryDialogProps) {
  const { toast } = useToast();
  const { t } = useTranslation();

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "", parent_id: "", sort_order: "0" },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: category?.name ?? "",
        description: category?.description ?? "",
        parent_id: category?.parent_id ?? "",
        sort_order: String(category?.sort_order ?? 0),
      });
    }
  }, [open, category, form]);

  const createMutation = useMutation({
    mutationFn: (payload: CategoryCreatePayload) => categoriesApi.create(payload),
    onSuccess: () => {
      toast({ title: t("categories:createdToast"), variant: "success" });
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      toast({
        title: t("categories:createFailedToast"),
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CategoryUpdatePayload }) =>
      categoriesApi.update(id, payload),
    onSuccess: () => {
      toast({ title: t("categories:updatedToast"), variant: "success" });
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      toast({
        title: t("categories:updateFailedToast"),
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const parentOptions = (categories ?? [])
    .filter((item) => item.id !== category?.id)
    .map((item) => ({ value: item.id, label: item.name }));

  const onSubmit = (values: CategoryFormValues) => {
    const payload: CategoryCreatePayload = {
      name: values.name,
      description: values.description || undefined,
      parent_id: values.parent_id || undefined,
      sort_order: values.sort_order === "" ? undefined : Number(values.sort_order),
    };
    if (category) {
      updateMutation.mutate({ id: category.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderTree className="h-5 w-5 text-primary" />
            {category ? t("categories:edit") : t("categories:create")}
          </DialogTitle>
          <DialogDescription>
            {category ? t("categories:editDescription") : t("categories:createDescription")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormInput
            label={t("categories:fields.name")}
            required
            value={form.watch("name")}
            onChange={(v) => form.setValue("name", v, { shouldValidate: true })}
            error={form.formState.errors.name?.message}
          />
          <FormTextarea
            label={t("categories:fields.description")}
            rows={3}
            value={form.watch("description")}
            onChange={(v) => form.setValue("description", v)}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormSelect
              label={t("categories:fields.parent")}
              control={form.control}
              name="parent_id"
              options={parentOptions}
              placeholder={t("categories:parentPlaceholder")}
            />
            <FormInput
              label={t("categories:fields.sortOrder")}
              type="number"
              value={form.watch("sort_order")}
              onChange={(v) => form.setValue("sort_order", v, { shouldValidate: true })}
              error={form.formState.errors.sort_order?.message}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              {t("actions.cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {category ? t("actions.save") : t("categories:create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
