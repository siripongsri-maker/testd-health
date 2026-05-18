import { useState, useEffect, lazy, Suspense } from "react";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

import { HeroSection } from "@/components/home/HeroSection";
import { HeroLivingScene } from "@/components/landing/HeroLivingScene";
import { QuickActionStrip } from "@/components/home/QuickActionStrip";

// Below-the-fold: lazy-load to shrink initial bundle and speed up FCP/LCP
const FeaturedJourneySection = lazy(() => import("@/components/home/FeaturedJourneySection").then(m => ({ default: m.FeaturedJourneySection })));
const PixelStadiumWidget = lazy(() => import("@/components/home/PixelStadiumWidget").then(m => ({ default: m.PixelStadiumWidget })));
const SmartPriorityCard = lazy(() => import("@/components/home/SmartPriorityCard").then(m => ({ default: m.SmartPriorityCard })));
const MyPreventionJourneyCard = lazy(() => import("@/components/home/MyPreventionJourneyCard").then(m => ({ default: m.MyPreventionJourneyCard })));
const HomeMenuGrid = lazy(() => import("@/components/home/HomeMenuGrid").then(m => ({ default: m.HomeMenuGrid })));
const StickyTestCTA = lazy(() => import("@/components/home/StickyTestCTA").then(m => ({ default: m.StickyTestCTA })));
const AdminRequestsPopup = lazy(() => import("@/components/AdminRequestsPopup").then(m => ({ default: m.AdminRequestsPopup })));

import swingLogo from "@/assets/swing-logo.png";
import testdLogo from "@/assets/testd-logo.png";

const SectionSkeleton = ({ h = 120 }: { h?: number }) => (
  <div className="animate-pulse rounded-2xl bg-muted/30" style={{ height: h }} />
);


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

      <main className="px-5 sm:px-6 py-4 max-w-lg sm:max-w-5xl mx-auto relative">
        {/* Logo */}
        <div className="flex justify-center sm:justify-start mb-4">
          <img
            src={testdLogo}
            alt="testD"
            className="h-14 sm:h-16 w-auto object-contain drop-shadow-[0_4px_24px_rgba(255,100,150,0.3)] animate-scale-in"
          />
        </div>

        {/* Hero — split layout on desktop, stacked on mobile */}
        <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-10 sm:items-center">
          <div className="order-2 sm:order-1">
            <HeroSection />
          </div>
          <div className="order-1 sm:order-2 -mx-1 sm:mx-0">
            <HeroLivingScene />
          </div>
        </div>

        <QuickActionStrip />

        <Suspense fallback={<SectionSkeleton h={180} />}>
          <FeaturedJourneySection />
        </Suspense>

        <div className="mb-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold px-1 mb-2">
            {language === 'th' ? 'ชุมชน testD' : 'testD Community'}
          </p>
          <Suspense fallback={<SectionSkeleton h={160} />}>
            <PixelStadiumWidget />
          </Suspense>
        </div>

        <div className="mb-6">
          <Suspense fallback={<SectionSkeleton h={120} />}>
            <SmartPriorityCard />
          </Suspense>
        </div>

        <div className="mb-6">
          <Suspense fallback={<SectionSkeleton h={140} />}>
            <MyPreventionJourneyCard />
          </Suspense>
        </div>

        <div className="mb-6">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold px-1 mb-3">
            {language === 'th' ? 'เลือกสิ่งที่ต้องการ' : 'Choose what you need'}
          </p>
          <Suspense fallback={<SectionSkeleton h={240} />}>
            <HomeMenuGrid />
          </Suspense>
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
              loading="lazy"
            />
          </div>
        </footer>
      </main>

      {/* Rainbow bar */}
      <div className="fixed bottom-16 left-0 right-0 h-1 bg-gradient-to-r from-[hsl(0,85%,65%)] via-[hsl(50,95%,55%)] via-[hsl(120,65%,50%)] via-[hsl(200,85%,55%)] to-[hsl(280,70%,60%)] z-30" />

      {/* Sticky CTA */}
      <Suspense fallback={null}>
        <StickyTestCTA />
      </Suspense>

      {/* Popups (admin only) */}
      {isAdmin && (
        <Suspense fallback={null}>
          <AdminRequestsPopup open={adminPopupOpen} onOpenChange={setAdminPopupOpen} />
        </Suspense>
      )}

    </div>
  );
}
