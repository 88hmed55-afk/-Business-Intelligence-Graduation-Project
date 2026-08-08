import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Home } from "lucide-react";

import { useIsRTL } from "@/hooks/use-direction";

const SEGMENT_KEYS: Record<string, string> = {
  "": "dashboard",
  analytics: "analytics",
  reports: "reports",
  customers: "customers",
  products: "products",
  categories: "categories",
  suppliers: "suppliers",
  inventory: "inventory",
  orders: "orders",
  payments: "payments",
  employees: "employees",
  roles: "rolesPermissions",
  "activity-logs": "activityLogs",
  notifications: "notifications",
  settings: "settings",
  profile: "profile",
  users: "users",
  kpis: "kpis",
  dashboards: "dashboards",
};

export function Breadcrumbs() {
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const location = useLocation();
  const segments = location.pathname.split("/").filter(Boolean);

  const crumbs = segments.length === 0 ? [""] : segments;

  const SeparatorIcon = isRTL ? ChevronLeft : ChevronRight;

  return (
    <nav aria-label={t("nav:breadcrumb")} className="hidden items-center gap-1 text-sm md:flex">
      <Link
        to="/"
        className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>
      {crumbs.map((segment, index) => {
        const to = "/" + segments.slice(0, index + 1).join("/");
        const fallbackLabel = segment.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
        const label = t(`nav:items.${SEGMENT_KEYS[segment] ?? segment}`, { defaultValue: fallbackLabel });
        const isLast = index === crumbs.length - 1;
        return (
          <span key={to} className="flex items-center gap-1">
            <SeparatorIcon className="h-3.5 w-3.5 text-muted-foreground/60" />
            {isLast ? (
              <span className="font-medium text-foreground">{label}</span>
            ) : (
              <Link to={to} className="text-muted-foreground transition-colors hover:text-foreground">
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
