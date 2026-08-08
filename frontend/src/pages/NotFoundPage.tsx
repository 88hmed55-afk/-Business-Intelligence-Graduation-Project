import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-4 text-center">
      <Logo />
      <div className="space-y-2">
        <p className="gradient-text text-7xl font-extrabold tracking-tight">404</p>
        <h1 className="text-2xl font-bold">{t("auth:notFound.title")}</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          {t("auth:notFound.description")}
        </p>
      </div>
      <Button asChild>
        <Link to="/">{t("auth:notFound.backHome")}</Link>
      </Button>
    </div>
  );
}
