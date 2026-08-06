import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DataPaginationProps {
  page: number;
  pages: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function DataPagination({ page, pages, total, onPageChange, className }: DataPaginationProps) {
  if (total === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-between gap-3 sm:flex-row",
        className,
      )}
    >
      <p className="text-sm text-muted-foreground">
        {total} {total === 1 ? "item" : "items"} · Page {page} of {Math.max(pages, 1)}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
