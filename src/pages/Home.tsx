import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/lib/i18n";
import { getUserData } from "@/lib/store";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Button } from "@/components/ui/button";
import { HIVTestPopup } from "@/components/HIVTestPopup";
import { AdminRequestsPopup } from "@/components/AdminRequestsPopup";
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
  User,
  LogOut,
  LogIn,
  Trophy,
} from "lucide-react";
import swingLogo from "@/assets/swing-logo.webp";
import { toast } from "sonner";

// Simple menu card component (no XP display)
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
        flex flex-col items-center justify-center gap-1.5 sm:gap-2 p-2 sm:p-3
        ${variant === 'featured' ? 'ring-2 ring-primary/30' : ''}
      `}
    >
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

  // Load stats once on mount (no real-time subscriptions)
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

  useEffect(() => {
    const data = getUserData();
    setLocalUserData(data);
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
      path: "https://zerva.app/swing_x_hornet_th",
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
    <div className="relative">
      {/* Fixed background layer */}
      <div className="fixed inset-0 bg-gradient-to-b from-primary/30 to-primary/20 -z-10" />
      
      {/* Header */}
      <header className="sticky top-0 z-20 bg-gradient-to-b from-primary/30 to-transparent safe-top">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            {/* SWING Logo */}
            <img 
              src={swingLogo} 
              alt="SWING Thailand" 
              className="h-10 w-auto object-contain shrink-0"
            />
            
            {/* Login/Account button */}
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

        {/* Medication Widget - only shows for users on medication */}
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

        {/* Stats: Members and Total Visitors - Static display */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {totalMembers > 0 && (
            <div className="flex items-center gap-2 bg-card/60 backdrop-blur-sm rounded-full py-2 px-4">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">
                {language === 'th' ? 'สมาชิก' : 'Members'}:
              </span>
              <span className="font-bold text-primary">{totalMembers.toLocaleString()}</span>
            </div>
          )}
          {totalVisitors > 0 && (
            <div className="flex items-center gap-2 bg-card/60 backdrop-blur-sm rounded-full py-2 px-4">
              <Eye className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">
                {language === 'th' ? 'ผู้เข้าชมทั้งหมด' : 'Total Visitors'}:
              </span>
              <span className="font-bold text-primary">{totalVisitors.toLocaleString()}</span>
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
    </div>
  );
}
