import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Monitor, Moon, Save, Sun } from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { authApi } from "@/features/auth/api";
import { usersApi } from "@/features/users/api";
import { useTheme } from "@/hooks/use-theme";
import { ApiClientError } from "@/lib/api";
import { cn, initials, toTitleCase } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import type { ThemeMode } from "@/stores/theme-store";

export function SettingsPage() {
  const { toast } = useToast();
  const { mode, setMode } = useTheme();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [email, setEmail] = useState(user?.email ?? "");

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const profileMutation = useMutation({
    mutationFn: () => usersApi.updateMe({ full_name: fullName, username, email }),
    onSuccess: (updated) => {
      setUser(updated);
      toast({ title: "Profile updated", variant: "success" });
    },
    onError: (error: unknown) => {
      toast({
        title: "Could not update profile",
        description: error instanceof ApiClientError ? error.message : "Unexpected error",
        variant: "destructive",
      });
    },
  });

  const passwordMutation = useMutation({
    mutationFn: () => authApi.changePassword({ old_password: oldPassword, new_password: newPassword }),
    onSuccess: () => {
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "Password updated", variant: "success" });
    },
    onError: (error: unknown) => {
      toast({
        title: "Could not update password",
        description: error instanceof ApiClientError ? error.message : "Unexpected error",
        variant: "destructive",
      });
    },
  });

  const themeOptions: Array<{ value: ThemeMode; label: string; icon: React.ReactNode }> = [
    { value: "light", label: "Light", icon: <Sun className="h-4 w-4" /> },
    { value: "dark", label: "Dark", icon: <Moon className="h-4 w-4" /> },
    { value: "system", label: "System", icon: <Monitor className="h-4 w-4" /> },
  ];

  const handlePasswordSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords do not match",
        description: "Please make sure both password fields match.",
        variant: "destructive",
      });
      return;
    }
    passwordMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage your profile, password and preferences" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="glass-card lg:col-span-2">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Update your personal information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6 flex items-center gap-4">
              <Avatar className="h-16 w-16 text-lg">
                <AvatarFallback>{initials(user?.full_name)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{user?.full_name}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                <Badge className="mt-1" variant="secondary">
                  {toTitleCase(user?.role ?? "")}
                </Badge>
              </div>
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                profileMutation.mutate();
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    required
                    minLength={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>
              </div>
              <Button type="submit" disabled={profileMutation.isPending}>
                {profileMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save profile
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Choose how Nova BI looks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {themeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setMode(option.value)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-lg border p-3 text-sm font-medium transition-colors",
                    mode === option.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "hover:bg-accent",
                  )}
                >
                  {option.icon}
                  {option.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Change password</CardTitle>
          <CardDescription>Update the password for your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="max-w-md space-y-4">
            <div className="space-y-2">
              <Label htmlFor="oldPassword">Current password</Label>
              <Input
                id="oldPassword"
                type="password"
                value={oldPassword}
                onChange={(event) => setOldPassword(event.target.value)}
                required
              />
            </div>
            <Separator />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm new password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  minLength={8}
                />
              </div>
            </div>
            <Button type="submit" variant="secondary" disabled={passwordMutation.isPending}>
              {passwordMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Update password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
