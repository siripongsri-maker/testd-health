import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

import { AdminRequestsPopup } from "@/components/AdminRequestsPopup";
import { HomeActionGrid } from "@/components/home/HomeActionGrid";
import { SmartPriorityCard } from "@/components/home/SmartPriorityCard";
import { MyPreventionJourneyCard } from "@/components/home/MyPreventionJourneyCard";
import { HeroSection } from "@/components/home/HeroSection";
import { PrimaryActionCards } from "@/components/home/PrimaryActionCards";
import { StickyTestCTA } from "@/components/home/StickyTestCTA";
import { ExitIntentNudge } from "@/components/ExitIntentNudge";

import swingLogo from "@/assets/swing-logo.png";
import testdLogo from "@/assets/testd-logo.png";

export default function Home() {
  const { t, language } = useLanguage();
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [adminPopupOpen, setAdminPopupOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('currentUser');
    }
  }, [user, loading]);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) return;
      const { data: roleData } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin'
      });
      setIsAdmin(!!roleData);
      if (roleData) {
        const { count: hivCount } = await supabase
          .from('hiv_selftest_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');
        const { count: adminCount } = await supabase
          .from('admin_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');
        setPendingRequests((hivCount || 0) + (adminCount || 0));
      }
    };
    checkAdmin();
  }, [user]);

  return (
    <div className="relative">
      <div className="fixed inset-0 gradient-hero" style={{ zIndex: -1 }} />

      <main className="px-5 sm:px-6 py-4 max-w-lg mx-auto relative">
        {/* Logo */}
        <div className="flex justify-center mb-4">
          <img
            src={testdLogo}
            alt="testD"
            className="h-20 w-auto object-contain drop-shadow-[0_4px_24px_rgba(255,100,150,0.3)] animate-scale-in"
          />
        </div>

        {/* Hero */}
        <HeroSection />

        {/* Action Cards */}
        <PrimaryActionCards />

        {/* Smart Priority (contextual nudge) */}
        <div className="mb-6">
          <SmartPriorityCard />
        </div>

        {/* Prevention Journey (logged-in only) */}
        <div className="mb-6">
          <MyPreventionJourneyCard />
        </div>

        {/* Explore more */}
        <div className="mb-6">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold px-1 mb-2">
            {language === 'th' ? '📚 เพิ่มเติม' : '📚 Explore'}
          </p>
          <HomeActionGrid />
        </div>

        {/* Motivational micro-copy */}
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground italic">
            {language === 'th'
              ? '✨ ดูแลตัวเอง = 1 ก้าวที่สำคัญ'
              : '✨ Taking care of yourself = one important step'}
          </p>
        </div>

        {/* Footer */}
        <footer className="text-center space-y-3 pb-20 pt-2">
          <p className="text-xs text-muted-foreground px-4">
            {t('home.freeConfidential')}
          </p>
          <div className="flex flex-col items-center gap-0">
            <span className="text-[10px] text-muted-foreground/70">
              {t('home.poweredBy')}
            </span>
            <img
              src={swingLogo}
              alt="SWING Thailand"
              className="h-20 object-contain opacity-60 -mt-3"
            />
          </div>
        </footer>
      </main>

      {/* Rainbow bar */}
      <div className="fixed bottom-16 left-0 right-0 h-1 bg-gradient-to-r from-[hsl(0,85%,65%)] via-[hsl(50,95%,55%)] via-[hsl(120,65%,50%)] via-[hsl(200,85%,55%)] to-[hsl(280,70%,60%)] z-30" />

      {/* Sticky CTA */}
      <StickyTestCTA />

      {/* Popups */}
      <AdminRequestsPopup open={adminPopupOpen} onOpenChange={setAdminPopupOpen} />
      <ExitIntentNudge />
    </div>
  );
}
