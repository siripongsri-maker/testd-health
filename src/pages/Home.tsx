import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/lib/i18n";
import { getUserData, getTodayKey, recordCheckIn, getStreakMultiplier } from "@/lib/store";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Button } from "@/components/ui/button";
import { HIVTestPopup } from "@/components/HIVTestPopup";
import { AdminRequestsPopup } from "@/components/AdminRequestsPopup";
import { RankingBoard } from "@/components/RankingBoard";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { OnboardingTour } from "@/components/OnboardingTour";
import { RecommendedNextSteps } from "@/components/RecommendedNextSteps";
import { NotificationBell } from "@/components/NotificationBell";
import { MedicationWidget } from "@/components/MedicationWidget";
import {
  TestTube,
  MessageCircle,
  Heart,
  BookOpen,
  Settings,
  ShieldCheck,
  ClipboardList,
  Users,
  Eye,
  Calendar,
  Pill,
  Check,
  X,
  User,
  LogOut,
  LogIn,
  Sparkles,
  Trophy,
} from "lucide-react";
import swingLogo from "@/assets/swing-logo.webp";
import { toast } from "sonner";

// Cute menu card component with XP display
interface MenuCardProps {
  icon: React.ReactNode;
  titleTh: string;
  titleEn: string;
  onClick: () => void;
  variant?: 'default' | 'featured';
  xpReward?: number;
  streakMultiplier?: { multiplier: number; label: string };
}

function MenuCard({ icon, titleTh, titleEn, onClick, variant = 'default', xpReward, streakMultiplier }: MenuCardProps) {
  const hasBonus = streakMultiplier && streakMultiplier.multiplier > 1;
  const totalXP = xpReward && hasBonus ? Math.floor(xpReward * streakMultiplier.multiplier) : xpReward;
  
  return (
    <button
      onClick={onClick}
      className={`
        group relative w-full aspect-square rounded-2xl sm:rounded-3xl 
        bg-card border-2 border-primary/20
        shadow-card hover:shadow-soft
        transition-all duration-300 
        hover:scale-[1.02] hover:-translate-y-1
        active:scale-[0.98]
        flex flex-col items-center justify-center gap-1.5 sm:gap-2 p-2 sm:p-3
        ${variant === 'featured' ? 'ring-2 ring-primary/30' : ''}
      `}
    >
      {/* XP Badge */}
      {xpReward && (
        <div className={`absolute top-1.5 right-1.5 sm:top-2 sm:right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold ${
          hasBonus 
            ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/30' 
            : 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400'
        }`}>
          <Sparkles className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
          <span>{totalXP}</span>
          {hasBonus && <span className="text-[8px] sm:text-[9px] opacity-90">{streakMultiplier.label}</span>}
        </div>
      )}
      
      {/* Icon container */}
      <div className="h-10 w-10 sm:h-14 md:h-16 sm:w-14 md:w-16 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      
      {/* Labels */}
      <div className="text-center space-y-0">
        <p className="text-xs sm:text-sm font-bold text-foreground leading-tight">
          {titleTh}
        </p>
        <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wide">
          {titleEn}
        </p>
      </div>
    </button>
  );
}

