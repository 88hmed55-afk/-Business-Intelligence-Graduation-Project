import { Suspense, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { motion } from "framer-motion";

import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { Footer } from "@/components/layout/Footer";
import { ErrorBoundary } from "@/components/layout/ErrorBoundary";
import { LoadingState } from "@/components/common/LoadingState";
import { PageTransition } from "@/components/common/PageTransition";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useUiStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const collapsed = useUiStore((state) => state.sidebarCollapsed);
  const location = useLocation();

  return (
    <div className="flex min-h-screen">
      <aside
        className={cn(
          "hidden shrink-0 border-r bg-card/40 transition-[width] duration-300 ease-in-out lg:block",
          collapsed ? "w-16" : "w-64",
        )}
      >
        <div className="sticky top-0 h-screen">
          <Sidebar />
        </div>
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <Sidebar onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setMobileOpen(true)} />
        <main className="app-gradient flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">
            <ErrorBoundary>
              <motion.div
                key={location.pathname}
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: { opacity: 1 },
                }}
              >
                <PageTransition>
                  <Suspense fallback={<LoadingState label="Loading page…" />}>
                    <Outlet />
                  </Suspense>
                </PageTransition>
              </motion.div>
            </ErrorBoundary>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
