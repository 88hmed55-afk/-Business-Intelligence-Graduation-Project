import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { usersApi, type UserCreatePayload, type UserUpdatePayload } from "@/features/users/api";
import { ApiClientError } from "@/lib/api";
import { toTitleCase } from "@/lib/utils";
import type { User, UserRole } from "@/types";

interface UserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: User | null;
}

const roles: UserRole[] = ["admin", "analyst", "viewer"];

export function UserDialog({ open, onOpenChange, user }: UserDialogProps) {
  const { toast } = useToast();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<UserRole>("analyst");
  const [isActive, setIsActive] = useState(true);
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (open) {
      setFullName(user?.full_name ?? "");
      setEmail(user?.email ?? "");
      setUsername(user?.username ?? "");
      setRole(user?.role ?? "analyst");
      setIsActive(user?.is_active ?? true);
      setPassword("");
    }
  }, [open, user]);

  const createMutation = useMutation({
    mutationFn: (payload: UserCreatePayload) => usersApi.create(payload),
    onSuccess: () => {
      toast({ title: "User created", variant: "success" });
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      toast({
        title: "Could not create user",
        description: error instanceof ApiClientError ? error.message : "Unexpected error",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UserUpdatePayload }) =>
      usersApi.update(id, payload),
    onSuccess: () => {
      toast({ title: "User updated", variant: "success" });
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      toast({
        title: "Could not update user",
        description: error instanceof ApiClientError ? error.message : "Unexpected error",
        variant: "destructive",
      });
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (user) {
      const payload: UserUpdatePayload = {
        full_name: fullName.trim(),
        email,
        username: username.trim(),
        role,
        is_active: isActive,
        ...(password ? { password } : {}),
      };
      updateMutation.mutate({ id: user.id, payload });
    } else {
      const payload: UserCreatePayload = {
        full_name: fullName.trim(),
        email,
        username: username.trim(),
        role,
        password,
      };
      createMutation.mutate(payload);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{user ? "Edit user" : "Create user"}</DialogTitle>
          <DialogDescription>
            {user ? "Update this user's details and permissions." : "Create a new user account."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
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
            <Label htmlFor="password">
              {user ? "New password (optional)" : "Password"}
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required={!user}
              minLength={8}
              placeholder="••••••••"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={role} onValueChange={(value: UserRole) => setRole(value)}>
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r} value={r}>
                      {toTitleCase(r)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {user && (
              <div className="flex items-end pb-1">
                <div className="flex w-full items-center justify-between rounded-lg border p-3">
                  <Label htmlFor="active" className="cursor-pointer">
                    Active
                  </Label>
                  <Switch id="active" checked={isActive} onCheckedChange={setIsActive} />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {user ? "Save changes" : "Create user"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
