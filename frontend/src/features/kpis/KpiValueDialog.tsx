import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { kpisApi } from "@/features/kpis/api";
import { getErrorMessage } from "@/lib/error-messages";

interface KpiValueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kpiName: string;
  kpiId: string;
  currentValue: string | null;
  unit: string | null;
}

export function KpiValueDialog({
  open,
  onOpenChange,
  kpiName,
  kpiId,
  currentValue,
  unit,
}: KpiValueDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [value, setValue] = useState("");

  useEffect(() => {
    if (open) {
      setValue(currentValue ?? "");
    }
  }, [open, currentValue]);

  const mutation = useMutation({
    mutationFn: (next: string) => kpisApi.updateValue(kpiId, next),
    onSuccess: () => {
      toast({ title: t("kpis:valueSaved"), variant: "success" });
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      toast({
        title: t("kpis:updateValueFailed"),
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (value === "") return;
    mutation.mutate(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("kpis:values.recordMeasurement")}</DialogTitle>
          <DialogDescription>
            {t("kpis:values.updateCurrentFor", { name: kpiName })}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="value">
              {t("kpis:values.currentValue")}
              {unit ? ` (${unit})` : ""}
            </Label>
            <Input
              id="value"
              type="number"
              step="any"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder="0"
              autoFocus
              required
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              {t("actions.cancel")}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("kpis:values.saveValue")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
