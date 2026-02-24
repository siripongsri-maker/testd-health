import { cn } from "@/lib/utils";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Home, TestTube, Calendar, BookOpen, Heart, MessageCircle,
  Trophy, ClipboardList, CalendarDays,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";

interface NavItem {
  icon: React.ElementType;
  labelTh: string;
  labelEn: string;
  path: string;
}

const mainItems: NavItem[] = [
  { icon: Home, labelTh: "หน้าแรก", labelEn: "Home", path: "/" },
  { icon: TestTube, labelTh: "ตรวจ", labelEn: "Test", path: "/hiv-selftest" },
  { icon: Calendar, labelTh: "จอง", labelEn: "Book", path: "/booking" },
  { icon: BookOpen, labelTh: "ข้อมูล", labelEn: "Learn", path: "/info" },
  { icon: Heart, labelTh: "ดูแล", labelEn: "Care", path: "/self-care" },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { language } = useLanguage();

  // Hide bottom nav on admin pages
  if (location.pathname.startsWith("/admin")) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-xl border-t border-border/30 safe-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {mainItems.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.path;
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
                {language === "th" ? item.labelTh : item.labelEn}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
