import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/lib/i18n";

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

import { HIVTestPopup } from "@/components/HIVTestPopup";
import { HomeLeaderboard } from "@/components/HomeLeaderboard";
import { AdminRequestsPopup } from "@/components/AdminRequestsPopup";

import {
  TestTube,
  MessageCircle,
  BookOpen,
  ClipboardList,
  Users,
  Eye,
  Calendar,
  Heart,
} from "lucide-react";
import swingLogo from "@/assets/swing-logo.webp";
import testdLogo from "@/assets/testd-logo.png";


// Simple menu card component
interface MenuCardProps {
  icon: React.ReactNode;
  titleTh: string;
  titleEn: string;
  onClick: () => void;
  variant?: 'default' | 'featured';
}

function MenuCard({ icon, titleTh, titleEn, onClick, variant = 'default' }: MenuCardProps) {
  return (
    <button
      onClick={onClick}
      className={`
        group relative w-full aspect-square rounded-2xl sm:rounded-3xl 
        glass glass-shine
        hover:shadow-soft
        transition-all duration-300 
        hover:scale-[1.02] hover:-translate-y-1
        active:scale-[0.98]
        flex flex-col items-center justify-center gap-1.5 sm:gap-2 p-2 sm:p-3
        ${variant === 'featured' ? 'ring-2 ring-primary/30' : ''}
      `}>

      <div className="h-10 w-10 sm:h-14 md:h-16 sm:w-14 md:w-16 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <div className="text-center space-y-0">
        <p className="text-xs sm:text-sm font-bold text-foreground leading-tight">
          {titleTh}
        </p>
        <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wide">
          {titleEn}
        </p>
      </div>
    </button>);
}



export default function Home() {
  const navigate = useNavigate();
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
        const { count: hivCount } = await supabase.
        from('hiv_selftest_requests').
        select('*', { count: 'exact', head: true }).
        eq('status', 'pending');

        const { count: adminCount } = await supabase.
        from('admin_requests').
        select('*', { count: 'exact', head: true }).
        eq('status', 'pending');

        setPendingRequests((hivCount || 0) + (adminCount || 0));
      }
    };

    checkAdmin();
  }, [user]);

  const menuItems = [
  {
    icon: <TestTube className="h-full w-full" strokeWidth={1.5} />,
    titleKey: "home.selfTest",
    path: "/hiv-selftest"
  },
  {
    icon: <Calendar className="h-full w-full" strokeWidth={1.5} />,
    titleKey: "home.bookAppointment",
    path: "/booking"
  },
  {
    icon: <ClipboardList className="h-full w-full" strokeWidth={1.5} />,
    titleKey: "home.surveys",
    path: "/surveys"
  },
  {
    icon: <BookOpen className="h-full w-full" strokeWidth={1.5} />,
    titleKey: "home.didYouKnow",
    path: "/info"
  },
  {
    icon: <MessageCircle className="h-full w-full" strokeWidth={1.5} />,
    titleKey: "home.onlineCounselor",
    path: "/community"
  },
  {
    icon: <Heart className="h-full w-full" strokeWidth={1.5} />,
    titleKey: "home.selfCare",
    path: "/self-care"
  }];


  return (
    <div className="relative">
      {/* Fixed background layer */}
      <div className="fixed inset-0 gradient-hero" style={{ zIndex: -1 }} />

      <main className="px-4 sm:px-6 py-3 max-w-md mx-auto relative">
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

        {/* Leaderboard Widget */}
        <div className="mb-4">
          <HomeLeaderboard />
        </div>

        {/* Menu Grid */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {menuItems.map((item, index) => {
            const translated = t(item.titleKey);
            // For th/en, use the key-based translation
            // The MenuCard shows both Thai and English labels
            // For CLVM, show translated + English
            const { language } = useLanguage.getState();
            const enText = item.titleKey.startsWith('home.') ? t(item.titleKey) : item.titleKey;
            
            return (
              <MenuCard
                key={index}
                icon={item.icon}
                titleTh={translated}
                titleEn={language === 'th' ? '' : ''}
                onClick={() => {
                  navigate(item.path);
                }}
                variant={index === 0 ? 'featured' : 'default'}
              />
            );
          })}
        </div>

        {/* Stats: Members and Total Visitors */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {totalMembers > 0 &&
          <div className="flex items-center gap-2 glass-sm rounded-full py-2 px-4">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">
                {t('home.members')}:
              </span>
              <span className="font-bold text-primary">{totalMembers.toLocaleString()}</span>
            </div>
          }
          {totalVisitors > 0 &&
          <div className="flex items-center gap-2 glass-sm rounded-full py-2 px-4">
              <Eye className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">
                {t('home.totalVisitors')}:
              </span>
              <span className="font-bold text-primary">{totalVisitors.toLocaleString()}</span>
            </div>
          }
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
              className="h-24 object-contain opacity-70 -mt-4" />
          </div>
        </footer>
      </main>

      {/* Rainbow bottom bar - positioned above bottom nav */}
      <div className="fixed bottom-16 left-0 right-0 h-1 bg-gradient-to-r from-[hsl(0,85%,65%)] via-[hsl(50,95%,55%)] via-[hsl(120,65%,50%)] via-[hsl(200,85%,55%)] to-[hsl(280,70%,60%)] z-30" />

      {/* Popups */}
      <HIVTestPopup />
      <AdminRequestsPopup open={adminPopupOpen} onOpenChange={setAdminPopupOpen} />
    </div>);
}
