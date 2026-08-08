import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface LoadingOverlayProps {
  open: boolean;
  label?: string;
}

export function LoadingOverlay({ open, label }: LoadingOverlayProps) {
  const { t } = useTranslation();
  const resolvedLabel = label ?? t("states.loading");
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3 bg-background/60 backdrop-blur-sm"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-glow"
          >
            <Loader2 className="h-7 w-7 text-white" />
          </motion.div>
          <p className="text-sm font-medium text-muted-foreground">{resolvedLabel}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
