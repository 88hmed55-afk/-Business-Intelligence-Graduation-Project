import { create } from "zustand";
import { persist } from "zustand/middleware";

export const SUPPORTED_LANGUAGES = ["en", "ar"] as const;

export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_DIRS: Record<Language, "ltr" | "rtl"> = {
  en: "ltr",
  ar: "rtl",
};

interface LanguageState {
  language: Language;
  setLanguage: (language: Language) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: "en",
      setLanguage: (language) => set({ language }),
    }),
    {
      name: "nova-bi-language",
      partialize: (state) => ({ language: state.language }),
    },
  ),
);

export function applyLanguage(language: Language): void {
  const root = document.documentElement;
  root.lang = language;
  root.dir = LANGUAGE_DIRS[language];
}

export function initLanguage(): void {
  const { language } = useLanguageStore.getState();
  applyLanguage(language);
}
