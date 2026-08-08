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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import {
  dashboardsApi,
  type DashboardCreatePayload,
  type DashboardUpdatePayload,
} from "@/features/dashboards/api";
import { getErrorMessage } from "@/lib/error-messages";
import type { Dashboard } from "@/types";

interface DashboardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dashboard?: Dashboard | null;
}

export function DashboardDialog({ open, onOpenChange, dashboard }: DashboardDialogProps) {
  const { t } = useTranslation();
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
      toast({ title: t("dashboards:createdToast"), variant: "success" });
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      toast({
        title: t("dashboards:createFailedToast"),
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: DashboardUpdatePayload }) =>
      dashboardsApi.update(id, payload),
    onSuccess: () => {
      toast({ title: t("dashboards:updatedToast"), variant: "success" });
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      toast({
        title: t("dashboards:updateFailedToast"),
        description: getErrorMessage(error),
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
          <DialogTitle>{dashboard ? t("dashboards:edit") : t("dashboards:create")}</DialogTitle>
          <DialogDescription>
            {dashboard
              ? t("dashboards:editDescription")
              : t("dashboards:createDescription")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t("labels.name")}</Label>
            <Input
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("dashboards:fields.namePlaceholder")}
              required
              maxLength={200}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">{t("dashboards:fields.description")}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t("dashboards:fields.descriptionPlaceholder")}
              rows={3}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor="public" className="cursor-pointer">
                {t("dashboards:publicDashboard")}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t("dashboards:publicDashboardHint")}
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
              {t("actions.cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {dashboard ? t("actions.save") : t("dashboards:create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
