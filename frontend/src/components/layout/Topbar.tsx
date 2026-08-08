import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LogOut, Settings, UserRound } from "lucide-react";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { NotificationsDropdown } from "@/components/layout/NotificationsDropdown";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/stores/auth-store";
import { initials, toTitleCase } from "@/lib/utils";

interface TopbarProps {
  onMenuClick?: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, clearAuth } = useAuthStore();

  const handleLogout = () => {
    clearAuth();
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-xl sm:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
        aria-label={t("nav:openMenu")}
      >
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </Button>

      <Breadcrumbs />

      <div className="flex-1" />

      <NotificationsDropdown />
      <LanguageSwitcher />
      <ThemeToggle />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative flex items-center gap-2 rounded-full p-1 pe-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback>{initials(user?.full_name)}</AvatarFallback>
            </Avatar>
            <div className="hidden text-start leading-tight sm:block">
              <p className="text-sm font-medium">{user?.full_name}</p>
              <p className="text-[11px] text-muted-foreground">
                {user?.role ? t("roles." + user.role, { defaultValue: toTitleCase(user.role) }) : ""}
              </p>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="flex flex-col">
            <span>{user?.full_name}</span>
            <span className="text-xs font-normal text-muted-foreground">{user?.email}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate("/profile")}>
            <UserRound />
            {t("nav:items.profile")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("/settings")}>
            <Settings />
            {t("nav:items.settings")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
            <LogOut />
            {t("nav:actions.logout")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
