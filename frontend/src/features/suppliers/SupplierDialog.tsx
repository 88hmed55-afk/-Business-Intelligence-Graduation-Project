import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Building2, Loader2 } from "lucide-react";
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
  suppliersApi,
  type SupplierCreatePayload,
  type SupplierUpdatePayload,
} from "@/features/suppliers/api";
import { ApiClientError } from "@/lib/api";
import type { Supplier } from "@/types";

const schema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  contact_name: z.string().max(200).optional().or(z.literal("")),
  email: z.union([z.literal(""), z.string().email("Invalid email")]),
  phone: z.string().max(50).optional().or(z.literal("")),
  address: z.string().max(2000).optional().or(z.literal("")),
  city: z.string().max(100).optional().or(z.literal("")),
  country: z.string().max(100).optional().or(z.literal("")),
  tax_id: z.string().max(100).optional().or(z.literal("")),
  website: z.string().max(500).optional().or(z.literal("")),
  is_active: z.string(),
});

type SupplierFormValues = z.infer<typeof schema>;

interface SupplierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier?: Supplier | null;
}

export function SupplierDialog({ open, onOpenChange, supplier }: SupplierDialogProps) {
  const { toast } = useToast();

  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      contact_name: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      country: "",
      tax_id: "",
      website: "",
      is_active: "true",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: supplier?.name ?? "",
        contact_name: supplier?.contact_name ?? "",
        email: supplier?.email ?? "",
        phone: supplier?.phone ?? "",
        address: supplier?.address ?? "",
        city: supplier?.city ?? "",
        country: supplier?.country ?? "",
        tax_id: supplier?.tax_id ?? "",
        website: supplier?.website ?? "",
        is_active: String(supplier?.is_active ?? true),
      });
    }
  }, [open, supplier, form]);

  const createMutation = useMutation({
    mutationFn: (payload: SupplierCreatePayload) => suppliersApi.create(payload),
    onSuccess: () => {
      toast({ title: "Supplier created", variant: "success" });
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      toast({
        title: "Could not create supplier",
        description: error instanceof ApiClientError ? error.message : "Unexpected error",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SupplierUpdatePayload }) =>
      suppliersApi.update(id, payload),
    onSuccess: () => {
      toast({ title: "Supplier updated", variant: "success" });
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      toast({
        title: "Could not update supplier",
        description: error instanceof ApiClientError ? error.message : "Unexpected error",
        variant: "destructive",
      });
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (values: SupplierFormValues) => {
    const payload: SupplierCreatePayload = {
      name: values.name,
      contact_name: values.contact_name || undefined,
      email: values.email || undefined,
      phone: values.phone || undefined,
      address: values.address || undefined,
      city: values.city || undefined,
      country: values.country || undefined,
      tax_id: values.tax_id || undefined,
      website: values.website || undefined,
      is_active: values.is_active === "true",
    };
    if (supplier) {
      updateMutation.mutate({ id: supplier.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            {supplier ? "Edit supplier" : "Create supplier"}
          </DialogTitle>
          <DialogDescription>
            {supplier ? "Update this supplier's details." : "Add a new supplier to your directory."}
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormInput
              label="Contact person"
              value={form.watch("contact_name")}
              onChange={(v) => form.setValue("contact_name", v)}
            />
            <FormInput
              label="Phone"
              value={form.watch("phone")}
              onChange={(v) => form.setValue("phone", v)}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormInput
              label="Email"
              type="email"
              value={form.watch("email")}
              onChange={(v) => form.setValue("email", v, { shouldValidate: true })}
              error={form.formState.errors.email?.message}
            />
            <FormInput
              label="Website"
              value={form.watch("website")}
              onChange={(v) => form.setValue("website", v)}
            />
          </div>
          <FormTextarea
            label="Address"
            rows={2}
            value={form.watch("address")}
            onChange={(v) => form.setValue("address", v)}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormInput
              label="City"
              value={form.watch("city")}
              onChange={(v) => form.setValue("city", v)}
            />
            <FormInput
              label="Country"
              value={form.watch("country")}
              onChange={(v) => form.setValue("country", v)}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormInput
              label="Tax ID"
              value={form.watch("tax_id")}
              onChange={(v) => form.setValue("tax_id", v)}
            />
            <FormSelect
              label="Status"
              control={form.control}
              name="is_active"
              options={[
                { value: "true", label: "Active" },
                { value: "false", label: "Inactive" },
              ]}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {supplier ? "Save changes" : "Create supplier"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
