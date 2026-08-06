import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BarChart3,
  Bell,
  Boxes,
  ChevronLeft,
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
  const user = useAuthStore((state) => state.user);
  const collapsed = useUiStore((state) => state.sidebarCollapsed);
  const toggle = useUiStore((state) => state.toggleSidebar);
  const isAdmin = user?.role === "admin";

  const sections: NavSection[] = [
    {
      title: "Overview",
      items: [
        { label: "Executive Dashboard", to: "/", icon: LayoutDashboard, end: true },
        { label: "Dashboard", to: "/dashboard", icon: BarChart3 },
        { label: "Analytics", to: "/analytics", icon: TrendingUp },
      ],
    },
    {
      title: "Business Intelligence",
      items: [
        { label: "Forecasting", to: "/forecasting", icon: LineChart },
        { label: "Insights & Rankings", to: "/insights", icon: Zap },
        { label: "Trends & Analytics", to: "/trends", icon: Target },
        { label: "Reports", to: "/reports", icon: FileText },
      ],
    },
    {
      title: "Commerce",
      items: [
        { label: "Customers", to: "/customers", icon: Users },
        { label: "Products", to: "/products", icon: Package },
        { label: "Categories", to: "/categories", icon: Tags },
        { label: "Suppliers", to: "/suppliers", icon: Truck },
        { label: "Inventory", to: "/inventory", icon: Boxes },
        { label: "Orders", to: "/orders", icon: ShoppingCart },
        { label: "Payments", to: "/payments", icon: Wallet },
      ],
    },
    {
      title: "Organization",
      items: [
        { label: "Employees", to: "/employees", icon: CircleUser },
        { label: "Roles & Permissions", to: "/roles", icon: Shield, adminOnly: true },
        { label: "Activity Logs", to: "/activity-logs", icon: History, adminOnly: true },
      ],
    },
    {
      title: "Platform",
      items: [
        { label: "Notifications", to: "/notifications", icon: Bell },
        { label: "Settings", to: "/settings", icon: Settings },
        { label: "Profile", to: "/profile", icon: Gauge },
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
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <motion.span
            animate={{ rotate: collapsed ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center"
          >
            <ChevronLeft className="h-4 w-4" />
          </motion.span>
          {!collapsed && "Collapse"}
        </Button>
      </div>
    </div>
  );
}
