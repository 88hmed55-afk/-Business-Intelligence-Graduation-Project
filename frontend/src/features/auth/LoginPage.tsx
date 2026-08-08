import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Lock, Mail } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { authApi, type LoginPayload } from "@/features/auth/api";
import { getErrorMessage } from "@/lib/error-messages";
import { useAuthStore } from "@/stores/auth-store";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [form, setForm] = useState<LoginPayload>({ email: "", password: "" });

  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? "/";

  const mutation = useMutation({
    mutationFn: (payload: LoginPayload) => authApi.login(payload),
    onSuccess: (data) => {
      setAuth(data.access_token, data.refresh_token, data.user);
      toast({
        title: t("auth:login.title"),
        description: t("auth:login.signedInAs", { name: data.user.full_name }),
        variant: "success",
      });
      navigate(from, { replace: true });
    },
    onError: (error: unknown) => {
      toast({ title: t("auth:login.signInFailed"), description: getErrorMessage(error), variant: "destructive" });
    },
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    mutation.mutate(form);
  };

  return (
    <div>
      <div className="mb-6 space-y-1.5 text-center">
        <h1 className="text-2xl font-bold tracking-tight">{t("auth:login.signIn")}</h1>
        <p className="text-sm text-muted-foreground">{t("auth:login.subtitle")}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">{t("auth:login.email")}</Label>
          <div className="relative">
            <Mail className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder={t("auth:login.emailPlaceholder")}
              className="ps-9"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">{t("auth:login.password")}</Label>
          <div className="relative">
            <Lock className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder={t("auth:login.passwordPlaceholder")}
              className="ps-9"
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              required
            />
          </div>
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={mutation.isPending}>
          {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {mutation.isPending ? t("auth:login.signingIn") : t("auth:login.signIn")}
        </Button>
      </form>

      <div className="mt-6 rounded-lg border bg-muted/50 p-3 text-center text-xs text-muted-foreground">
        <p className="font-medium text-foreground">{t("auth:login.demoCredentials")}</p>
        <p className="mt-1" dir="ltr">
          {t("auth:login.demoCredentialsValue")}
        </p>
      </div>
    </div>
  );
}
