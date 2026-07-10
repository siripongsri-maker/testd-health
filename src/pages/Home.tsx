import { useState, useEffect, lazy, Suspense } from "react";
import { useLocation } from "react-router-dom";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { APP_VERSION } from "@/config/appVersion";

import { HeroSection } from "@/components/home/HeroSection";
import { HeroLivingScene } from "@/components/landing/HeroLivingScene";
import { QuickActionStrip } from "@/components/home/QuickActionStrip";
// Homepage self-test result reminder intentionally removed.
// Submission flow lives on /hiv-selftest and related pages only.

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

const HOME_UI_VERSION = "latest-home-v5.0.5";

const SectionSkeleton = ({ h = 120 }: { h?: number }) => (
  <div className="animate-pulse rounded-2xl bg-muted/30" style={{ height: h }} />
);


export default function Home() {
  const { t, language } = useLanguage();
  const { user, loading } = useAuth();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [adminPopupOpen, setAdminPopupOpen] = useState(false);
  const [loadDeferredSections, setLoadDeferredSections] = useState(false);

  useEffect(() => {
    console.info("[testD-home-render]", {
      component: "src/pages/Home.tsx",
      route: location.pathname,
      uiVersion: HOME_UI_VERSION,
      appVersion: APP_VERSION,
    });
  }, [location.pathname]);

  useEffect(() => {
    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(() => setLoadDeferredSections(true), { timeout: 1600 });
      return () => window.cancelIdleCallback?.(idleId);
    }

    const timer = globalThis.setTimeout(() => setLoadDeferredSections(true), 900);
    return () => globalThis.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('currentUser');
    }
  }, [user, loading]);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    const ADMIN_CACHE_KEY = `isAdmin:${user.id}`;
    const PENDING_CACHE_KEY = `pendingReq:${user.id}`;
    const TTL = 5 * 60 * 1000;

    // Hydrate instantly from sessionStorage cache (no waiting on network)
    try {
      const cached = sessionStorage.getItem(ADMIN_CACHE_KEY);
      if (cached) {
        const { v, t } = JSON.parse(cached);
        if (Date.now() - t < TTL) setIsAdmin(!!v);
      }
      const cachedPending = sessionStorage.getItem(PENDING_CACHE_KEY);
      if (cachedPending) {
        const { v, t } = JSON.parse(cachedPending);
        if (Date.now() - t < TTL) setPendingRequests(v);
      }
    } catch {}

    const checkAdmin = async () => {
      const { data: roleData } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin',
      });
      if (cancelled) return;
      const adminFlag = !!roleData;
      setIsAdmin(adminFlag);
      try {
        sessionStorage.setItem(ADMIN_CACHE_KEY, JSON.stringify({ v: adminFlag, t: Date.now() }));
      } catch {}

      if (!adminFlag) return;

      // Run both count queries in parallel
      const [hivRes, adminRes] = await Promise.all([
        supabase
          .from('hiv_selftest_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending'),
        supabase
          .from('admin_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending'),
      ]);
      if (cancelled) return;
      const total = (hivRes.count || 0) + (adminRes.count || 0);
      setPendingRequests(total);
      try {
        sessionStorage.setItem(PENDING_CACHE_KEY, JSON.stringify({ v: total, t: Date.now() }));
      } catch {}
    };

    // Defer to idle so it never blocks first paint / interactions
    const idle = (window as any).requestIdleCallback
      ? (window as any).requestIdleCallback(checkAdmin, { timeout: 2000 })
      : setTimeout(checkAdmin, 300);

    return () => {
      cancelled = true;
      if ((window as any).cancelIdleCallback) (window as any).cancelIdleCallback(idle);
      else clearTimeout(idle);
    };
  }, [user]);

  return (
    <div className="relative">
      <div className="fixed inset-0 gradient-hero" style={{ zIndex: -1 }} />

      <div
        className="fixed left-3 bottom-20 z-[60] rounded-full border border-border bg-card/90 px-2.5 py-1 text-[10px] font-mono text-muted-foreground shadow-sm backdrop-blur-xl"
        data-ui-version={HOME_UI_VERSION}
        aria-label={`UI_VERSION: ${HOME_UI_VERSION}`}
      >
        UI_VERSION: {HOME_UI_VERSION}
      </div>

      <main className="px-5 sm:px-6 py-4 max-w-lg sm:max-w-5xl mx-auto relative">
        {/* Logo */}
        <div className="flex justify-center sm:justify-start mb-4">
          <img
            src={testdLogo}
            alt="testD Sexual Health"
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

        {/* Homepage self-test result reminder removed — submission remains available on /hiv-selftest */}

        <QuickActionStrip />

        {loadDeferredSections ? (
          <Suspense fallback={<SectionSkeleton h={180} />}>
            <FeaturedJourneySection />
          </Suspense>
        ) : <SectionSkeleton h={180} />}

        {/* Community widget moved to bottom of page */}

        <div className="mb-6">
          {loadDeferredSections ? (
            <Suspense fallback={<SectionSkeleton h={120} />}>
              <SmartPriorityCard />
            </Suspense>
          ) : <SectionSkeleton h={120} />}
        </div>

        <div className="mb-6">
          {loadDeferredSections ? (
            <Suspense fallback={<SectionSkeleton h={140} />}>
              <MyPreventionJourneyCard />
            </Suspense>
          ) : <SectionSkeleton h={140} />}
        </div>

        <div className="mb-6">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold px-1 mb-3">
            {language === 'th' ? 'เลือกสิ่งที่ต้องการ' : 'Choose what you need'}
          </p>
          {loadDeferredSections ? (
            <Suspense fallback={<SectionSkeleton h={240} />}>
              <HomeMenuGrid />
            </Suspense>
          ) : <SectionSkeleton h={240} />}
        </div>

        <div className="text-center py-3">
          <p className="text-sm text-muted-foreground">
            {language === 'th'
              ? 'เริ่มจากตรงไหนก็ได้ที่คุณพร้อม'
              : "Start wherever you're ready."}
          </p>
        </div>

        {/* Community widget — moved to bottom */}
        <div className="mb-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold px-1 mb-2">
            {language === 'th' ? 'ชุมชน testD' : 'testD Community'}
          </p>
          {loadDeferredSections ? (
            <Suspense fallback={<SectionSkeleton h={160} />}>
              <PixelStadiumWidget />
            </Suspense>
          ) : <SectionSkeleton h={160} />}
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
      {loadDeferredSections && (
        <Suspense fallback={null}>
          <StickyTestCTA />
        </Suspense>
      )}

      {/* Popups (admin only) */}
      {isAdmin && (
        <Suspense fallback={null}>
          <AdminRequestsPopup open={adminPopupOpen} onOpenChange={setAdminPopupOpen} />
        </Suspense>
      )}

    </div>
  );
}
