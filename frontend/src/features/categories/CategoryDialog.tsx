import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { FolderTree, Loader2 } from "lucide-react";
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
import { ApiClientError } from "@/lib/api";
import type { Category } from "@/types";

const schema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  description: z.string().max(1000).optional().or(z.literal("")),
  parent_id: z.string().optional().or(z.literal("")),
  sort_order: z
    .string()
    .refine((value) => value === "" || !Number.isNaN(Number(value)), "Must be a number"),
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
      toast({ title: "Category created", variant: "success" });
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      toast({
        title: "Could not create category",
        description: error instanceof ApiClientError ? error.message : "Unexpected error",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CategoryUpdatePayload }) =>
      categoriesApi.update(id, payload),
    onSuccess: () => {
      toast({ title: "Category updated", variant: "success" });
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      toast({
        title: "Could not update category",
        description: error instanceof ApiClientError ? error.message : "Unexpected error",
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
            {category ? "Edit category" : "Create category"}
          </DialogTitle>
          <DialogDescription>
            {category ? "Update this category's details." : "Add a new category to organize products."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormInput
            label="Name"
            required
            value={form.watch("name")}
            onChange={(v) => form.setValue("name", v, { shouldValidate: true })}
            error={form.formState.errors.name?.message}
          />
          <FormTextarea
            label="Description"
            rows={3}
            value={form.watch("description")}
            onChange={(v) => form.setValue("description", v)}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormSelect
              label="Parent category"
              control={form.control}
              name="parent_id"
              options={parentOptions}
              placeholder="None (top level)"
            />
            <FormInput
              label="Sort order"
              type="number"
              value={form.watch("sort_order")}
              onChange={(v) => form.setValue("sort_order", v, { shouldValidate: true })}
              error={form.formState.errors.sort_order?.message}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {category ? "Save changes" : "Create category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
