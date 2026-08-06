import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Building2, Mail, MapPin, PenLine, Phone, Plus, Trash2 } from "lucide-react";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataPagination } from "@/components/common/DataPagination";
import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/common/PageHeader";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { CustomerDialog } from "@/features/customers/CustomerDialog";
import { customersApi } from "@/features/customers/api";
import { ApiClientError } from "@/lib/api";
import { cn, formatCurrency, formatDateShort, initials } from "@/lib/utils";
import type { Customer, CustomerStatus } from "@/types";

const PAGE_SIZE = 10;

const statusVariant: Record<CustomerStatus, "success" | "secondary" | "warning" | "outline"> = {
  active: "success",
  inactive: "secondary",
  vip: "warning",
  prospect: "outline",
};

const statusOptions: Array<{ value: string; label: string }> = [
  { value: "", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "vip", label: "VIP" },
  { value: "prospect", label: "Prospect" },
];

export function CustomersPage() {
  const { toast } = useToast();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<CustomerStatus | "">("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState<Customer | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["customers", page, debouncedSearch, status],
    queryFn: () =>
      customersApi.list({
        page,
        page_size: PAGE_SIZE,
        search: debouncedSearch || undefined,
        status: status || undefined,
      }),
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => customersApi.remove(id),
    onSuccess: () => {
      toast({ title: "Customer deleted", variant: "success" });
      setDeleting(null);
    },
    onError: (error: unknown) => {
      toast({
        title: "Could not delete customer",
        description: error instanceof ApiClientError ? error.message : "Unexpected error",
        variant: "destructive",
      });
    },
  });

  if (isError) {
    return <ErrorState message="Could not load customers." onRetry={() => void refetch()} />;
  }

  const customers = data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Manage your customer directory, profiles, and statuses."
      >
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          New customer
        </Button>
      </PageHeader>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search customers…"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <svg
            viewBox="0 0 24 24"
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </div>
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value as CustomerStatus | "");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-12 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 font-medium">No customers found</p>
            <p className="text-sm text-muted-foreground">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Total spent</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback>{initials(customer.full_name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-medium">{customer.full_name}</p>
                        {customer.company && (
                          <p className="truncate text-xs text-muted-foreground">{customer.company}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {customer.email && (
                      <p className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5" />
                        <span className="truncate">{customer.email}</span>
                      </p>
                    )}
                    {customer.phone && (
                      <p className="flex items-center gap-1.5 text-xs">
                        <Phone className="h-3.5 w-3.5" />
                        {customer.phone}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {customer.city || customer.country ? (
                      <p className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        {[customer.city, customer.country].filter(Boolean).join(", ")}
                      </p>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant[customer.status]}>{customer.status}</Badge>
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {formatCurrency(customer.total_spent ?? 0)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDateShort(customer.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <span className="sr-only">Actions</span>
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                            <circle cx="12" cy="5" r="1.5" />
                            <circle cx="12" cy="12" r="1.5" />
                            <circle cx="12" cy="19" r="1.5" />
                          </svg>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditing(customer);
                            setDialogOpen(true);
                          }}
                        >
                          <PenLine />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleting(customer)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <DataPagination
        page={page}
        pages={data?.pages ?? 1}
        total={data?.total ?? 0}
        onPageChange={setPage}
        className={cn(isLoading || customers.length === 0 ? "hidden" : "")}
      />

      <CustomerDialog open={dialogOpen} onOpenChange={setDialogOpen} customer={editing} />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        onConfirm={() => (deleting ? deleteMutation.mutateAsync(deleting.id) : Promise.resolve())}
        title="Delete customer"
        description={deleting ? `Are you sure you want to delete "${deleting.full_name}"?` : undefined}
        confirmLabel="Delete"
      />
    </div>
  );
}
