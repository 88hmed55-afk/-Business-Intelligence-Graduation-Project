import { useLanguageStore } from "@/stores/language-store";

export function useDirection(): "ltr" | "rtl" {
  const language = useLanguageStore((state) => state.language);
  return language === "ar" ? "rtl" : "ltr";
}

export function useIsRTL(): boolean {
  const language = useLanguageStore((state) => state.language);
  return language === "ar";
}
