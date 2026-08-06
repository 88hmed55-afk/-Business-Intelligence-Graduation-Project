import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

const LABELS: Record<string, string> = {
  "": "Dashboard",
  analytics: "Analytics",
  reports: "Reports",
  customers: "Customers",
  products: "Products",
  categories: "Categories",
  suppliers: "Suppliers",
  inventory: "Inventory",
  orders: "Orders",
  payments: "Payments",
  employees: "Employees",
  roles: "Roles & Permissions",
  "activity-logs": "Activity Logs",
  notifications: "Notifications",
  settings: "Settings",
  profile: "Profile",
  users: "Users",
  kpis: "KPIs",
  dashboards: "Dashboards",
};

export function Breadcrumbs() {
  const location = useLocation();
  const segments = location.pathname.split("/").filter(Boolean);

  const crumbs = segments.length === 0 ? [""] : segments;

  return (
    <nav aria-label="Breadcrumb" className="hidden items-center gap-1 text-sm md:flex">
      <Link
        to="/"
        className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>
      {crumbs.map((segment, index) => {
        const to = "/" + segments.slice(0, index + 1).join("/");
        const label = LABELS[segment] ?? segment.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
        const isLast = index === crumbs.length - 1;
        return (
          <span key={to} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
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
