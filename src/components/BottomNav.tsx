import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";
import { Home, BookOpen, Heart, Settings, Sparkles } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export function BottomNav() {
  const location = useLocation();
  const { t } = useLanguage();

  const navItems = [
    { icon: Home, label: t('nav.home'), path: "/" },
    { icon: Sparkles, label: "PrEP/PEP", path: "/dashboard" },
    { icon: Heart, label: t('selfCare.title') || 'Self-Care', path: "/self-care" },
    { icon: BookOpen, label: t('nav.learn'), path: "/info" },
    { icon: Settings, label: t('nav.settings'), path: "/settings" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-t border-border/50 safe-bottom">
      <div className="mx-auto flex max-w-lg items-center justify-around py-1">
        {navItems.map(({ icon: Icon, label, path }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                "flex flex-col items-center gap-0.5 px-4 py-2 transition-all duration-200 rounded-xl min-w-[64px]",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <div className={cn(
                "flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200",
                isActive && "bg-primary/10"
              )}>
                <Icon className={cn(
                  "h-5 w-5 transition-transform duration-200",
                  isActive && "scale-110"
                )} />
              </div>
              <span className={cn(
                "text-[10px] font-medium transition-all duration-200",
                isActive && "font-semibold"
              )}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
