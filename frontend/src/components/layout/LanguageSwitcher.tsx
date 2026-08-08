import { Check, Languages } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setAppLanguage } from "@/i18n";
import {
  SUPPORTED_LANGUAGES,
  useLanguageStore,
  type Language,
} from "@/stores/language-store";

const LANGUAGE_LABELS: Record<Language, string> = {
  en: "English",
  ar: "العربية",
};

export function LanguageSwitcher() {
  const { t } = useTranslation();
  const language = useLanguageStore((state) => state.language);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={t("nav.sections.platform")}
          title={t("nav.sections.platform")}
        >
          <Languages className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>{t("common.actions.language")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {SUPPORTED_LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang}
            onClick={() => setAppLanguage(lang)}
            className="justify-between"
          >
            <span dir={lang === "ar" ? "rtl" : "ltr"} className="flex-1">
              {LANGUAGE_LABELS[lang]}
            </span>
            {language === lang && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
