import { Calendar, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { DATE_PRESETS, useDateFilterStore } from "@/stores/date-filter-store";

export function DateFilter() {
  const { t } = useTranslation();
  const { preset, dateFrom, dateTo, setPreset } = useDateFilterStore();

  const activeLabel = preset === "custom"
    ? `${dateFrom} — ${dateTo}`
    : t(`nav:dates.${DATE_PRESETS.find(p => p.key === preset)?.key ?? "all"}`, {
        defaultValue: DATE_PRESETS.find(p => p.key === preset)?.label,
      });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Calendar className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{activeLabel}</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {DATE_PRESETS.map((p) => (
          <DropdownMenuItem
            key={p.key}
            onClick={() => setPreset(p.key)}
            className={cn(preset === p.key && "bg-primary/10 font-medium text-primary")}
          >
            {t(`nav:dates.${p.key}`, { defaultValue: p.label })}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
