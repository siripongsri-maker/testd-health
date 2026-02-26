import { cn } from "@/lib/utils";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Home, TestTube, Calendar, BookOpen, Heart, MessageCircle,
  Trophy, ClipboardList, CalendarDays,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";

interface NavItem {
  icon: React.ElementType;
  labelKey: string;
  path: string;
}

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();

  const mainItems: NavItem[] = [
    { icon: Home, labelKey: "nav.home", path: "/" },
    { icon: TestTube, labelKey: "nav.test", path: "/hiv-selftest" },
    { icon: ClipboardList, labelKey: "nav.bookings", path: user ? "/my-appointments" : "/guest-appointments" },
    { icon: BookOpen, labelKey: "nav.learn", path: "/info" },
    { icon: Heart, labelKey: "nav.care", path: "/self-care" },
  ];

  // Hide bottom nav on admin pages
  if (location.pathname.startsWith("/admin")) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border/40 safe-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {mainItems.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.path || 
            (item.path === '/my-appointments' && location.pathname === '/guest-appointments') ||
            (item.path === '/guest-appointments' && location.pathname === '/my-appointments');
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 rounded-2xl transition-all duration-200",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className={cn(
                "flex items-center justify-center w-10 h-7 rounded-full transition-all duration-200",
                active && "bg-primary/12"
              )}>
                <Icon className={cn("h-[20px] w-[20px]", active && "stroke-[2.5]")} />
              </div>
              <span className={cn(
                "text-[10px] leading-tight",
                active ? "font-semibold" : "font-medium"
              )}>
                {t(item.labelKey)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
