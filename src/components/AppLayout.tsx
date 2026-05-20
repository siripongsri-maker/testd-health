import { lazy, Suspense, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Button } from "@/components/ui/button";
import testdLogo from "@/assets/testd-logo.png";
import { User, LogIn, MapPin } from "lucide-react";

const NotificationBell = lazy(() => import("@/components/NotificationBell").then(m => ({ default: m.NotificationBell })));
const BottomNav = lazy(() => import("@/components/BottomNav").then(m => ({ default: m.BottomNav })));
const GlobalPresence = lazy(() => import("@/components/GlobalPresence").then(m => ({ default: m.GlobalPresence })));

interface AppLayoutProps {
  children: React.ReactNode;
  hideNav?: boolean;
}

export function AppLayout({ children, hideNav }: AppLayoutProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showDeferredChrome, setShowDeferredChrome] = useState(false);

  useEffect(() => {
    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(() => setShowDeferredChrome(true), { timeout: 2000 });
      return () => window.cancelIdleCallback?.(idleId);
    }

    const timer = globalThis.setTimeout(() => setShowDeferredChrome(true), 1200);
    return () => globalThis.clearTimeout(timer);
  }, []);

  // Admin pages use AdminLayout — don't wrap them
  const isAdminPage = location.pathname.startsWith("/admin");
  // Public invite landing/session pages are standalone — no app chrome
  const isInviteLanding = /^\/invite\/(?:session\/)?[^/]+$/.test(location.pathname) && location.pathname !== "/invite";

  if (hideNav || isAdminPage || isInviteLanding) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen pb-16">
      {/* Top bar */}
      <header className="sticky top-0 z-30 h-12 flex items-center justify-between px-3 bg-background/60 backdrop-blur-xl border-b border-border/20 safe-top">
        <div className="flex items-center gap-2">
          <img src={testdLogo} alt="testD" className="h-7 w-auto cursor-pointer" onClick={() => navigate("/")} />
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full h-8 w-8 text-muted-foreground hover:text-primary"
            onClick={() => navigate("/virtual")}
            aria-label="Virtual Mode"
          >
            <MapPin className="h-4 w-4" />
          </Button>
          {user && showDeferredChrome && (
            <Suspense fallback={null}>
              <NotificationBell />
            </Suspense>
          )}
          <LanguageToggle />
          {user ? (
            <Button variant="ghost" size="icon" className="rounded-full h-8 w-8" onClick={() => navigate("/settings")}>
              <User className="h-4 w-4" />
            </Button>
          ) : (
            <Button variant="ghost" size="sm" className="rounded-full text-xs px-2 h-8" onClick={() => navigate("/auth")}>
              <LogIn className="h-3.5 w-3.5 mr-1" />
              {language === "th" ? "เข้า" : "Login"}
            </Button>
          )}
        </div>
      </header>

      <main className="relative">
        {children}
      </main>

      {showDeferredChrome && (
        <Suspense fallback={null}>
          <GlobalPresence />
          <BottomNav />
        </Suspense>
      )}
    </div>
  );
}
