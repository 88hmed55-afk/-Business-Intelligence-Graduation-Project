import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Shield } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { FormInput, FormTextarea } from "@/components/forms";
import { permissionsApi, rolesApi } from "@/features/roles/api";
import { getErrorMessage } from "@/lib/error-messages";
import { cn, toTitleCase } from "@/lib/utils";
import type { Permission, Role, RoleDetail } from "@/types";

interface RoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role?: Role | null;
  roleDetail?: RoleDetail | null;
}

export function RoleDialog({ open, onOpenChange, role, roleDetail }: RoleDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: permissionsData } = useQuery({
    queryKey: ["permissions"],
    queryFn: () => permissionsApi.list({ page_size: 500 }),
  });

  const permissions = permissionsData?.items ?? [];

  useEffect(() => {
    if (open) {
      setName(role?.name ?? "");
      setDescription(role?.description ?? "");
      setSelected(new Set((roleDetail?.permissions ?? []).map((permission) => permission.id)));
    }
  }, [open, role, roleDetail]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const createMutation = useMutation({
    mutationFn: (payload: { name: string; description?: string; permission_ids?: string[] }) =>
      rolesApi.create(payload),
    onSuccess: () => {
      toast({ title: t("roles:createdToast"), variant: "success" });
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      toast({
        title: t("roles:createFailedToast"),
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { description?: string; permission_ids?: string[] } }) =>
      rolesApi.update(id, payload),
    onSuccess: () => {
      toast({ title: t("roles:updatedToast"), variant: "success" });
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      toast({
        title: t("roles:updateFailedToast"),
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const modules = Array.from(new Set(permissions.map((permission) => permission.module))).sort();
  const permissionsByModule = (module: string): Permission[] =>
    permissions.filter((permission) => permission.module === module);

  const allSelected = (module: string) => {
    const ids = permissionsByModule(module).map((permission) => permission.id);
    return ids.length > 0 && ids.every((id) => selected.has(id));
  };

  const toggleModule = (module: string) => {
    const ids = permissionsByModule(module).map((permission) => permission.id);
    const isAll = allSelected(module);
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (isAll) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const permission_ids = Array.from(selected);
    if (role) {
      updateMutation.mutate({ id: role.id, payload: { description: description.trim() || undefined, permission_ids } });
    } else {
      createMutation.mutate({
        name: name.trim(),
        description: description.trim() || undefined,
        permission_ids,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {role ? `${t("roles:edit")}: ${role.name}` : t("roles:create")}
          </DialogTitle>
          <DialogDescription>
            {role ? t("roles:editDescription") : t("roles:createDescription")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!role && (
            <FormInput
              label={t("roles:fields.name")}
              required
              value={name}
              onChange={(value) => setName(value)}
            />
          )}
          <FormTextarea
            label={t("roles:fields.description")}
            rows={2}
            value={description}
            onChange={(value) => setDescription(value)}
          />
          <div className="space-y-3">
            <p className="text-sm font-medium">{t("roles:assign")}</p>
            {modules.length === 0 && (
              <p className="text-sm text-muted-foreground">{t("roles:noPermissions")}</p>
            )}
            {modules.map((module) => (
              <div key={module} className="rounded-lg border">
                <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-2">
                  <span className="text-sm font-medium">
                    {t("roles:permissionGroups." + module, { defaultValue: toTitleCase(module) })}
                  </span>
                  <button
                    type="button"
                    className="text-xs font-medium text-primary hover:underline"
                    onClick={() => toggleModule(module)}
                  >
                    {allSelected(module) ? t("roles:clearAll") : t("roles:selectAll")}
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-1.5 p-3 sm:grid-cols-2">
                  {permissionsByModule(module).map((permission) => (
                    <label
                      key={permission.id}
                      className={cn(
                        "flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted/60",
                        selected.has(permission.id) && "bg-primary/5",
                      )}
                    >
                      <Checkbox
                        checked={selected.has(permission.id)}
                        onCheckedChange={() => toggle(permission.id)}
                        className="mt-0.5"
                      />
                      <span className="min-w-0">
                        <span className="block font-medium">
                          {t("roles:permissionLevels." + permission.action, {
                            defaultValue: toTitleCase(permission.action),
                          })}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {permission.description ?? permission.code}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              {t("actions.cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {role ? t("actions.save") : t("roles:create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
