import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowUpRight, ArrowDownRight, Minus, PenLine, Plus, Search, Trash2 } from "lucide-react";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataPagination } from "@/components/common/DataPagination";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { KpiDialog } from "@/features/kpis/KpiDialog";
import { KpiValueDialog } from "@/features/kpis/KpiValueDialog";
import { kpisApi } from "@/features/kpis/api";
import { ApiClientError } from "@/lib/api";
import { cn, toTitleCase } from "@/lib/utils";
import type { Kpi, KpiCategory } from "@/types";

const PAGE_SIZE = 10;

const categories: KpiCategory[] = [
  "finance",
  "sales",
  "operations",
  "marketing",
  "hr",
  "it",
  "other",
];

export function KpisPage() {
  const { toast } = useToast();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState<KpiCategory | "all">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Kpi | null>(null);
  const [valueTarget, setValueTarget] = useState<Kpi | null>(null);
  const [deleting, setDeleting] = useState<Kpi | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["kpis", page, debouncedSearch, category],
    queryFn: () =>
      kpisApi.list({
        page,
        page_size: PAGE_SIZE,
        search: debouncedSearch || undefined,
        category: category === "all" ? undefined : category,
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
    mutationFn: (id: string) => kpisApi.remove(id),
    onSuccess: () => {
      toast({ title: "KPI deleted", variant: "success" });
      setDeleting(null);
    },
    onError: (error: unknown) => {
      toast({
        title: "Could not delete KPI",
        description: error instanceof ApiClientError ? error.message : "Unexpected error",
        variant: "destructive",
      });
    },
  });

  if (isError) {
    return <ErrorState message="Could not load KPIs." onRetry={() => void refetch()} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="KPIs" description="Define and track your key performance indicators">
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          New KPI
        </Button>
      </PageHeader>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search KPIs…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <Select
          value={category}
          onValueChange={(value: KpiCategory | "all") => {
            setCategory(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {toTitleCase(c)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      ) : (data?.items.length ?? 0) === 0 ? (
        <EmptyState
          title="No KPIs found"
          description="Create your first KPI to start measuring performance."
        />
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Target</TableHead>
                <TableHead className="text-right">Current</TableHead>
                <TableHead className="min-w-[140px]">Achievement</TableHead>
                <TableHead>Trend</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.items.map((kpi) => {
                const target = kpi.target_value ? Number(kpi.target_value) : null;
                const current = kpi.current_value ? Number(kpi.current_value) : null;
                const progress = kpi.progress ?? (target && current ? (current / target) * 100 : null);

                return (
                  <TableRow key={kpi.id}>
                    <TableCell>
                      <div className="min-w-0">
                        <p className="font-medium">{kpi.name}</p>
                        {kpi.dashboard_id && (
                          <p className="text-xs text-muted-foreground">Linked to dashboard</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{toTitleCase(kpi.category)}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {target?.toLocaleString() ?? "—"}
                      {kpi.unit ? ` ${kpi.unit}` : ""}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {current?.toLocaleString() ?? "—"}
                      {kpi.unit ? ` ${kpi.unit}` : ""}
                    </TableCell>
                    <TableCell>
                      {progress === null ? (
                        <span className="text-xs text-muted-foreground">No data</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Progress
                            value={progress}
                            className="h-1.5 flex-1"
                            indicatorClassName={
                              progress >= 100
                                ? "bg-emerald-500"
                                : progress >= 70
                                  ? "bg-primary"
                                  : "bg-amber-500"
                            }
                          />
                          <span className="w-10 text-right text-xs font-medium">
                            {progress.toFixed(0)}%
                          </span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {kpi.trend === "up" ? (
                        <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                      ) : kpi.trend === "down" ? (
                        <ArrowDownRight className="h-4 w-4 text-rose-500" />
                      ) : (
                        <Minus className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell className="text-right">
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
                          <DropdownMenuItem onClick={() => setValueTarget(kpi)}>
                            <Plus />
                            Record value
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setEditing(kpi);
                              setDialogOpen(true);
                            }}
                          >
                            <PenLine />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeleting(kpi)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <DataPagination
        page={page}
        pages={data?.pages ?? 1}
        total={data?.total ?? 0}
        onPageChange={setPage}
        className={cn(isLoading || (data?.items.length ?? 0) === 0 ? "hidden" : "")}
      />

      <KpiDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        kpi={editing}
      />

      {valueTarget && (
        <KpiValueDialog
          open={valueTarget !== null}
          onOpenChange={(open) => {
            if (!open) setValueTarget(null);
          }}
          kpiName={valueTarget.name}
          kpiId={valueTarget.id}
          currentValue={valueTarget.current_value}
          unit={valueTarget.unit}
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        onConfirm={() => (deleting ? deleteMutation.mutateAsync(deleting.id) : Promise.resolve())}
        title="Delete KPI"
        description={deleting ? `Are you sure you want to delete "${deleting.name}"?` : undefined}
        confirmLabel="Delete"
      />
    </div>
  );
}
