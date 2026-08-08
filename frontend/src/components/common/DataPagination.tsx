import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { useIsRTL } from "@/hooks/use-direction";
import { cn } from "@/lib/utils";

interface DataPaginationProps {
  page: number;
  pages: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function DataPagination({ page, pages, total, onPageChange, className }: DataPaginationProps) {
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  if (total === 0) return null;

  const PreviousIcon = isRTL ? ChevronRight : ChevronLeft;
  const NextIcon = isRTL ? ChevronLeft : ChevronRight;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-between gap-3 sm:flex-row",
        className,
      )}
    >
      <p className="text-sm text-muted-foreground">
        {total === 1
          ? t("pagination.item", { count: total })
          : t("pagination.items", { count: total })}
        {" · "}
        {t("pagination.page", { current: page, total: Math.max(pages, 1) })}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <PreviousIcon className="h-4 w-4" />
          {t("pagination.previous")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
        >
          {t("pagination.next")}
          <NextIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
