import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

import { useAuthStore } from "@/stores/auth-store";

export function AdminRoute({ children }: { children: ReactNode }) {
  const user = useAuthStore((state) => state.user);

  if (user?.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
