import { cn } from "@/lib/utils";
import { useLocation, useNavigate } from "react-router-dom";
import { Home, BookOpen, Heart, Settings, Trophy, LogOut } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { toast } from "sonner";
import { triggerHaptic } from "@/hooks/useHaptic";
import { PrefetchLink } from "@/components/PrefetchLink";

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('currentUser');
    toast.success(language === 'th' ? 'ออกจากระบบแล้ว' : 'Logged out successfully');
    navigate('/auth');
  };

  const navItems = [
    { icon: Home, label: t('nav.home'), path: "/" },
    { icon: Trophy, label: language === 'th' ? 'ภารกิจ' : 'Quests', path: "/quests" },
    { icon: Heart, label: t('selfCare.title') || 'Self-Care', path: "/self-care" },
    { icon: BookOpen, label: t('nav.learn'), path: "/info" },
    { icon: Settings, label: t('nav.settings'), path: "/settings" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-heavy safe-bottom">
      <div className="mx-auto flex max-w-lg items-center justify-around py-2 sm:py-2 md:py-3">
        {navItems.map(({ icon: Icon, label, path }) => {
          const isActive = location.pathname === path;
          return (
            <PrefetchLink
              key={path}
              to={path}
              onClick={() => triggerHaptic('selection')}
              className={cn(
                "flex flex-col items-center gap-1 px-3 sm:px-4 py-2 sm:py-3 transition-all duration-200 rounded-xl min-w-[60px] sm:min-w-[64px] md:min-w-[72px]",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <div className={cn(
                "flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-xl transition-all duration-200",
                isActive && "bg-primary/10"
              )}>
                <Icon className={cn(
                  "h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 transition-transform duration-200",
                  isActive && "scale-110"
                )} />
              </div>
              <span className={cn(
                "text-[11px] sm:text-xs md:text-sm font-medium transition-all duration-200",
                isActive && "font-semibold"
              )}>{label}</span>
            </PrefetchLink>
          );
        })}
        
        {/* Logout button */}
        {isLoggedIn && (
          <button
            onClick={() => {
              triggerHaptic('medium');
              handleLogout();
            }}
            className="flex flex-col items-center gap-1 px-3 sm:px-4 py-2 sm:py-3 transition-all duration-200 rounded-xl min-w-[60px] sm:min-w-[64px] md:min-w-[72px] text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <div className="flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-xl transition-all duration-200">
              <LogOut className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 transition-transform duration-200" />
            </div>
            <span className="text-[11px] sm:text-xs md:text-sm font-medium transition-all duration-200">
              {language === 'th' ? 'ออก' : 'Logout'}
            </span>
          </button>
        )}
      </div>
    </nav>
  );
}
