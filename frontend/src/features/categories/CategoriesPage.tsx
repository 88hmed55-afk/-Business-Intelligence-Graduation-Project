import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { FolderTree, PenLine, Plus, Trash2 } from "lucide-react";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataPagination } from "@/components/common/DataPagination";
import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { CategoryDialog } from "@/features/categories/CategoryDialog";
import { categoriesApi } from "@/features/categories/api";
import { ApiClientError } from "@/lib/api";
import { cn, formatDateShort } from "@/lib/utils";
import type { Category } from "@/types";

const PAGE_SIZE = 10;

export function CategoriesPage() {
  const { toast } = useToast();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["categories", page, debouncedSearch],
    queryFn: () =>
      categoriesApi.list({
        page,
        page_size: PAGE_SIZE,
        search: debouncedSearch || undefined,
      }),
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoriesApi.remove(id),
    onSuccess: () => {
      toast({ title: "Category deleted", variant: "success" });
      setDeleting(null);
    },
    onError: (error: unknown) => {
      toast({
        title: "Could not delete category",
        description: error instanceof ApiClientError ? error.message : "Unexpected error",
        variant: "destructive",
      });
    },
  });

  if (isError) {
    return <ErrorState message="Could not load categories." onRetry={() => void refetch()} />;
  }

  const categories = data?.items ?? [];
  const categoryMap = new Map(categories.map((item) => [item.id, item]));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categories"
        description="Organize your product catalog into categories and subcategories."
      >
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          New category
        </Button>
      </PageHeader>

      <div className="relative w-full max-w-xs">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search categories…"
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

      <div className="rounded-xl border">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-12 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="p-12 text-center">
            <FolderTree className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 font-medium">No categories found</p>
            <p className="text-sm text-muted-foreground">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Parent</th>
                <th className="px-4 py-3 font-medium">Slug</th>
                <th className="px-4 py-3 font-medium">Sort order</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => {
                const parent = category.parent_id ? categoryMap.get(category.parent_id) : null;
                return (
                  <tr key={category.id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <FolderTree className="h-4 w-4 text-primary/70" />
                        <p className="font-medium">{category.name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{parent?.name ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {category.slug}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{category.sort_order}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDateShort(category.created_at)}
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
                              setEditing(category);
                              setDialogOpen(true);
                            }}
                          >
                            <PenLine />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeleting(category)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <DataPagination
        page={page}
        pages={data?.pages ?? 1}
        total={data?.total ?? 0}
        onPageChange={setPage}
        className={cn(isLoading || categories.length === 0 ? "hidden" : "")}
      />

      <CategoryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        category={editing}
        categories={categories}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        onConfirm={() => (deleting ? deleteMutation.mutateAsync(deleting.id) : Promise.resolve())}
        title="Delete category"
        description={deleting ? `Are you sure you want to delete "${deleting.name}"?` : undefined}
        confirmLabel="Delete"
      />
    </div>
  );
}
