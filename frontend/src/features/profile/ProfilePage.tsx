import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { KeyRound, Loader2, LogOut, ShieldCheck, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { PageHeader } from "@/components/common/PageHeader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { FormInput } from "@/components/forms";
import { authApi } from "@/features/auth/api";
import { ApiClientError } from "@/lib/api";
import { formatDate, initials, toTitleCase } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";

export function ProfilePage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const changePasswordMutation = useMutation({
    mutationFn: (payload: { old_password: string; new_password: string }) =>
      authApi.changePassword(payload),
    onSuccess: () => {
      toast({ title: "Password changed", variant: "success" });
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordError("");
    },
    onError: (error: unknown) => {
      toast({
        title: "Could not change password",
        description: error instanceof ApiClientError ? error.message : "Unexpected error",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters");
      return;
    }
    setPasswordError("");
    changePasswordMutation.mutate({ old_password: oldPassword, new_password: newPassword });
  };

  const handleLogout = () => {
    clearAuth();
    navigate("/login");
  };

  return (
    <div className="space-y-6">
      <PageHeader title="My profile" description="View your account details and security settings." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserRound className="h-5 w-5 text-primary" />
              Account
            </CardTitle>
            <CardDescription>Your account information.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src="" alt={user?.full_name ?? ""} />
                <AvatarFallback className="text-lg">{initials(user?.full_name)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-lg font-semibold">{user?.full_name}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Role</p>
                <p className="mt-0.5 font-medium">{user ? toTitleCase(user.role) : "—"}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Username</p>
                <p className="mt-0.5 font-medium">{user?.username ?? "—"}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Status</p>
                <div className="mt-1">
                  <Badge variant={user?.is_active ? "success" : "destructive"}>
                    {user?.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Last login</p>
                <p className="mt-0.5 font-medium">{formatDate(user?.last_login_at ?? null)}</p>
              </div>
            </div>
            {user?.is_superuser && (
              <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Superuser — full platform access
              </div>
            )}
            <Button variant="outline" className="w-full text-destructive hover:text-destructive" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              Change password
            </CardTitle>
            <CardDescription>Update the password for your account.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <FormInput
                label="Current password"
                required
                type="password"
                value={oldPassword}
                onChange={(value) => setOldPassword(value)}
              />
              <FormInput
                label="New password"
                required
                type="password"
                value={newPassword}
                onChange={(value) => setNewPassword(value)}
              />
              <FormInput
                label="Confirm new password"
                required
                type="password"
                value={confirmPassword}
                onChange={(value) => setConfirmPassword(value)}
                error={passwordError}
              />
              <Button type="submit" disabled={changePasswordMutation.isPending}>
                {changePasswordMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Update password
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
