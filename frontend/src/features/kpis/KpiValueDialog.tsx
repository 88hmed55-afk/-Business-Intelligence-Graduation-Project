import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

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
import { ApiClientError } from "@/lib/api";

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
      toast({ title: "KPI value recorded", variant: "success" });
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      toast({
        title: "Could not update value",
        description: error instanceof ApiClientError ? error.message : "Unexpected error",
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
          <DialogTitle>Record measurement</DialogTitle>
          <DialogDescription>Update the current value for {kpiName}.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="value">
              Current value{unit ? ` (${unit})` : ""}
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
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save value
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
