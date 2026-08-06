import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { dashboardsApi } from "@/features/dashboards/api";
import { kpisApi, type KpiCreatePayload, type KpiUpdatePayload } from "@/features/kpis/api";
import { ApiClientError } from "@/lib/api";
import { toTitleCase } from "@/lib/utils";
import type { Kpi, KpiCategory, KpiTrend } from "@/types";

interface KpiDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kpi?: Kpi | null;
  defaultDashboardId?: string | null;
}

const categories: KpiCategory[] = [
  "finance",
  "sales",
  "operations",
  "marketing",
  "hr",
  "it",
  "other",
];

const trends: KpiTrend[] = ["up", "down", "flat"];

export function KpiDialog({ open, onOpenChange, kpi, defaultDashboardId }: KpiDialogProps) {
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<KpiCategory>("finance");
  const [formula, setFormula] = useState("");
  const [target, setTarget] = useState("");
  const [current, setCurrent] = useState("");
  const [unit, setUnit] = useState("");
  const [trend, setTrend] = useState<KpiTrend>("flat");
  const [dashboardId, setDashboardId] = useState<string>("none");

  const dashboardsQuery = useQuery({
    queryKey: ["dashboards", "options"],
    queryFn: () => dashboardsApi.list({ page_size: 100 }),
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      setName(kpi?.name ?? "");
      setDescription(kpi?.description ?? "");
      setCategory(kpi?.category ?? "finance");
      setFormula(kpi?.formula ?? "");
      setTarget(kpi?.target_value ?? "");
      setCurrent(kpi?.current_value ?? "");
      setUnit(kpi?.unit ?? "");
      setTrend(kpi?.trend ?? "flat");
      setDashboardId(kpi?.dashboard_id ?? defaultDashboardId ?? "none");
    }
  }, [open, kpi, defaultDashboardId]);

  const createMutation = useMutation({
    mutationFn: (payload: KpiCreatePayload) => kpisApi.create(payload),
    onSuccess: () => {
      toast({ title: "KPI created", variant: "success" });
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      toast({
        title: "Could not create KPI",
        description: error instanceof ApiClientError ? error.message : "Unexpected error",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: KpiUpdatePayload }) =>
      kpisApi.update(id, payload),
    onSuccess: () => {
      toast({ title: "KPI updated", variant: "success" });
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      toast({
        title: "Could not update KPI",
        description: error instanceof ApiClientError ? error.message : "Unexpected error",
        variant: "destructive",
      });
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const payload: KpiCreatePayload = {
      name: name.trim(),
      description: description.trim() || null,
      category,
      formula: formula.trim(),
      target_value: target === "" ? null : target,
      current_value: current === "" ? null : current,
      unit: unit.trim() || null,
      trend,
      dashboard_id: dashboardId === "none" ? null : dashboardId,
    };
    if (kpi) {
      updateMutation.mutate({ id: kpi.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{kpi ? "Edit KPI" : "Create KPI"}</DialogTitle>
          <DialogDescription>
            {kpi ? "Update this KPI definition." : "Define a new key performance indicator."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Monthly Revenue"
              required
              maxLength={200}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Optional description"
              rows={2}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={(value: KpiCategory) => setCategory(value)}>
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {toTitleCase(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="trend">Target trend</Label>
              <Select value={trend} onValueChange={(value: KpiTrend) => setTrend(value)}>
                <SelectTrigger id="trend">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {trends.map((t) => (
                    <SelectItem key={t} value={t}>
                      {toTitleCase(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="target">Target value</Label>
              <Input
                id="target"
                type="number"
                step="any"
                value={target}
                onChange={(event) => setTarget(event.target.value)}
                placeholder="100000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="current">Current value</Label>
              <Input
                id="current"
                type="number"
                step="any"
                value={current}
                onChange={(event) => setCurrent(event.target.value)}
                placeholder="85000"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                value={unit}
                onChange={(event) => setUnit(event.target.value)}
                placeholder="$ or %"
                maxLength={50}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dashboard">Dashboard</Label>
              <Select value={dashboardId} onValueChange={setDashboardId}>
                <SelectTrigger id="dashboard">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {dashboardsQuery.data?.items.map((dashboard) => (
                    <SelectItem key={dashboard.id} value={dashboard.id}>
                      {dashboard.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="formula">Formula</Label>
            <Textarea
              id="formula"
              value={formula}
              onChange={(event) => setFormula(event.target.value)}
              placeholder="revenue / headcount"
              rows={2}
              className="font-mono text-xs"
              maxLength={2000}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {kpi ? "Save changes" : "Create KPI"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
