import { cn } from "@/lib/utils";
import { useLocation, useNavigate } from "react-router-dom";
import { Home, BookOpen, Heart, Settings, Trophy, LogOut } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { toast } from "sonner";
import { triggerHaptic } from "@/hooks/useHaptic";
import { PrefetchLink } from "@/components/PrefetchLink";
import { useState, useCallback, useRef } from "react";

interface Particle {
  id: number;
  x: number;
  y: number;
  type: 'bubble' | 'petal';
  delay: number;
  angle: number;
  size: number;
}

let particleIdCounter = 0;

function NavParticles({ particles }: { particles: Particle[] }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible z-10">
      {particles.map((p) => (
        <span
          key={p.id}
          className={cn(
            "absolute rounded-full animate-nav-particle",
            p.type === 'bubble' ? "bg-primary/40 border border-primary/20" : "nav-petal"
          )}
          style={{
            left: `${p.x}px`,
            top: `${p.y}px`,
            width: p.size,
            height: p.size,
            '--angle': `${p.angle}deg`,
            '--delay': `${p.delay}ms`,
            animationDelay: `${p.delay}ms`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [particles, setParticles] = useState<Particle[]>([]);
  const navRef = useRef<HTMLDivElement>(null);

  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('currentUser');
    toast.success(language === 'th' ? 'ออกจากระบบแล้ว' : 'Logged out successfully');
    navigate('/auth');
  };

  const spawnParticles = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const target = (e.currentTarget as HTMLElement);
    const rect = target.getBoundingClientRect();
    const navRect = navRef.current?.getBoundingClientRect();
    if (!navRect) return;

    const cx = rect.left + rect.width / 2 - navRect.left;
    const cy = rect.top + rect.height / 2 - navRect.top;

    const newParticles: Particle[] = Array.from({ length: 8 }, (_, i) => ({
      id: ++particleIdCounter,
      x: cx,
      y: cy,
      type: i % 3 === 0 ? 'petal' : 'bubble',
      delay: Math.random() * 120,
      angle: (360 / 8) * i + (Math.random() * 30 - 15),
      size: 4 + Math.random() * 8,
    }));

    setParticles(prev => [...prev, ...newParticles]);

    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.includes(p)));
    }, 900);
  }, []);

  const navItems = [
    { icon: Home, label: t('nav.home'), path: "/" },
    { icon: Trophy, label: language === 'th' ? 'ภารกิจ' : 'Quests', path: "/quests" },
    { icon: Heart, label: t('selfCare.title') || 'Self-Care', path: "/self-care" },
    { icon: BookOpen, label: t('nav.learn'), path: "/info" },
    { icon: Settings, label: t('nav.settings'), path: "/settings" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-bottom">
      {/* Frosted glass backdrop */}
      <div className="absolute inset-0 bg-white/50 dark:bg-[hsl(220_15%_10%/0.7)] backdrop-blur-2xl border-t border-white/40 dark:border-white/10" />
      
      {/* Subtle gradient glow on top edge */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <div ref={navRef} className="relative mx-auto flex max-w-lg items-center justify-around py-1.5 sm:py-2 md:py-2.5">
        <NavParticles particles={particles} />
        
        {navItems.map(({ icon: Icon, label, path }) => {
          const isActive = location.pathname === path;
          return (
            <PrefetchLink
              key={path}
              to={path}
              onClick={(e) => {
                triggerHaptic('selection');
                spawnParticles(e);
              }}
              className={cn(
                "relative flex flex-col items-center gap-0.5 px-3 sm:px-4 py-2 transition-all duration-300 rounded-2xl min-w-[56px] sm:min-w-[60px] md:min-w-[68px] group",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-primary/80"
              )}
            >
              {/* Active indicator pill */}
              <div className={cn(
                "absolute -top-1 left-1/2 -translate-x-1/2 h-[3px] rounded-full bg-primary transition-all duration-300",
                isActive ? "w-6 opacity-100" : "w-0 opacity-0"
              )} />

              {/* Hover glow ring */}
              <div className={cn(
                "absolute inset-1 rounded-2xl transition-all duration-300 opacity-0 group-hover:opacity-100",
                "bg-primary/5 dark:bg-primary/10"
              )} />

              {/* Icon container with active bubble */}
              <div className={cn(
                "relative flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-2xl transition-all duration-300",
                isActive && "bg-primary/12 dark:bg-primary/20 scale-110 shadow-[0_0_16px_-4px_hsl(var(--primary)/0.3)]"
              )}>
                <Icon className={cn(
                  "h-5 w-5 sm:h-[22px] sm:w-[22px] transition-all duration-300",
                  isActive && "drop-shadow-[0_0_6px_hsl(var(--primary)/0.4)]"
                )} />
                
                {/* Floating micro-dot indicator */}
                {isActive && (
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary animate-pulse" />
                )}
              </div>

              <span className={cn(
                "text-[10px] sm:text-[11px] font-medium transition-all duration-300 leading-tight",
                isActive ? "font-semibold opacity-100" : "opacity-70 group-hover:opacity-100"
              )}>{label}</span>
            </PrefetchLink>
          );
        })}
        
        {/* Logout button */}
        {isLoggedIn && (
          <button
            onClick={(e) => {
              triggerHaptic('medium');
              spawnParticles(e);
              handleLogout();
            }}
            className="relative flex flex-col items-center gap-0.5 px-3 sm:px-4 py-2 transition-all duration-300 rounded-2xl min-w-[56px] sm:min-w-[60px] md:min-w-[68px] group text-muted-foreground hover:text-destructive"
          >
            <div className="absolute inset-1 rounded-2xl transition-all duration-300 opacity-0 group-hover:opacity-100 bg-destructive/5" />
            <div className="relative flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-2xl transition-all duration-300">
              <LogOut className="h-5 w-5 sm:h-[22px] sm:w-[22px] transition-all duration-300" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-medium transition-all duration-300 leading-tight opacity-70 group-hover:opacity-100">
              {language === 'th' ? 'ออก' : 'Logout'}
            </span>
          </button>
        )}
      </div>
    </nav>
  );
}
