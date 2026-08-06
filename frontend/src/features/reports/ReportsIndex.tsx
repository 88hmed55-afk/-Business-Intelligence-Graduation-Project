import { useState } from "react";
import { BarChart3, FileText } from "lucide-react";

import { BusinessReportsPage } from "@/features/reports/BusinessReportsPage";
import { ReportsPage } from "@/features/reports/ReportsPage";
import { cn } from "@/lib/utils";

type Tab = "analytics" | "saved";

export function ReportsIndex() {
  const [tab, setTab] = useState<Tab>("analytics");

  return (
    <div className="space-y-6">
      <div className="inline-flex rounded-lg border bg-muted/40 p-1">
        {(
          [
            { key: "analytics", label: "Business analytics", icon: BarChart3 },
            { key: "saved", label: "Saved reports", icon: FileText },
          ] as const
        ).map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
              tab === item.key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </button>
        ))}
      </div>
      {tab === "analytics" ? <BusinessReportsPage /> : <ReportsPage />}
    </div>
  );
}
