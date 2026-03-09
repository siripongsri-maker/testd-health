import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

import { HIVTestPopup } from "@/components/HIVTestPopup";
import { HomeLeaderboard } from "@/components/HomeLeaderboard";
import { CommunityMilestoneCard } from "@/components/CommunityMilestoneCard";
import { AdminRequestsPopup } from "@/components/AdminRequestsPopup";
import { HomeRewards } from "@/components/HomeRewards";
import { HomeActionGrid } from "@/components/home/HomeActionGrid";
import { AnimatedCounter } from "@/components/AnimatedCounter";

import { Users, Eye } from "lucide-react";
import swingLogo from "@/assets/swing-logo.png";
import testdLogo from "@/assets/testd-logo.png";

export default function Home() {
  const { t } = useLanguage();
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [adminPopupOpen, setAdminPopupOpen] = useState(false);
  const [totalVisitors, setTotalVisitors] = useState(0);
  const [totalMembers, setTotalMembers] = useState(0);

  // Clear stale localStorage if no authenticated user
  useEffect(() => {
    if (!loading && !user) {
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('currentUser');
    }
  }, [user, loading]);

  // Load stats once on mount
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data, error } = await supabase.rpc('get_site_stats');
        if (!error && data && data.length > 0) {
          setTotalMembers(Number(data[0].total_members) || 0);
          setTotalVisitors(Number(data[0].total_page_views) || 0);
        }
      } catch (err) {
        console.error('Error fetching stats:', err);
      }
    };
    fetchStats();
  }, []);

  // Check admin status
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
      {/* Fixed background layer */}
      <div className="fixed inset-0 gradient-hero" style={{ zIndex: -1 }} />

      <main className="px-4 sm:px-6 py-3 max-w-5xl mx-auto relative">
        {/* Welcome text */}
        <div className="text-center mb-4">
          <div className="flex justify-center mb-2">
            <img src={testdLogo} alt="testD" className="h-32 w-auto object-contain drop-shadow-[0_4px_24px_rgba(255,100,150,0.4)] animate-scale-in" />
          </div>
          <p className="font-medium text-foreground/80 animate-fade-in text-lg text-center">
            {t('home.welcome')}
          </p>
          <p className="text-muted-foreground">
            {t('home.chooseService')}
          </p>
        </div>

        {/* Bento Grid: Top row equal cards, bottom full-width leaderboard */}
        <div className="space-y-4 mb-4">
          {/* Top row: Rewards + Milestone (equal height) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col [&>*]:flex-1 [&>section]:flex [&>section]:flex-col">
              <HomeRewards />
            </div>
            <div className="flex flex-col [&>*]:flex-1">
              <CommunityMilestoneCard />
            </div>
          </div>

          {/* Bottom row: Full-width leaderboard */}
          <HomeLeaderboard />
        </div>

        {/* Action Grid */}
        <HomeActionGrid />

        {/* Stats: Members and Total Visitors */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {totalMembers > 0 && (
            <div className="flex items-center gap-2 glass-sm rounded-full py-2 px-4">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">{t('home.members')}:</span>
              <AnimatedCounter value={totalMembers} className="font-bold text-primary" />
            </div>
          )}
          {totalVisitors > 0 && (
            <div className="flex items-center gap-2 glass-sm rounded-full py-2 px-4">
              <Eye className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">{t('home.totalVisitors')}:</span>
              <AnimatedCounter value={totalVisitors} className="font-bold text-primary" />
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-6 text-center space-y-3 pb-20">
          <p className="text-sm leading-relaxed text-muted-foreground px-4">
            {t('home.freeConfidential')}
          </p>
          <div className="items-center justify-start flex flex-col gap-0 border-none border-0">
            <span className="text-xs text-muted-foreground/70">
              {t('home.poweredBy')}
            </span>
            <img
              src={swingLogo}
              alt="SWING Thailand"
              className="h-24 object-contain opacity-70 -mt-4"
            />
          </div>
        </footer>
      </main>

      {/* Rainbow bottom bar */}
      <div className="fixed bottom-16 left-0 right-0 h-1 bg-gradient-to-r from-[hsl(0,85%,65%)] via-[hsl(50,95%,55%)] via-[hsl(120,65%,50%)] via-[hsl(200,85%,55%)] to-[hsl(280,70%,60%)] z-30" />

      {/* Popups */}
      <HIVTestPopup />
      <AdminRequestsPopup open={adminPopupOpen} onOpenChange={setAdminPopupOpen} />
    </div>
  );
}
