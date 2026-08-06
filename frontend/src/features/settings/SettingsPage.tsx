import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { KeyRound, Monitor, Moon, PenLine, Plus, RefreshCw, Settings2, Sun, Trash2 } from "lucide-react";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataPagination } from "@/components/common/DataPagination";
import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { SettingDialog } from "@/features/settings/SettingDialog";
import { settingsApi } from "@/features/settings/api";
import { statisticsApi } from "@/features/reports/api";
import { useTheme } from "@/hooks/use-theme";
import { ApiClientError } from "@/lib/api";
import { cn, formatDateShort } from "@/lib/utils";
import type { AppSetting } from "@/types";

const PAGE_SIZE = 10;

export function SettingsPage() {
  const { toast } = useToast();
  const { mode, setMode } = useTheme();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [group, setGroup] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AppSetting | null>(null);
  const [deleting, setDeleting] = useState<AppSetting | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["settings", page, debouncedSearch, group],
    queryFn: () =>
      settingsApi.list({
        page,
        page_size: PAGE_SIZE,
        search: debouncedSearch || undefined,
        group_name: group || undefined,
      }),
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const refreshStatsMutation = useMutation({
    mutationFn: () => statisticsApi.refresh(),
    onSuccess: (result) => {
      toast({
        title: "Statistics refreshed",
        description: `${Object.keys(result.metrics ?? {}).length} metrics updated`,
        variant: "success",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Could not refresh statistics",
        description: error instanceof ApiClientError ? error.message : "Unexpected error",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => settingsApi.remove(id),
    onSuccess: () => {
      toast({ title: "Setting deleted", variant: "success" });
      setDeleting(null);
    },
    onError: (error: unknown) => {
      toast({
        title: "Could not delete setting",
        description: error instanceof ApiClientError ? error.message : "Unexpected error",
        variant: "destructive",
      });
    },
  });

  if (isError) {
    return <ErrorState message="Could not load settings." onRetry={() => void refetch()} />;
  }

  const settings = data?.items ?? [];
  const groups = Array.from(new Set(settings.map((setting) => setting.group_name))).filter(Boolean);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage application settings and key-value configuration."
      >
        <Button
          variant="outline"
          disabled={refreshStatsMutation.isPending}
          onClick={() => refreshStatsMutation.mutate()}
        >
          <RefreshCw className={cn("h-4 w-4", refreshStatsMutation.isPending && "animate-spin")} />
          Refresh statistics
        </Button>
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          New setting
        </Button>
      </PageHeader>

      <div className="grid grid-cols-3 gap-2 sm:max-w-xs">
        {(
          [
            { value: "light", label: "Light", icon: Sun },
            { value: "dark", label: "Dark", icon: Moon },
            { value: "system", label: "System", icon: Monitor },
          ] as const
        ).map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setMode(option.value)}
            className={cn(
              "flex flex-col items-center gap-2 rounded-lg border p-3 text-sm font-medium transition-colors",
              mode === option.value
                ? "border-primary bg-primary/10 text-primary"
                : "hover:bg-accent",
            )}
          >
            <option.icon className="h-4 w-4" />
            {option.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search settings…"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <svg
            viewBox="0 0 24 24"
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </div>
        {groups.length > 0 && (
          <Select
            value={group}
            onValueChange={(value) => {
              setGroup(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="All groups" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All groups</SelectItem>
              {groups.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="rounded-xl border">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-12 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : settings.length === 0 ? (
          <div className="p-12 text-center">
            <Settings2 className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 font-medium">No settings found</p>
            <p className="text-sm text-muted-foreground">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Key</th>
                <th className="px-4 py-3 font-medium">Group</th>
                <th className="px-4 py-3 font-medium">Value</th>
                <th className="px-4 py-3 font-medium">Public</th>
                <th className="px-4 py-3 font-medium">Updated</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {settings.map((setting) => (
                <tr key={setting.id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <KeyRound className="h-4 w-4 text-primary/70" />
                      <span className="font-medium">{setting.key}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{setting.group_name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <pre className="max-w-[320px] truncate font-mono text-xs text-muted-foreground">
                      {JSON.stringify(setting.value)}
                    </pre>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={setting.is_public ? "success" : "secondary"}>
                      {setting.is_public ? "Public" : "Private"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDateShort(setting.updated_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <span className="sr-only">Actions</span>
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                            <circle cx="12" cy="5" r="1.5" />
                            <circle cx="12" cy="12" r="1.5" />
                            <circle cx="12" cy="19" r="1.5" />
                          </svg>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditing(setting);
                            setDialogOpen(true);
                          }}
                        >
                          <PenLine />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleting(setting)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <DataPagination
        page={page}
        pages={data?.pages ?? 1}
        total={data?.total ?? 0}
        onPageChange={setPage}
        className={cn(isLoading || settings.length === 0 ? "hidden" : "")}
      />

      <SettingDialog open={dialogOpen} onOpenChange={setDialogOpen} setting={editing} />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        onConfirm={() => (deleting ? deleteMutation.mutateAsync(deleting.id) : Promise.resolve())}
        title="Delete setting"
        description={deleting ? `Are you sure you want to delete setting "${deleting.key}"?` : undefined}
        confirmLabel="Delete"
      />
    </div>
  );
}
