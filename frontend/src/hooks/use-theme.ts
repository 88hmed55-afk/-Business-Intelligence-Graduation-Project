import { useEffect } from "react";

import { useThemeStore, applyTheme, initTheme } from "@/stores/theme-store";

export function useTheme() {
  const mode = useThemeStore((state) => state.mode);
  const setMode = useThemeStore((state) => state.setMode);

  useEffect(() => {
    initTheme();
  }, []);

  useEffect(() => {
    applyTheme(mode);
  }, [mode]);

  useEffect(() => {
    if (mode !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, [mode]);

  return { mode, setMode };
}
