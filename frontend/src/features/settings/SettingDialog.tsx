import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { FormInput, FormSwitch, FormTextarea } from "@/components/forms";
import { settingsApi, type SettingCreatePayload, type SettingUpdatePayload } from "@/features/settings/api";
import { ApiClientError } from "@/lib/api";
import type { AppSetting } from "@/types";

interface SettingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  setting?: AppSetting | null;
}

export function SettingDialog({ open, onOpenChange, setting }: SettingDialogProps) {
  const { toast } = useToast();

  const [key, setKey] = useState("");
  const [group, setGroup] = useState("");
  const [description, setDescription] = useState("");
  const [json, setJson] = useState("{}");
  const [isPublic, setIsPublic] = useState(false);
  const [jsonError, setJsonError] = useState("");

  useEffect(() => {
    if (open) {
      setKey(setting?.key ?? "");
      setGroup(setting?.group_name ?? "");
      setDescription(setting?.description ?? "");
      setJson(JSON.stringify(setting?.value ?? {}, null, 2));
      setIsPublic(setting?.is_public ?? false);
      setJsonError("");
    }
  }, [open, setting]);

  const createMutation = useMutation({
    mutationFn: (payload: SettingCreatePayload) => settingsApi.create(payload),
    onSuccess: () => {
      toast({ title: "Setting created", variant: "success" });
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      toast({
        title: "Could not create setting",
        description: error instanceof ApiClientError ? error.message : "Unexpected error",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SettingUpdatePayload }) =>
      settingsApi.update(id, payload),
    onSuccess: () => {
      toast({ title: "Setting updated", variant: "success" });
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      toast({
        title: "Could not update setting",
        description: error instanceof ApiClientError ? error.message : "Unexpected error",
        variant: "destructive",
      });
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const parseValue = (): Record<string, unknown> | null => {
    try {
      const parsed = JSON.parse(json) as unknown;
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        setJsonError("Value must be a JSON object");
        return null;
      }
      setJsonError("");
      return parsed as Record<string, unknown>;
    } catch {
      setJsonError("Invalid JSON");
      return null;
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const value = parseValue();
    if (!value) return;
    if (setting) {
      updateMutation.mutate({
        id: setting.id,
        payload: {
          value,
          group_name: group.trim() || undefined,
          description: description.trim() || undefined,
          is_public: isPublic,
        },
      });
    } else {
      createMutation.mutate({
        key: key.trim(),
        value,
        group_name: group.trim() || undefined,
        description: description.trim() || undefined,
        is_public: isPublic,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            {setting ? `Edit setting: ${setting.key}` : "Create setting"}
          </DialogTitle>
          <DialogDescription>
            {setting ? "Update this setting's value." : "Add a new application setting."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!setting && (
            <FormInput label="Key" required value={key} onChange={(value) => setKey(value)} />
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormInput label="Group" value={group} onChange={(value) => setGroup(value)} />
            <FormSwitch label="Public" checked={isPublic} onCheckedChange={setIsPublic} />
          </div>
          <FormTextarea
            label="Value (JSON)"
            required
            rows={6}
            className="font-mono text-xs"
            value={json}
            onChange={(value) => setJson(value)}
            error={jsonError}
          />
          <FormTextarea
            label="Description"
            rows={2}
            value={description}
            onChange={(value) => setDescription(value)}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {setting ? "Save changes" : "Create setting"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
