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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { reportsApi, type ReportCreatePayload, type ReportUpdatePayload } from "@/features/reports/api";
import { getErrorMessage } from "@/lib/error-messages";
import type { Report, ReportStatus } from "@/types";

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report?: Report | null;
}

const statusOptions: Array<{ value: ReportStatus; label: string }> = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

export function ReportDialog({ open, onOpenChange, report }: ReportDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [query, setQuery] = useState("");
  const [schedule, setSchedule] = useState("");
  const [status, setStatus] = useState<ReportStatus>("draft");

  useEffect(() => {
    if (open) {
      setName(report?.name ?? "");
      setDescription(report?.description ?? "");
      setQuery(report?.query ?? "");
      setSchedule(report?.schedule ?? "");
      setStatus(report?.status ?? "draft");
    }
  }, [open, report]);

  const createMutation = useMutation({
    mutationFn: (payload: ReportCreatePayload) => reportsApi.create(payload),
    onSuccess: () => {
      toast({ title: t("reports:createdToast"), variant: "success" });
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      toast({
        title: t("reports:createFailedToast"),
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ReportUpdatePayload }) =>
      reportsApi.update(id, payload),
    onSuccess: () => {
      toast({ title: t("reports:updatedToast"), variant: "success" });
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      toast({
        title: t("reports:updateFailedToast"),
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const payload: ReportCreatePayload = {
      name: name.trim(),
      description: description.trim() || undefined,
      query: query.trim(),
      schedule: schedule.trim() || undefined,
      status,
    };
    if (report) {
      updateMutation.mutate({ id: report.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{report ? t("reports:edit") : t("reports:create")}</DialogTitle>
          <DialogDescription>
            {report ? t("reports:editDescription") : t("reports:createDescription")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t("reports:fields.name")}</Label>
            <Input
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("reports:fields.namePlaceholder")}
              required
              maxLength={200}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">{t("reports:fields.description")}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t("reports:fields.descriptionPlaceholder")}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="query">{t("reports:fields.query")}</Label>
            <Textarea
              id="query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("reports:fields.queryPlaceholder")}
              rows={4}
              className="font-mono text-xs"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="schedule">{t("reports:fields.schedule")}</Label>
              <Input
                id="schedule"
                value={schedule}
                onChange={(event) => setSchedule(event.target.value)}
                placeholder="0 8 * * 1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">{t("labels.status")}</Label>
              <Select value={status} onValueChange={(value: ReportStatus) => setStatus(value)}>
                <SelectTrigger id="status">
                  <SelectValue placeholder={t("reports:selectStatus")} />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {t(`reports:statuses.${option.value}`, { defaultValue: option.label })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
              {report ? t("actions.save") : t("reports:create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
