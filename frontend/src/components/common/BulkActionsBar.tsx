import { motion } from "framer-motion";
import { Trash2 } from "lucide-react";

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
  deleteLabel = "Delete selected",
  onCustomAction,
  customLabel,
  customIcon,
}: BulkActionsBarProps) {
  if (count === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5"
    >
      <span className="text-sm font-medium text-primary">
        {count} selected
      </span>
      <div className="ml-auto flex items-center gap-2">
        {onCustomAction && customLabel && (
          <Button variant="secondary" size="sm" onClick={onCustomAction}>
            {customIcon}
            {customLabel}
          </Button>
        )}
        <Button variant="destructive" size="sm" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
          {deleteLabel}
        </Button>
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear
        </Button>
      </div>
    </motion.div>
  );
}
