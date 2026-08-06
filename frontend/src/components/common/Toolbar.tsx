import { useEffect, useState, type ReactNode } from "react";
import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ToolbarProps {
  search?: string;
  onSearch?: (value: string) => void;
  searchPlaceholder?: string;
  children?: ReactNode;
  className?: string;
}

export function Toolbar({ search, onSearch, searchPlaceholder = "Search…", children, className }: ToolbarProps) {
  const [value, setValue] = useState(search ?? "");

  useEffect(() => {
    setValue(search ?? "");
  }, [search]);

  return (
    <div className={cn("flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between", className)}>
      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        {onSearch && (
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9 pr-9"
              placeholder={searchPlaceholder}
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
            {value && (
              <button
                type="button"
                onClick={() => {
                  setValue("");
                  onSearch("");
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
        {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
      </div>
    </div>
  );
}
