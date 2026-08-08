import { motion } from "framer-motion";
import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";

interface BulkActionsBarProps {
  count: number;
  onClear: () => void;
  onDelete: () => void;
  deleteLabel?: string;
  onCustomAction?: () => void;
  customLabel?: string;
  customIcon?: React.ReactNode;
}

export function BulkActionsBar({
  count,
  onClear,
  onDelete,
  deleteLabel,
  onCustomAction,
  customLabel,
  customIcon,
}: BulkActionsBarProps) {
  const { t } = useTranslation();
  if (count === 0) return null;
  const resolvedDeleteLabel = deleteLabel ?? t("nav:actions.deleteSelected");

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5"
    >
      <span className="text-sm font-medium text-primary">
        {t("nav:actions.selected", { count })}
      </span>
      <div className="ms-auto flex items-center gap-2">
        {onCustomAction && customLabel && (
          <Button variant="secondary" size="sm" onClick={onCustomAction}>
            {customIcon}
            {customLabel}
          </Button>
        )}
        <Button variant="destructive" size="sm" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
          {resolvedDeleteLabel}
        </Button>
        <Button variant="ghost" size="sm" onClick={onClear}>
          {t("actions.clear")}
        </Button>
      </div>
    </motion.div>
  );
}
