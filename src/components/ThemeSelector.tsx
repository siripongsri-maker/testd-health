import { useTheme, themeConfig, ThemeType } from "@/lib/theme";
import { useLanguage } from "@/lib/i18n";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const { language } = useLanguage();

  const themes: ThemeType[] = ['casual', 'pride', 'lesbian', 'youth'];

  return (
    <div className="grid grid-cols-2 gap-3">
      {themes.map((t) => {
        const config = themeConfig[t];
        const isActive = theme === t;
        
        return (
          <button
            key={t}
            onClick={() => setTheme(t)}
            className={cn(
              "relative flex flex-col items-center gap-2 rounded-xl p-4 border-2 transition-all",
              isActive 
                ? "border-primary ring-2 ring-primary/20" 
                : "border-border hover:border-primary/50"
            )}
          >
            {/* Preview */}
            <div 
              className="w-full h-12 rounded-lg overflow-hidden relative"
              style={{ background: config.gradientHero }}
            >
              <div 
                className="absolute inset-0 opacity-50"
                style={{ backgroundImage: config.pattern }}
              />
              <div 
                className="absolute bottom-1 left-1 right-1 h-4 rounded"
                style={{ background: config.gradientPrimary }}
              />
            </div>
            
            {/* Name */}
            <span className="text-sm font-medium">
              {language === 'th' ? config.nameTh : config.name}
            </span>
            
            {/* Active indicator */}
            {isActive && (
              <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                <Check className="h-3 w-3 text-primary-foreground" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
