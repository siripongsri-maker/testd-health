import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/lib/i18n";
import { getUserData, getTodayKey, recordCheckIn } from "@/lib/store";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Button } from "@/components/ui/button";
import { HIVTestPopup } from "@/components/HIVTestPopup";
import { AdminRequestsPopup } from "@/components/AdminRequestsPopup";
import { RankingBoard } from "@/components/RankingBoard";
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
  Sparkles,
} from "lucide-react";
import swingLogo from "@/assets/swing-logo.webp";
import { toast } from "sonner";

// Cute menu card component
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
        bg-card border-2 border-primary/20
        shadow-card hover:shadow-soft
        transition-all duration-300 
        hover:scale-[1.02] hover:-translate-y-1
        active:scale-[0.98]
        flex flex-col items-center justify-center gap-2 sm:gap-3 p-3 sm:p-4
        ${variant === 'featured' ? 'ring-2 ring-primary/30' : ''}
      `}
    >
      {/* Icon container */}
      <div className="h-12 w-12 sm:h-16 md:h-20 sm:w-16 md:w-20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      
      {/* Labels */}
      <div className="text-center space-y-0.5">
        <p className="text-sm sm:text-base font-bold text-foreground leading-tight">
          {titleTh}
        </p>
        <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">
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
  const [totalSurveyViews, setTotalSurveyViews] = useState(0);
  const [todayStatus, setTodayStatus] = useState<"pending" | "taken" | "skipped">("pending");

  // Load survey views from database
  useEffect(() => {
    const fetchSurveyViews = async () => {
      try {
        const { data, error } = await supabase
          .from('survey_views')
          .select('view_count');
        
        if (error) throw error;
        
        if (data) {
          const total = data.reduce((sum, d) => sum + d.view_count, 0);
          setTotalSurveyViews(total);
        }
      } catch (err) {
        console.error('Error fetching survey views:', err);
      }
    };
    
    fetchSurveyViews();
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

  const menuItems = [
    {
      icon: <TestTube className="h-full w-full" strokeWidth={1.5} />,
      titleTh: "ขอชุดตรวจ",
      titleEn: "SELF TEST",
      path: "/hiv-selftest",
    },
    {
      icon: <Calendar className="h-full w-full" strokeWidth={1.5} />,
      titleTh: "จองตรวจ",
      titleEn: "BOOK APPOINTMENT",
      path: "https://zerva.app/swingclinic",
      external: true,
    },
    {
      icon: <ClipboardList className="h-full w-full" strokeWidth={1.5} />,
      titleTh: "แบบประเมิน",
      titleEn: "SURVEYS",
      path: "/surveys",
    },
    {
      icon: <Users className="h-full w-full" strokeWidth={1.5} />,
      titleTh: "ดูแลตัวเอง",
      titleEn: "SELF CARE",
      path: "/self-care",
    },
    {
      icon: <BookOpen className="h-full w-full" strokeWidth={1.5} />,
      titleTh: "เรื่องน่ารู้",
      titleEn: "DID YOU KNOW?",
      path: "/info",
    },
    {
      icon: <MessageCircle className="h-full w-full" strokeWidth={1.5} />,
      titleTh: "ขอคำปรึกษา",
      titleEn: "ONLINE COUNSELOR",
      path: "/community",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/30 to-primary/20 relative overflow-hidden">
      {/* Swing logo decorations - subtle floating */}
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
      
      {/* Header */}
      <header className="sticky top-0 z-20 bg-transparent safe-top">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <img 
              src={swingLogo} 
              alt="SWING Thailand" 
              className="h-8 object-contain"
            />
            {localStorage.getItem('isLoggedIn') === 'true' && (
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
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-1">
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
            {localStorage.getItem('isLoggedIn') === 'true' && (
              <Button
                variant="ghost"
                size="icon"
                className="bg-card/80 backdrop-blur-sm rounded-full text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => {
                  localStorage.removeItem('isLoggedIn');
                  localStorage.removeItem('currentUser');
                  toast.success(language === 'th' ? 'ออกจากระบบแล้ว' : 'Logged out successfully');
                  navigate('/auth');
                }}
              >
                <LogOut className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 py-4 max-w-md mx-auto relative z-10">
        {/* Welcome text */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-foreground">
            testD คนเทสต์ดีอยู่นี่จ้า
          </h1>
          <p className="text-muted-foreground mt-1">
            {language === 'th' 
              ? 'เลือกบริการที่ต้องการ' 
              : 'Choose a service'}
          </p>
        </div>

        {/* Medication Reminder Card */}
        {userData.mode && userData.mode !== 'exploring' && (
          <div className="mb-4 rounded-2xl bg-card border-2 border-primary/30 shadow-card p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20">
                <Pill className="h-6 w-6 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-foreground">
                  {userData.mode === 'prep-daily' 
                    ? (language === 'th' ? 'กินยา PrEP วันนี้' : 'Take PrEP Today')
                    : userData.mode === 'pep'
                    ? (language === 'th' ? 'กินยา PEP วันนี้' : 'Take PEP Today')
                    : (language === 'th' ? 'กินยาวันนี้' : 'Take Medication Today')
                  }
                </p>
                <p className="text-sm text-muted-foreground">
                  {userData.prepReminderTime || '09:00'} • {language === 'th' ? `Streak: ${userData.streak} วัน` : `Streak: ${userData.streak} days`}
                </p>
              </div>
            </div>
            
            {todayStatus === 'pending' ? (
              <div className="flex gap-2">
                <Button
                  className="flex-1 h-11 rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80"
                  onClick={handleTaken}
                >
                  <Check className="h-4 w-4 mr-2" />
                  {language === 'th' ? 'กินแล้ว' : 'Taken'}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 h-11 rounded-xl"
                  onClick={handleSkipped}
                >
                  <X className="h-4 w-4 mr-2" />
                  {language === 'th' ? 'ข้าม' : 'Skip'}
                </Button>
              </div>
            ) : (
              <div className={`flex items-center justify-center gap-2 py-2 rounded-xl ${
                todayStatus === 'taken' 
                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                  : 'bg-muted text-muted-foreground'
              }`}>
                {todayStatus === 'taken' ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span className="font-medium">{language === 'th' ? 'กินแล้ววันนี้ ✓' : 'Taken today ✓'}</span>
                  </>
                ) : (
                  <span>{language === 'th' ? 'ข้ามวันนี้' : 'Skipped today'}</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Menu Grid - 3 columns, 2 rows */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {menuItems.map((item, index) => (
            <MenuCard
              key={index}
              icon={item.icon}
              titleTh={item.titleTh}
              titleEn={item.titleEn}
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

        {/* Ranking Board */}
        <div 
          className="mt-4 cursor-pointer hover:opacity-90 transition-opacity" 
          onClick={() => navigate("/leaderboard")}
        >
          <RankingBoard compact />
        </div>

        {/* Quick links */}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
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

        {/* Total Survey Views */}
        {totalSurveyViews > 0 && (
          <div className="mt-6 flex items-center justify-center gap-2 bg-card/60 backdrop-blur-sm rounded-full py-2 px-4 w-fit mx-auto">
            <Eye className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground">
              {language === 'th' ? 'ผู้เข้าชมสะสม' : 'Total visitors'}:
            </span>
            <span className="font-bold text-primary">{totalSurveyViews.toLocaleString()}</span>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-8 text-center space-y-2 pb-8">
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
    </div>
  );
}
