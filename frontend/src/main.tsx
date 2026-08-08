import React from "react";
import ReactDOM from "react-dom/client";

import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/use-toast";
import { queryClient } from "@/lib/query-client";
import { setupSyncChannel } from "@/lib/sync";
import { initTheme } from "@/stores/theme-store";
import { initLanguage } from "@/stores/language-store";

import "@/i18n";
import "@/index.css";

import App from "@/App";

initTheme();
initLanguage();
setupSyncChannel();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={200}>
        <App />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
