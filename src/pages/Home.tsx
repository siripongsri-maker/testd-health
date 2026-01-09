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
import { RankingBoard } from "@/components/RankingBoard";
import {
  TestTube,
  MessageCircle,
  Heart,
  BookOpen,
  Settings,
  ShieldCheck,
  Send,
  Users,
} from "lucide-react";
import swingLogo from "@/assets/swing-logo.webp";

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
        group relative w-full aspect-square rounded-3xl 
        bg-card border-2 border-primary/20
        shadow-card hover:shadow-soft
        transition-all duration-300 
        hover:scale-[1.02] hover:-translate-y-1
        active:scale-[0.98]
        flex flex-col items-center justify-center gap-3 p-4
        ${variant === 'featured' ? 'ring-2 ring-primary/30' : ''}
      `}
    >
      {/* Icon container */}
      <div className="h-20 w-20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      
      {/* Labels */}
      <div className="text-center space-y-0.5">
        <p className="text-base font-bold text-foreground leading-tight">
          {titleTh}
        </p>
        <p className="text-xs text-muted-foreground uppercase tracking-wide">
          {titleEn}
        </p>
      </div>
    </button>
  );
}

// Swing logo decoration
function SwingDecoration({ className }: { className?: string }) {
  return (
    <div className={`${className} select-none pointer-events-none`}>
      <img 
        src={swingLogo} 
        alt="SWING" 
        className="h-12 w-auto object-contain opacity-80"
      />
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user } = useAuth();
  const [userData, setUserData] = useState(getUserData());
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [adminPopupOpen, setAdminPopupOpen] = useState(false);

  useEffect(() => {
    setUserData(getUserData());
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
      icon: (
        <div className="flex flex-col items-center">
          <img src={swingLogo} alt="SWING" className="h-12 object-contain" />
        </div>
      ),
      titleTh: "เว็บไซต์",
      titleEn: "WEBSITE",
      path: "/swing",
    },
    {
      icon: <Send className="h-full w-full" strokeWidth={1.5} />,
      titleTh: "ส่งผลตรวจ",
      titleEn: "TEST RESULT",
      path: "/hiv-selftest",
    },
    {
      icon: <Users className="h-full w-full" strokeWidth={1.5} />,
      titleTh: "ชวนเพื่อน",
      titleEn: "SHARE WITH FRIENDS",
      path: "/share",
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
      {/* Swing logo decorations */}
      <SwingDecoration className="absolute -bottom-2 -left-4 rotate-[-15deg]" />
      <SwingDecoration className="absolute -bottom-2 -right-4 rotate-[15deg]" />
      <SwingDecoration className="absolute top-20 -left-8 rotate-[-30deg] scale-75" />
      <SwingDecoration className="absolute top-40 -right-6 rotate-[25deg] scale-75" />
      
      {/* Header */}
      <header className="sticky top-0 z-20 bg-transparent safe-top">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <img 
              src={swingLogo} 
              alt="SWING Thailand" 
              className="h-8 object-contain"
            />
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
          </div>
        </div>
      </header>

      <main className="px-4 py-4 max-w-md mx-auto relative z-10">
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

        {/* Menu Grid - 3 columns, 2 rows */}
        <div className="grid grid-cols-3 gap-3">
          {menuItems.map((item, index) => (
            <MenuCard
              key={index}
              icon={item.icon}
              titleTh={item.titleTh}
              titleEn={item.titleEn}
              onClick={() => navigate(item.path)}
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
        <div className="mt-6 flex justify-center gap-3">
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
            onClick={() => navigate("/dashboard")}
          >
            {language === 'th' ? 'PrEP / PEP' : 'PrEP / PEP'}
          </Button>
        </div>

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
