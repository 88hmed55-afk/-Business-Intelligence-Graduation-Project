import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  BarChart3,
  Bell,
  Boxes,
  ChevronLeft,
  ChevronRight,
  CircleUser,
  FileText,
  Gauge,
  History,
  LayoutDashboard,
  LineChart,
  Package,
  Settings,
  Shield,
  ShoppingCart,
  Tags,
  Target,
  TrendingUp,
  Truck,
  Users,
  Wallet,
  Zap,
} from "lucide-react";

import { Logo } from "@/components/layout/Logo";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { useUiStore } from "@/stores/ui-store";
import { useIsRTL } from "@/hooks/use-direction";

interface SidebarProps {
  onNavigate?: () => void;
}

interface NavItem {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
  adminOnly?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const collapsed = useUiStore((state) => state.sidebarCollapsed);
  const toggle = useUiStore((state) => state.toggleSidebar);
  const isAdmin = user?.role === "admin";
  const isRTL = useIsRTL();
  const CollapseIcon = isRTL ? ChevronRight : ChevronLeft;

  const sections: NavSection[] = [
    {
      title: t("nav:sections.overview"),
      items: [
        { label: t("nav:items.executiveDashboard"), to: "/", icon: LayoutDashboard, end: true },
        { label: t("nav:items.dashboard"), to: "/dashboard", icon: BarChart3 },
        { label: t("nav:items.analytics"), to: "/analytics", icon: TrendingUp },
      ],
    },
    {
      title: t("nav:sections.businessIntelligence"),
      items: [
        { label: t("nav:items.forecasting"), to: "/forecasting", icon: LineChart },
        { label: t("nav:items.insights"), to: "/insights", icon: Zap },
        { label: t("nav:items.trends"), to: "/trends", icon: Target },
        { label: t("nav:items.reports"), to: "/reports", icon: FileText },
      ],
    },
    {
      title: t("nav:sections.commerce"),
      items: [
        { label: t("nav:items.customers"), to: "/customers", icon: Users },
        { label: t("nav:items.products"), to: "/products", icon: Package },
        { label: t("nav:items.categories"), to: "/categories", icon: Tags },
        { label: t("nav:items.suppliers"), to: "/suppliers", icon: Truck },
        { label: t("nav:items.inventory"), to: "/inventory", icon: Boxes },
        { label: t("nav:items.orders"), to: "/orders", icon: ShoppingCart },
        { label: t("nav:items.payments"), to: "/payments", icon: Wallet },
      ],
    },
    {
      title: t("nav:sections.organization"),
      items: [
        { label: t("nav:items.employees"), to: "/employees", icon: CircleUser },
        { label: t("nav:items.rolesPermissions"), to: "/roles", icon: Shield, adminOnly: true },
        { label: t("nav:items.activityLogs"), to: "/activity-logs", icon: History, adminOnly: true },
      ],
    },
    {
      title: t("nav:sections.platform"),
      items: [
        { label: t("nav:items.notifications"), to: "/notifications", icon: Bell },
        { label: t("nav:items.settings"), to: "/settings", icon: Settings },
        { label: t("nav:items.profile"), to: "/profile", icon: Gauge },
      ],
    },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className={cn("flex h-14 items-center gap-2 px-4", collapsed && "justify-center px-2")}>
        {collapsed ? (
          <Logo className="justify-center" compact />
        ) : (
          <Logo />
        )}
      </div>
      <Separator />
      <ScrollArea className="flex-1">
        <nav className="flex flex-col gap-5 p-3">
          {sections.map((section) => {
            const items = section.items.filter(
              (item) => !item.adminOnly || isAdmin,
            );
            if (items.length === 0) return null;
            return (
              <div key={section.title}>
                {!collapsed && (
                  <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {section.title}
                  </p>
                )}
                <div className="flex flex-col gap-1">
                  {items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      onClick={onNavigate}
                      title={collapsed ? item.label : undefined}
                      className={({ isActive }) =>
                        cn(
                          "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                          collapsed && "justify-center px-2",
                          isActive
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                        )
                      }
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>
      </ScrollArea>
      <Separator />
      <div className={cn("p-3", collapsed && "flex justify-center")}>
        <Button
          variant="outline"
          size="sm"
          onClick={toggle}
          className="w-full"
          title={collapsed ? t("nav:expand") : t("nav:collapse")}
        >
          <motion.span
            animate={{ rotate: collapsed ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center"
          >
            <CollapseIcon className="h-4 w-4" />
          </motion.span>
          {!collapsed && t("nav:collapse")}
        </Button>
      </div>
    </div>
  );
}
