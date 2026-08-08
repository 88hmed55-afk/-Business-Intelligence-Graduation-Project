import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
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
  customersApi,
  type CustomerCreatePayload,
  type CustomerUpdatePayload,
} from "@/features/customers/api";
import i18n from "@/i18n";
import { getErrorMessage } from "@/lib/error-messages";
import type { Customer, CustomerStatus } from "@/types";

const schema = z.object({
  first_name: z.string().min(1, { error: () => i18n.t("validation.required") }).max(100),
  last_name: z.string().min(1, { error: () => i18n.t("validation.required") }).max(100),
  email: z.union([z.literal(""), z.string().email({ error: () => i18n.t("validation.invalidEmail") })]),
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
  const { t } = useTranslation();

  const customerStatusOptions = [
    { value: "active", label: t("statuses.active") },
    { value: "inactive", label: t("statuses.inactive") },
    { value: "vip", label: t("statuses.vip") },
    { value: "prospect", label: t("statuses.prospect") },
  ];

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
      toast({ title: t("customers:createdToast"), variant: "success" });
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      toast({
        title: t("customers:createFailedToast"),
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CustomerUpdatePayload }) =>
      customersApi.update(id, payload),
    onSuccess: () => {
      toast({ title: t("customers:updatedToast"), variant: "success" });
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      toast({
        title: t("customers:updateFailedToast"),
        description: getErrorMessage(error),
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
          <DialogTitle>{customer ? t("customers:edit") : t("customers:create")}</DialogTitle>
          <DialogDescription>
            {customer ? t("customers:editDescription") : t("customers:createDescription")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormInput
              label={t("customers:fields.firstName")}
              required
              value={form.watch("first_name")}
              onChange={(v) => form.setValue("first_name", v, { shouldValidate: true })}
              error={form.formState.errors.first_name?.message}
            />
            <FormInput
              label={t("customers:fields.lastName")}
              required
              value={form.watch("last_name")}
              onChange={(v) => form.setValue("last_name", v, { shouldValidate: true })}
              error={form.formState.errors.last_name?.message}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormInput
              label={t("customers:fields.email")}
              type="email"
              value={form.watch("email")}
              onChange={(v) => form.setValue("email", v, { shouldValidate: true })}
              error={form.formState.errors.email?.message}
            />
            <FormInput
              label={t("customers:fields.phone")}
              value={form.watch("phone")}
              onChange={(v) => form.setValue("phone", v)}
            />
          </div>
          <FormInput
            label={t("customers:fields.company")}
            value={form.watch("company")}
            onChange={(v) => form.setValue("company", v)}
          />
          <FormTextarea
            label={t("customers:fields.address")}
            rows={2}
            value={form.watch("address")}
            onChange={(v) => form.setValue("address", v)}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormInput
              label={t("customers:fields.city")}
              value={form.watch("city")}
              onChange={(v) => form.setValue("city", v)}
            />
            <FormInput
              label={t("customers:fields.country")}
              value={form.watch("country")}
              onChange={(v) => form.setValue("country", v)}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormSelect
              label={t("customers:fields.status")}
              control={form.control}
              name="status"
              options={customerStatusOptions}
            />
          </div>
          <FormTextarea
            label={t("customers:fields.notes")}
            rows={3}
            value={form.watch("notes")}
            onChange={(v) => form.setValue("notes", v)}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              {t("actions.cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {customer ? t("actions.save") : t("customers:create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
