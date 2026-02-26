import { Button } from "@/components/ui/button";
import { useLanguage, SUPPORTED_LANGUAGES, prefetchTranslations, type Language } from "@/lib/i18n";
import { Languages, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  const handleSelect = (lang: Language) => {
    setLanguage(lang);
    prefetchTranslations(lang);
  };

  const current = SUPPORTED_LANGUAGES.find(l => l.code === language);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground hover:text-foreground h-8 px-2"
        >
          <Languages className="h-4 w-4" />
          <span className="text-xs font-medium">{current?.nativeLabel || 'ไทย'}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        {SUPPORTED_LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleSelect(lang.code)}
            className="flex items-center justify-between gap-2 cursor-pointer"
          >
            <span className="text-sm">{lang.nativeLabel}</span>
            {language === lang.code && (
              <Check className="h-3.5 w-3.5 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
