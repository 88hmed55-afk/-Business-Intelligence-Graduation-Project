import { Suspense } from "react";
import type { ReactNode } from "react";

import { LoadingState } from "@/components/common/LoadingState";
import { Logo } from "@/components/layout/Logo";

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-indigo-400/20 blur-3xl" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-sky-400/10 blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="glass-panel rounded-2xl p-8">
          <Suspense fallback={<LoadingState label="Loading…" />}>{children}</Suspense>
        </div>
      </div>
    </div>
  );
}
