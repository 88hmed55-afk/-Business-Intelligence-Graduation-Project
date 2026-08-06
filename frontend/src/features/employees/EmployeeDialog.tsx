import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, UserCog } from "lucide-react";
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
  employeesApi,
  type EmployeeCreatePayload,
  type EmployeeUpdatePayload,
} from "@/features/employees/api";
import { ApiClientError } from "@/lib/api";
import { formatDateInput } from "@/lib/utils";
import type { Employee, EmployeeStatus } from "@/types";

const statusOptions: Array<{ value: string; label: string }> = [
  { value: "active", label: "Active" },
  { value: "on_leave", label: "On leave" },
  { value: "terminated", label: "Terminated" },
];

const schema = z.object({
  first_name: z.string().min(1, "First name is required").max(100),
  last_name: z.string().min(1, "Last name is required").max(100),
  email: z.union([z.literal(""), z.string().email("Invalid email")]),
  phone: z.string().max(50).optional().or(z.literal("")),
  department: z.string().min(1, "Department is required").max(100),
  position: z.string().min(1, "Position is required").max(100),
  salary: z
    .string()
    .refine((value) => value === "" || !Number.isNaN(Number(value)), "Must be a number"),
  hire_date: z.string().min(1, "Hire date is required"),
  status: z.enum(["active", "on_leave", "terminated"]),
  manager_id: z.string().optional().or(z.literal("")),
  address: z.string().max(2000).optional().or(z.literal("")),
  city: z.string().max(100).optional().or(z.literal("")),
});

type EmployeeFormValues = z.infer<typeof schema>;

interface EmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: Employee | null;
  employees?: Employee[];
}

export function EmployeeDialog({ open, onOpenChange, employee, employees }: EmployeeDialogProps) {
  const { toast } = useToast();

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      department: "",
      position: "",
      salary: "",
      hire_date: "",
      status: "active",
      manager_id: "",
      address: "",
      city: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        first_name: employee?.first_name ?? "",
        last_name: employee?.last_name ?? "",
        email: employee?.email ?? "",
        phone: employee?.phone ?? "",
        department: employee?.department ?? "",
        position: employee?.position ?? "",
        salary: employee?.salary ?? "",
        hire_date: employee?.hire_date ? formatDateInput(employee.hire_date) : "",
        status: (employee?.status as EmployeeStatus) ?? "active",
        manager_id: employee?.manager_id ?? "",
        address: employee?.address ?? "",
        city: employee?.city ?? "",
      });
    }
  }, [open, employee, form]);

  const createMutation = useMutation({
    mutationFn: (payload: EmployeeCreatePayload) => employeesApi.create(payload),
    onSuccess: () => {
      toast({ title: "Employee created", variant: "success" });
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      toast({
        title: "Could not create employee",
        description: error instanceof ApiClientError ? error.message : "Unexpected error",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: EmployeeUpdatePayload }) =>
      employeesApi.update(id, payload),
    onSuccess: () => {
      toast({ title: "Employee updated", variant: "success" });
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      toast({
        title: "Could not update employee",
        description: error instanceof ApiClientError ? error.message : "Unexpected error",
        variant: "destructive",
      });
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const managerOptions = (employees ?? [])
    .filter((item) => item.id !== employee?.id)
    .map((item) => ({ value: item.id, label: item.full_name }));

  const onSubmit = (values: EmployeeFormValues) => {
    const payload: EmployeeCreatePayload = {
      first_name: values.first_name,
      last_name: values.last_name,
      email: values.email,
      phone: values.phone || undefined,
      department: values.department,
      position: values.position,
      salary: values.salary || undefined,
      hire_date: new Date(values.hire_date).toISOString(),
      status: values.status,
      manager_id: values.manager_id || undefined,
      address: values.address || undefined,
      city: values.city || undefined,
    };
    if (employee) {
      updateMutation.mutate({ id: employee.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-primary" />
            {employee ? "Edit employee" : "Create employee"}
          </DialogTitle>
          <DialogDescription>
            {employee ? "Update this employee's details." : "Add a new employee to your team."}
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
              required
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormInput
              label="Department"
              required
              value={form.watch("department")}
              onChange={(v) => form.setValue("department", v, { shouldValidate: true })}
              error={form.formState.errors.department?.message}
            />
            <FormInput
              label="Position"
              required
              value={form.watch("position")}
              onChange={(v) => form.setValue("position", v, { shouldValidate: true })}
              error={form.formState.errors.position?.message}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Salary"
              type="number"
              min={0}
              step="0.01"
              value={form.watch("salary")}
              onChange={(v) => form.setValue("salary", v, { shouldValidate: true })}
              error={form.formState.errors.salary?.message}
            />
            <FormInput
              label="Hire date"
              required
              type="date"
              value={form.watch("hire_date")}
              onChange={(v) => form.setValue("hire_date", v, { shouldValidate: true })}
              error={form.formState.errors.hire_date?.message}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormSelect
              label="Status"
              control={form.control}
              name="status"
              options={statusOptions}
            />
            <FormSelect
              label="Manager"
              control={form.control}
              name="manager_id"
              placeholder="None"
              options={managerOptions}
            />
          </div>
          <FormTextarea
            label="Address"
            rows={2}
            value={form.watch("address")}
            onChange={(v) => form.setValue("address", v)}
          />
          <FormInput
            label="City"
            value={form.watch("city")}
            onChange={(v) => form.setValue("city", v)}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {employee ? "Save changes" : "Create employee"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
