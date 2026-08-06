import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Lock, Mail } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { authApi, type LoginPayload } from "@/features/auth/api";
import { ApiClientError } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [form, setForm] = useState<LoginPayload>({ email: "", password: "" });

  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? "/";

  const mutation = useMutation({
    mutationFn: (payload: LoginPayload) => authApi.login(payload),
    onSuccess: (data) => {
      setAuth(data.access_token, data.refresh_token, data.user);
      toast({ title: "Welcome back", description: `Signed in as ${data.user.full_name}`, variant: "success" });
      navigate(from, { replace: true });
    },
    onError: (error: unknown) => {
      const message = error instanceof ApiClientError ? error.message : "Sign in failed";
      toast({ title: "Sign in failed", description: message, variant: "destructive" });
    },
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    mutation.mutate(form);
  };

  return (
    <div>
      <div className="mb-6 space-y-1.5 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Sign in</h1>
        <p className="text-sm text-muted-foreground">
          Enter your credentials to access Nova BI
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              className="pl-9"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              className="pl-9"
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              required
            />
          </div>
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={mutation.isPending}>
          {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Sign in
        </Button>
      </form>

      <div className="mt-6 rounded-lg border bg-muted/50 p-3 text-center text-xs text-muted-foreground">
        <p className="font-medium text-foreground">Demo credentials</p>
        <p className="mt-1">admin@bisystem.dev · Admin@1234</p>
      </div>
    </div>
  );
}
