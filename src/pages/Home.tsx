import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

import { AdminRequestsPopup } from "@/components/AdminRequestsPopup";
import { HomeActionGrid } from "@/components/home/HomeActionGrid";
import { SmartPriorityCard } from "@/components/home/SmartPriorityCard";
import { MyPreventionJourneyCard } from "@/components/home/MyPreventionJourneyCard";
import { HeroSection } from "@/components/home/HeroSection";
import { QuickActionStrip } from "@/components/home/QuickActionStrip";
import { FeaturedJourneySection } from "@/components/home/FeaturedJourneySection";
import { StickyTestCTA } from "@/components/home/StickyTestCTA";
import { PixelStadiumWidget } from "@/components/home/PixelStadiumWidget";
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
        <div className="flex justify-center mb-3">
          <img
            src={testdLogo}
            alt="testD"
            className="h-16 w-auto object-contain drop-shadow-[0_4px_24px_rgba(255,100,150,0.3)] animate-scale-in"
          />
        </div>

        <HeroSection />

        <QuickActionStrip />

        <FeaturedJourneySection />

        <div className="mb-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold px-1 mb-2">
            {language === 'th' ? 'ชุมชน testD' : 'testD Community'}
          </p>
          <PixelStadiumWidget />
        </div>

        <div className="mb-6">
          <SmartPriorityCard />
        </div>

        <div className="mb-6">
          <MyPreventionJourneyCard />
        </div>

        <div className="mb-6">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold px-1 mb-2">
            {language === 'th' ? 'บริการอื่น ๆ' : 'More services'}
          </p>
          <HomeActionGrid />
        </div>

        <div className="text-center py-3">
          <p className="text-sm text-muted-foreground">
            {language === 'th'
              ? 'เริ่มจากตรงไหนก็ได้ที่คุณพร้อม'
              : "Start wherever you're ready."}
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