// Swing logo decoration with floating animation
function SwingDecoration({ className, delay = 0 }: { className?: string; delay?: number }) {
  return (
    <div 
      className={`${className} select-none pointer-events-none animate-float`}
      style={{ animationDelay: `${delay}s` }}
    >
      <img 
        src={swingLogo} 
        alt="SWING" 
        className="h-10 w-auto object-contain opacity-30 blur-[0.5px]"
      />
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user } = useAuth();
  const [userData, setLocalUserData] = useState(getUserData());
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [adminPopupOpen, setAdminPopupOpen] = useState(false);
  const [totalVisitors, setTotalVisitors] = useState(0);
  const [totalMembers, setTotalMembers] = useState(0);
  const [todayStatus, setTodayStatus] = useState<"pending" | "taken" | "skipped">("pending");

  // Load real stats from database with real-time updates
  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Use RPC function to get stats (bypasses RLS for accurate counts)
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

    // Set up real-time subscription for profiles (new members)
    const profilesChannel = supabase
      .channel('home-profiles-stats')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'profiles' },
        () => {
          setTotalMembers(prev => prev + 1);
        }
      )
      .subscribe();

    // Set up real-time subscription for analytics (new page views)
    const analyticsChannel = supabase
      .channel('home-analytics-stats')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'analytics_events' },
        () => {
          // Increment total views count
          setTotalVisitors(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(analyticsChannel);
    };
  }, []);

  useEffect(() => {
    const data = getUserData();
    setLocalUserData(data);
    
    const today = getTodayKey();
    if (data.checkIns[today]) {
      setTodayStatus(data.checkIns[today]);
    }
  }, []);

  // Check admin status
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) return;
      
      const { data: roleData } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin',
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

  const handleTaken = () => {
    const today = getTodayKey();
    recordCheckIn(today, "taken");
    setTodayStatus("taken");
    
    const data = getUserData();
    setLocalUserData(data);
    
    toast.success(language === 'th' ? 'ดีมาก! ทำได้ดีมากวันนี้' : 'Great job today!', {
      description: `${language === 'th' ? 'Streak' : 'Streak'}: ${data.streak} 🔥`,
    });
  };

  const handleSkipped = () => {
    const today = getTodayKey();
    recordCheckIn(today, "skipped");
    setTodayStatus("skipped");
    
    const data = getUserData();
    setLocalUserData(data);
  };

  // Get streak multiplier for display
  const streakMultiplier = getStreakMultiplier(userData.streak);

  const menuItems = [
    {
      icon: <TestTube className="h-full w-full" strokeWidth={1.5} />,
      titleTh: "ขอชุดตรวจ",
      titleEn: "SELF TEST",
      path: "/hiv-selftest",
      xpReward: 50,
    },
    {
      icon: <Calendar className="h-full w-full" strokeWidth={1.5} />,
      titleTh: "จองตรวจ",
      titleEn: "BOOK APPOINTMENT",
      path: "https://zerva.app/swing_x_hornet_th",
      external: true,
      xpReward: 30,
    },
    {
      icon: <ClipboardList className="h-full w-full" strokeWidth={1.5} />,
      titleTh: "แบบประเมิน",
      titleEn: "SURVEYS",
      path: "/surveys",
      xpReward: 20,
    },
    {
      icon: <Users className="h-full w-full" strokeWidth={1.5} />,
      titleTh: "ดูแลตัวเอง",
      titleEn: "SELF CARE",
      path: "/self-care",
      xpReward: 15,
    },
    {
      icon: <BookOpen className="h-full w-full" strokeWidth={1.5} />,
      titleTh: "เรื่องน่ารู้",
      titleEn: "DID YOU KNOW?",
      path: "/info",
      xpReward: 10,
    },
    {
      icon: <MessageCircle className="h-full w-full" strokeWidth={1.5} />,
      titleTh: "ขอคำปรึกษา",
      titleEn: "ONLINE COUNSELOR",
      path: "/community",
      xpReward: 25,
    },
  ];

  return (
    <div className="relative">
      {/* Fixed background layer - doesn't affect layout height */}
      <div className="fixed inset-0 bg-gradient-to-b from-primary/30 to-primary/20 -z-10" />
      
      {/* Swing logo decorations - fixed position, subtle floating */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-5">
        <SwingDecoration className="absolute bottom-20 left-2 rotate-[-10deg]" delay={0} />
        <SwingDecoration className="absolute bottom-32 right-4 rotate-[8deg]" delay={1.5} />
        <SwingDecoration className="absolute top-28 left-4 rotate-[-5deg] scale-75" delay={0.8} />
        <SwingDecoration className="absolute top-48 right-2 rotate-[12deg] scale-75" delay={2} />
        <SwingDecoration className="absolute top-16 right-1/4 rotate-[-3deg] scale-50" delay={0.5} />
        <SwingDecoration className="absolute top-72 left-1/3 rotate-[6deg] scale-60" delay={2.5} />
        <SwingDecoration className="absolute bottom-48 right-1/3 rotate-[-8deg] scale-50" delay={1} />
        <SwingDecoration className="absolute top-1/3 left-0 rotate-[15deg] scale-60" delay={3} />
        <SwingDecoration className="absolute top-1/2 right-0 rotate-[-12deg] scale-55" delay={1.8} />
        <SwingDecoration className="absolute bottom-64 left-1/4 rotate-[4deg] scale-45" delay={2.2} />
        <SwingDecoration className="absolute top-96 right-8 rotate-[-6deg] scale-65" delay={0.3} />
        <SwingDecoration className="absolute bottom-40 left-8 rotate-[10deg] scale-55" delay={2.8} />
      </div>
      
      {/* Header */}
      <header className="sticky top-0 z-20 bg-gradient-to-b from-primary/30 to-transparent safe-top">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            {/* SWING Logo - shown first */}
            <img 
              src={swingLogo} 
              alt="SWING Thailand" 
              className="h-10 w-auto object-contain shrink-0"
            />
            
            {/* Login/Account button - top left */}
            {localStorage.getItem('isLoggedIn') === 'true' ? (
              <div className="flex items-center gap-2 bg-card/80 backdrop-blur-sm rounded-full px-3 py-1.5">
                <User className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">
                  {localStorage.getItem('currentUser') || 'User'}
                </span>
                {localStorage.getItem('currentUser') === 'admin2024' && (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-gradient-to-r from-violet-500 to-purple-500 text-white">
                    ADMIN
                  </span>
                )}
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30">
                  <Sparkles className="h-3 w-3 text-amber-500" />
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                    {userData.xp || 0} XP
                  </span>
                </div>
                <button
                  onClick={() => {
                    localStorage.removeItem('isLoggedIn');
                    localStorage.removeItem('currentUser');
                    toast.success(language === 'th' ? 'ออกจากระบบแล้ว' : 'Logged out successfully');
                    navigate('/auth');
                  }}
                  className="ml-1 p-1 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  title={language === 'th' ? 'ออกจากระบบ' : 'Log out'}
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="bg-card/80 backdrop-blur-sm rounded-full px-4"
                onClick={() => navigate('/auth')}
              >
                <LogIn className="h-4 w-4 mr-2" />
                {language === 'th' ? 'เข้าสู่ระบบ' : 'Log in'}
              </Button>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            <div className="bg-card/80 backdrop-blur-sm rounded-full">
              <NotificationBell />
            </div>
            {isAdmin && (
              <Button
                variant="ghost"
                size="icon"
                className="relative bg-card/80 backdrop-blur-sm rounded-full"
                onClick={() => setAdminPopupOpen(true)}
              >
                <ShieldCheck className="h-5 w-5" />
                {pendingRequests > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center font-bold">
                    {pendingRequests > 9 ? '9+' : pendingRequests}
                  </span>
                )}
              </Button>
            )}
            <div className="bg-card/80 backdrop-blur-sm rounded-full">
              <LanguageToggle />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="bg-card/80 backdrop-blur-sm rounded-full"
              onClick={() => navigate("/settings")}
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 py-3 max-w-md mx-auto relative z-10">
        {/* Welcome text */}
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold text-foreground">
            testD คนเทสต์ดีอยู่นี่จ้า
          </h1>
          <p className="text-muted-foreground mt-1">
            {language === 'th' 
              ? 'เลือกบริการที่ต้องการ' 
              : 'Choose a service'}
          </p>
        </div>

        {/* Streak Bonus Banner */}
        {streakMultiplier.multiplier > 1 && (
          <div className="mb-4 rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 p-3 shadow-lg shadow-orange-500/20 animate-fade-in">
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                  <span className="text-lg">🔥</span>
                </div>
                <div>
                  <p className="font-bold text-sm">
                    {language === 'th' 
                      ? `โบนัส Streak ${streakMultiplier.label}!` 
                      : `${streakMultiplier.label} Streak Bonus!`}
                  </p>
                  <p className="text-xs opacity-90">
                    {language === 'th'
                      ? `ต่อเนื่อง ${userData.streak} วัน - XP เพิ่มขึ้น!`
                      : `${userData.streak} day streak - Extra XP!`}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{streakMultiplier.label}</p>
                <p className="text-[10px] opacity-80">{language === 'th' ? 'โบนัส' : 'BONUS'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Medication Widget - Circular progress with reminder */}
        <div className="mb-4">
          <MedicationWidget onStatusChange={() => setLocalUserData(getUserData())} />
        </div>

        {/* Menu Grid - 3 columns, 2 rows */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {menuItems.map((item, index) => (
            <MenuCard
              key={index}
              icon={item.icon}
              titleTh={item.titleTh}
              titleEn={item.titleEn}
              xpReward={item.xpReward}
              streakMultiplier={streakMultiplier}
              onClick={() => {
                if ((item as any).external) {
                  window.open(item.path, '_blank', 'noopener,noreferrer');
                } else {
                  navigate(item.path);
                }
              }}
              variant={index === 0 ? 'featured' : 'default'}
            />
          ))}
        </div>

        {/* Recommended Next Steps */}
        <div className="mt-4">
          <RecommendedNextSteps maxItems={3} variant="compact" />
        </div>

        {/* Ranking Board */}
        <div 
          className="mt-4 cursor-pointer hover:opacity-90 transition-opacity" 
          onClick={() => navigate("/leaderboard")}
        >
          <RankingBoard compact />
        </div>

        {/* Quick links */}
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-500/50 backdrop-blur-sm rounded-full hover:from-amber-500/30 hover:to-orange-500/30"
            onClick={() => navigate("/quests")}
          >
            <Trophy className="h-4 w-4 mr-2 text-amber-500" />
            <span className="text-amber-700 dark:text-amber-400 font-medium">
              {language === 'th' ? 'ภารกิจ' : 'Quests'}
            </span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="bg-card/80 backdrop-blur-sm rounded-full"
            onClick={() => navigate("/personal-info")}
          >
            <User className="h-4 w-4 mr-2" />
            {language === 'th' ? 'ข้อมูลส่วนตัว' : 'Personal Info'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="bg-card/80 backdrop-blur-sm rounded-full"
            onClick={() => navigate("/self-care")}
          >
            <Heart className="h-4 w-4 mr-2" />
            {language === 'th' ? 'ดูแลตัวเอง' : 'Self Care'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="bg-card/80 backdrop-blur-sm rounded-full"
            onClick={() => navigate("/medication-tracker")}
          >
            <Pill className="h-4 w-4 mr-2" />
            {language === 'th' ? 'PrEP / PEP' : 'PrEP / PEP'}
          </Button>
        </div>

        {/* Stats: Members and Total Visitors - Real-time */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {totalMembers > 0 && (
            <div className="flex items-center gap-2 bg-card/60 backdrop-blur-sm rounded-full py-2 px-4 animate-fade-in">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">
                {language === 'th' ? 'สมาชิก' : 'Members'}:
              </span>
              <AnimatedCounter value={totalMembers} className="font-bold text-primary" duration={1800} />
            </div>
          )}
          {totalVisitors > 0 && (
            <div className="flex items-center gap-2 bg-card/60 backdrop-blur-sm rounded-full py-2 px-4 animate-fade-in">
              <Eye className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">
                {language === 'th' ? 'ผู้เข้าชมทั้งหมด' : 'Total Visitors'}:
              </span>
              <AnimatedCounter value={totalVisitors} className="font-bold text-primary" duration={2000} />
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-4 text-center space-y-1.5 pb-[max(12px,env(safe-area-inset-bottom))]">
          <p className="text-xs text-muted-foreground">
            {language === 'th' 
              ? 'บริการนี้ไม่มีค่าใช้จ่าย • ข้อมูลของคุณเป็นความลับ' 
              : 'This service is free • Your information is confidential'}
          </p>
          <div className="flex items-center justify-center gap-2">
            <span className="text-xs text-muted-foreground">
              {language === 'th' ? 'สนับสนุนโดย' : 'Powered by'}
            </span>
            <img 
              src={swingLogo} 
              alt="SWING Thailand" 
              className="h-5 object-contain opacity-70"
            />
          </div>
        </footer>
      </main>

      {/* Rainbow bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-[hsl(0,85%,65%)] via-[hsl(50,95%,55%)] via-[hsl(120,65%,50%)] via-[hsl(200,85%,55%)] to-[hsl(280,70%,60%)]" />

      {/* Popups */}
      <HIVTestPopup />
      <AdminRequestsPopup open={adminPopupOpen} onOpenChange={setAdminPopupOpen} />
      
      {/* Onboarding Tour */}
      <OnboardingTour />
    </div>
  );
}
