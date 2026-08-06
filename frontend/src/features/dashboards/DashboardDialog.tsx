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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import {
  dashboardsApi,
  type DashboardCreatePayload,
  type DashboardUpdatePayload,
} from "@/features/dashboards/api";
import { ApiClientError } from "@/lib/api";
import type { Dashboard } from "@/types";

interface DashboardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dashboard?: Dashboard | null;
}

export function DashboardDialog({ open, onOpenChange, dashboard }: DashboardDialogProps) {
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  useEffect(() => {
    if (open) {
      setName(dashboard?.name ?? "");
      setDescription(dashboard?.description ?? "");
      setIsPublic(dashboard?.is_public ?? false);
    }
  }, [open, dashboard]);

  const createMutation = useMutation({
    mutationFn: (payload: DashboardCreatePayload) => dashboardsApi.create(payload),
    onSuccess: () => {
      toast({ title: "Dashboard created", variant: "success" });
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      toast({
        title: "Could not create dashboard",
        description: error instanceof ApiClientError ? error.message : "Unexpected error",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: DashboardUpdatePayload }) =>
      dashboardsApi.update(id, payload),
    onSuccess: () => {
      toast({ title: "Dashboard updated", variant: "success" });
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      toast({
        title: "Could not update dashboard",
        description: error instanceof ApiClientError ? error.message : "Unexpected error",
        variant: "destructive",
      });
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const payload: DashboardCreatePayload = {
      name: name.trim(),
      description: description.trim() || null,
      is_public: isPublic,
    };
    if (dashboard) {
      updateMutation.mutate({ id: dashboard.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{dashboard ? "Edit dashboard" : "Create dashboard"}</DialogTitle>
          <DialogDescription>
            {dashboard
              ? "Update the details of this dashboard."
              : "Create a new dashboard to organize your KPIs."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Sales Performance"
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
              rows={3}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor="public" className="cursor-pointer">
                Public dashboard
              </Label>
              <p className="text-xs text-muted-foreground">
                Allow other users to view this dashboard
              </p>
            </div>
            <Switch id="public" checked={isPublic} onCheckedChange={setIsPublic} />
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
              {dashboard ? "Save changes" : "Create dashboard"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
