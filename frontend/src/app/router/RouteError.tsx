import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { isRouteErrorResponse, useRouteError } from "react-router-dom";

import { Button } from "@/components/ui/button";

export function RouteError() {
  const error = useRouteError();
  const { t } = useTranslation();

  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : t("auth:routeError.unexpected");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <div className="space-y-1">
        <h1 className="text-lg font-bold">{t("auth:routeError.title")}</h1>
        <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      </div>
      <Button onClick={() => window.location.assign("/")}>{t("auth:routeError.backHome")}</Button>
    </div>
  );
}
