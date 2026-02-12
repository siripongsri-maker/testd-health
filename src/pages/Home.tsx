import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/lib/i18n";
import { getUserData } from "@/lib/store";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Button } from "@/components/ui/button";
import { HIVTestPopup } from "@/components/HIVTestPopup";
import { HomeLeaderboard } from "@/components/HomeLeaderboard";
import { AdminRequestsPopup } from "@/components/AdminRequestsPopup";
import { NotificationBell } from "@/components/NotificationBell";

import {
  TestTube,
  MessageCircle,
  BookOpen,
  Settings,
  ShieldCheck,
  ClipboardList,
  Users,
  Eye,
  Calendar,
  User,
  Heart,
  LogOut,
  LogIn,
  Trophy,
  ChevronDown,
  UserCircle,
} from "lucide-react";
import swingLogo from "@/assets/swing-logo.webp";
import testdLogo from "@/assets/testd-logo.png";
import { toast } from "sonner";

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
      `}
    >
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
    </button>
  );
}

// User dropdown menu component
function UserDropdownMenu({ language, navigate }: { language: string; navigate: (path: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const userName = localStorage.getItem('currentUser') || 'User';
  const isAdmin = localStorage.getItem('currentUser') === 'admin2024';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 glass-sm rounded-full px-3 py-1.5 hover:bg-muted/50 transition-colors"
      >
        <User className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium text-foreground max-w-[100px] truncate">
          {userName}
        </span>
        {isAdmin && (
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-gradient-to-r from-violet-500 to-purple-500 text-white">
            ADMIN
          </span>
        )}
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 w-48 glass rounded-xl shadow-lg border border-border/50 py-1 z-50 animate-fade-in">
          <button
            onClick={() => { setOpen(false); navigate('/quests'); }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors"
          >
            <Trophy className="h-4 w-4 text-amber-500" />
            <span className="font-medium">{language === 'th' ? 'ภารกิจ' : 'Quests'}</span>
          </button>
          <button
            onClick={() => { setOpen(false); navigate('/personal-info'); }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors"
          >
            <UserCircle className="h-4 w-4 text-primary" />
            <span className="font-medium">{language === 'th' ? 'ข้อมูลส่วนตัว' : 'Personal Info'}</span>
          </button>
          <div className="border-t border-border/50 my-1" />
          <button
            onClick={() => {
              setOpen(false);
              localStorage.removeItem('isLoggedIn');
              localStorage.removeItem('currentUser');
              toast.success(language === 'th' ? 'ออกจากระบบแล้ว' : 'Logged out successfully');
              navigate('/auth');
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-destructive/10 text-destructive transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span className="font-medium">{language === 'th' ? 'ออกจากระบบ' : 'Log out'}</span>
          </button>
        </div>
      )}
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
    {
      icon: <Heart className="h-full w-full" strokeWidth={1.5} />,
      titleTh: "ดูแลตัวเอง",
      titleEn: "SELF CARE",
      path: "/self-care",
    },
  ];

  return (
    <div className="relative">
      {/* Fixed background layer */}
      <div className="fixed inset-0 gradient-hero -z-10" />
      
      {/* Header */}
      <header className="sticky top-0 z-20 glass-heavy safe-top">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            {/* SWING Logo */}
            <img 
              src={swingLogo} 
              alt="SWING Thailand" 
              className="h-10 w-auto object-contain shrink-0"
            />
            
            {/* Login/Account */}
            {localStorage.getItem('isLoggedIn') === 'true' ? (
              <UserDropdownMenu language={language} navigate={navigate} />
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="glass-sm rounded-full px-4"
                onClick={() => navigate('/auth')}
              >
                <LogIn className="h-4 w-4 mr-2" />
                {language === 'th' ? 'เข้าสู่ระบบ' : 'Log in'}
              </Button>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            <div className="glass-sm rounded-full">
              <NotificationBell />
            </div>
            {isAdmin && (
              <Button
                variant="ghost"
                size="icon"
                className="relative glass-sm rounded-full"
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
            <div className="glass-sm rounded-full">
              <LanguageToggle />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="glass-sm rounded-full"
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
          <div className="flex justify-center mb-2">
            <img src={testdLogo} alt="testD" className="h-24 w-auto object-contain" />
          </div>
          <p className="text-muted-foreground">
            {language === 'th' 
              ? 'เลือกบริการที่ต้องการ' 
              : 'Choose a service'}
          </p>
        </div>

        {/* Floating Med Clock handles medication tracking now */}

        {/* Leaderboard Widget */}
        <div className="mb-4">
          <HomeLeaderboard />
        </div>

        {/* Menu Grid */}
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

        {/* Stats: Members and Total Visitors */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {totalMembers > 0 && (
            <div className="flex items-center gap-2 glass-sm rounded-full py-2 px-4">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">
                {language === 'th' ? 'สมาชิก' : 'Members'}:
              </span>
              <span className="font-bold text-primary">{totalMembers.toLocaleString()}</span>
            </div>
          )}
          {totalVisitors > 0 && (
            <div className="flex items-center gap-2 glass-sm rounded-full py-2 px-4">
              <Eye className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">
                {language === 'th' ? 'ผู้เข้าชมทั้งหมด' : 'Total Visitors'}:
              </span>
              <span className="font-bold text-primary">{totalVisitors.toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-6 text-center space-y-3 pb-20">
          <p className="text-sm leading-relaxed text-muted-foreground px-4">
            {language === 'th' 
              ? 'บริการนี้ไม่มีค่าใช้จ่าย • ข้อมูลของคุณเป็นความลับ' 
              : 'This service is free • Your information is confidential'}
          </p>
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-xs text-muted-foreground/70">
              {language === 'th' ? 'สนับสนุนโดย' : 'Powered by'}
            </span>
            <img 
              src={swingLogo} 
              alt="SWING Thailand" 
              className="h-10 object-contain opacity-70"
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
