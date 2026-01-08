import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";
import { Home, BookOpen, Trophy, Bell, Pill } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export function BottomNav() {
  const location = useLocation();
  const { t } = useLanguage();

  const navItems = [
    { icon: Home, label: t('nav.home'), path: "/" },
    { icon: Pill, label: "PrEP/PEP", path: "/dashboard" },
    { icon: BookOpen, label: t('nav.learn'), path: "/info" },
    { icon: Trophy, label: t('nav.progress'), path: "/progress" },
    { icon: Bell, label: t('nav.settings'), path: "/settings" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur safe-bottom">
      <div className="mx-auto flex max-w-lg items-center justify-around py-2">
        {navItems.map(({ icon: Icon, label, path }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("h-6 w-6", isActive && "animate-bounce-gentle")} />
              <span className="text-xs font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
