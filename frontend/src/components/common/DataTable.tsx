import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/common/EmptyState";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
}

export type SortDirection = "asc" | "desc";

export interface SortState {
  key: string;
  direction: SortDirection;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  selected?: Set<string>;
  onSelectionChange?: (selected: Set<string>) => void;
  sort?: SortState | null;
  onSortChange?: (sort: SortState) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  skeletonRows?: number;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  isLoading,
  isError,
  errorMessage,
  onRetry,
  selected,
  onSelectionChange,
  sort,
  onSortChange,
  emptyTitle,
  emptyDescription,
  skeletonRows = 8,
  className,
}: DataTableProps<T>) {
  const { t } = useTranslation();
  const resolvedEmptyTitle = emptyTitle ?? t("states.noRecords");
  const resolvedEmptyDescription = emptyDescription ?? t("states.noRecordsDescription");
  const allSelected =
    data.length > 0 && (selected?.size ?? 0) === data.length;
  const someSelected = (selected?.size ?? 0) > 0 && !allSelected;

  const toggleAll = () => {
    if (!onSelectionChange) return;
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(data.map(rowKey)));
    }
  };

  const toggleRow = (id: string) => {
    if (!onSelectionChange) return;
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onSelectionChange(next);
  };

  const handleSort = (key: string) => {
    if (!onSortChange) return;
    const next: SortState =
      sort?.key === key && sort.direction === "asc"
        ? { key, direction: "desc" }
        : { key, direction: "asc" };
    onSortChange(next);
  };

  if (isError) {
    return (
      <EmptyState
        title={t("states.somethingWentWrong")}
        description={errorMessage ?? t("states.couldNotLoad")}
        actionLabel={t("actions.retry")}
        onAction={onRetry}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {onSelectionChange && <TableHead className="w-10" />}
              {columns.map((column) => (
                <TableHead key={column.key} className={column.headerClassName}>
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: skeletonRows }).map((_, index) => (
              <TableRow key={index}>
                {onSelectionChange && (
                  <TableCell>
                    <Skeleton className="h-4 w-4" />
                  </TableCell>
                )}
                {columns.map((column) => (
                  <TableCell key={column.key}>
                    <Skeleton className="h-5 w-full max-w-[160px]" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <EmptyState title={resolvedEmptyTitle} description={resolvedEmptyDescription} className="my-6" />
    );
  }

  return (
    <div className={cn("rounded-xl border", className)}>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {onSelectionChange && (
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected || someSelected}
                  onCheckedChange={toggleAll}
                  aria-label={t("actions.selectAll")}
                />
              </TableHead>
            )}
            {columns.map((column) => (
              <TableHead key={column.key} className={column.headerClassName}>
                {column.sortable && onSortChange ? (
                  <button
                    type="button"
                    onClick={() => handleSort(column.key)}
                    className="inline-flex items-center gap-1 font-medium hover:text-foreground"
                  >
                    {column.header}
                    {sort?.key === column.key ? (
                      sort.direction === "asc" ? (
                        <ArrowUp className="h-3.5 w-3.5 text-primary" />
                      ) : (
                        <ArrowDown className="h-3.5 w-3.5 text-primary" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
                    )}
                  </button>
                ) : (
                  column.header
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => {
            const id = rowKey(row);
            const isSelected = selected?.has(id) ?? false;
            return (
              <TableRow
                key={id}
                className={cn("transition-colors", isSelected && "bg-primary/5")}
              >
                {onSelectionChange && (
                  <TableCell>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleRow(id)}
                      aria-label={t("actions.selectAll")}
                    />
                  </TableCell>
                )}
                {columns.map((column) => (
                  <TableCell key={column.key} className={column.className}>
                    {column.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {isLoading && (
        <div className="flex items-center justify-center gap-2 border-t p-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("states.refreshing")}
        </div>
      )}
    </div>
  );
}
