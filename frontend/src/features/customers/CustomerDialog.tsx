import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
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
  customersApi,
  type CustomerCreatePayload,
  type CustomerUpdatePayload,
} from "@/features/customers/api";
import { ApiClientError } from "@/lib/api";
import type { Customer, CustomerStatus } from "@/types";

const customerStatusOptions: Array<{ value: string; label: string }> = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "vip", label: "VIP" },
  { value: "prospect", label: "Prospect" },
];

const schema = z.object({
  first_name: z.string().min(1, "First name is required").max(100),
  last_name: z.string().min(1, "Last name is required").max(100),
  email: z.union([z.literal(""), z.string().email("Invalid email")]),
  phone: z.string().max(50).optional().or(z.literal("")),
  company: z.string().max(255).optional().or(z.literal("")),
  address: z.string().max(2000).optional().or(z.literal("")),
  city: z.string().max(100).optional().or(z.literal("")),
  country: z.string().max(100).optional().or(z.literal("")),
  status: z.enum(["active", "inactive", "vip", "prospect"]),
  notes: z.string().max(5000).optional().or(z.literal("")),
});

type CustomerFormValues = z.infer<typeof schema>;

interface CustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer | null;
}

export function CustomerDialog({ open, onOpenChange, customer }: CustomerDialogProps) {
  const { toast } = useToast();

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      company: "",
      address: "",
      city: "",
      country: "",
      status: "active",
      notes: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        first_name: customer?.first_name ?? "",
        last_name: customer?.last_name ?? "",
        email: customer?.email ?? "",
        phone: customer?.phone ?? "",
        company: customer?.company ?? "",
        address: customer?.address ?? "",
        city: customer?.city ?? "",
        country: customer?.country ?? "",
        status: (customer?.status as CustomerStatus) ?? "active",
        notes: customer?.notes ?? "",
      });
    }
  }, [open, customer, form]);

  const createMutation = useMutation({
    mutationFn: (payload: CustomerCreatePayload) => customersApi.create(payload),
    onSuccess: () => {
      toast({ title: "Customer created", variant: "success" });
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      toast({
        title: "Could not create customer",
        description: error instanceof ApiClientError ? error.message : "Unexpected error",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CustomerUpdatePayload }) =>
      customersApi.update(id, payload),
    onSuccess: () => {
      toast({ title: "Customer updated", variant: "success" });
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      toast({
        title: "Could not update customer",
        description: error instanceof ApiClientError ? error.message : "Unexpected error",
        variant: "destructive",
      });
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (values: CustomerFormValues) => {
    const payload = {
      first_name: values.first_name,
      last_name: values.last_name,
      email: values.email || undefined,
      phone: values.phone || undefined,
      company: values.company || undefined,
      address: values.address || undefined,
      city: values.city || undefined,
      country: values.country || undefined,
      status: values.status,
      notes: values.notes || undefined,
    };
    if (customer) {
      updateMutation.mutate({ id: customer.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{customer ? "Edit customer" : "Create customer"}</DialogTitle>
          <DialogDescription>
            {customer ? "Update this customer's details." : "Add a new customer to your directory."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormInput
              label="First name"
              required
              value={form.watch("first_name")}
              onChange={(v) => form.setValue("first_name", v, { shouldValidate: true })}
              error={form.formState.errors.first_name?.message}
            />
            <FormInput
              label="Last name"
              required
              value={form.watch("last_name")}
              onChange={(v) => form.setValue("last_name", v, { shouldValidate: true })}
              error={form.formState.errors.last_name?.message}
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
              label="Phone"
              value={form.watch("phone")}
              onChange={(v) => form.setValue("phone", v)}
            />
          </div>
          <FormInput
            label="Company"
            value={form.watch("company")}
            onChange={(v) => form.setValue("company", v)}
          />
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
            <FormSelect
              label="Status"
              control={form.control}
              name="status"
              options={customerStatusOptions}
            />
          </div>
          <FormTextarea
            label="Notes"
            rows={3}
            value={form.watch("notes")}
            onChange={(v) => form.setValue("notes", v)}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {customer ? "Save changes" : "Create customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
