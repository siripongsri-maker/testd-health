import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/lib/i18n";
import { getUserData } from "@/lib/store";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ServiceCard, QuickAction } from "@/components/ServiceCard";
import { ModernAvatar } from "@/components/ModernAvatar";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Button } from "@/components/ui/button";
import { HIVTestPopup } from "@/components/HIVTestPopup";
import { AdminRequestsPopup } from "@/components/AdminRequestsPopup";
import {
  TestTube,
  Pill,
  MessageCircle,
  Heart,
  BookOpen,
  Trophy,
  Settings,
  Shield,
  User,
  ShieldCheck,
  Package,
  AlertTriangle,
  Sparkles,
  Bell,
} from "lucide-react";
import swingLogo from "@/assets/swing-logo.webp";

export default function Home() {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const [userData, setUserData] = useState(getUserData());
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [adminPopupOpen, setAdminPopupOpen] = useState(false);
  const [showHIVPopup, setShowHIVPopup] = useState(false);

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

  const isNewUser = !userData.onboardingComplete;

  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return language === 'th' ? 'สวัสดีตอนเช้า' : 'Good morning';
    if (hour < 17) return language === 'th' ? 'สวัสดีตอนบ่าย' : 'Good afternoon';
    return language === 'th' ? 'สวัสดีตอนเย็น' : 'Good evening';
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-lg border-b border-border safe-top">
        <div className="flex items-center justify-between px-4 py-3">
          <ModernAvatar showStats size="md" />
          
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button
                variant="ghost"
                size="icon"
                className="relative"
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
            <LanguageToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/settings")}
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 space-y-6 max-w-lg mx-auto">
        {/* Welcome Section */}
        <section className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            {getGreeting()} 👋
          </h1>
          <p className="text-muted-foreground">
            {language === 'th' 
              ? 'มีอะไรให้เราช่วยวันนี้?' 
              : 'How can we help you today?'}
          </p>
        </section>

        {/* New User Welcome */}
        {isNewUser && (
          <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">
                  {language === 'th' ? 'ยินดีต้อนรับ!' : 'Welcome!'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {language === 'th' 
                    ? 'เริ่มต้นใช้งานเพื่อดูแลสุขภาพของคุณ' 
                    : 'Start your health journey with us'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Featured Service - HIV Test */}
        <section>
          <ServiceCard
            icon={<TestTube className="h-full w-full" />}
            title={language === 'th' ? 'ตรวจ HIV ฟรี' : 'Free HIV Test'}
            description={language === 'th' 
              ? 'รับชุดตรวจส่งถึงบ้าน ไม่เสียค่าใช้จ่าย' 
              : 'Get a free test kit delivered to your home'}
            onClick={() => navigate("/hiv-selftest")}
            variant="featured"
            badge={language === 'th' ? 'ฟรี' : 'FREE'}
            size="lg"
          />
        </section>

        {/* Main Services */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            {language === 'th' ? 'บริการ' : 'Services'}
          </h2>
          
          <div className="space-y-3">
            <ServiceCard
              icon={<Pill className="h-full w-full" />}
              title={language === 'th' ? 'PrEP / PEP' : 'PrEP / PEP'}
              description={language === 'th' 
                ? 'ยาป้องกัน HIV ก่อนและหลังเสี่ยง' 
                : 'Pre & post exposure prophylaxis'}
              onClick={() => navigate("/dashboard")}
            />

            <ServiceCard
              icon={<Heart className="h-full w-full" />}
              title={language === 'th' ? 'ดูแลตัวเอง' : 'Self Care'}
              description={language === 'th' 
                ? 'สินค้าสุขภาพและความปลอดภัย' 
                : 'Health & safety products'}
              onClick={() => navigate("/self-care")}
              variant="accent"
            />

            <ServiceCard
              icon={<BookOpen className="h-full w-full" />}
              title={language === 'th' ? 'ข้อมูลสุขภาพ' : 'Health Info'}
              description={language === 'th' 
                ? 'บทความและความรู้ที่เป็นประโยชน์' 
                : 'Helpful articles and resources'}
              onClick={() => navigate("/info")}
            />

            <ServiceCard
              icon={<MessageCircle className="h-full w-full" />}
              title={language === 'th' ? 'ชุมชน' : 'Community'}
              description={language === 'th' 
                ? 'พูดคุยแลกเปลี่ยนในที่ปลอดภัย' 
                : 'Safe space to connect and share'}
              onClick={() => navigate("/community")}
            />
          </div>
        </section>

        {/* Quick Actions */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            {language === 'th' ? 'เมนูลัด' : 'Quick Actions'}
          </h2>
          
          <div className="grid grid-cols-4 gap-2">
            <QuickAction
              icon={<Trophy className="h-full w-full" />}
              label={language === 'th' ? 'ภารกิจ' : 'Quests'}
              onClick={() => navigate("/quests")}
              variant="primary"
            />
            <QuickAction
              icon={<Package className="h-full w-full" />}
              label={language === 'th' ? 'ติดตาม' : 'Track'}
              onClick={() => navigate("/track-order")}
            />
            <QuickAction
              icon={<User className="h-full w-full" />}
              label={language === 'th' ? 'โปรไฟล์' : 'Profile'}
              onClick={() => navigate("/personal-info")}
            />
            <QuickAction
              icon={<Shield className="h-full w-full" />}
              label="SWING"
              onClick={() => navigate("/swing")}
            />
          </div>
        </section>

        {/* Emergency PEP Banner */}
        <section>
          <button
            onClick={() => navigate("/pep")}
            className="w-full p-4 rounded-2xl bg-destructive/10 border border-destructive/20 hover:bg-destructive/20 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-destructive/20 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-destructive">
                  {language === 'th' ? 'PEP ฉุกเฉิน' : 'Emergency PEP'}
                </h3>
                <p className="text-sm text-destructive/70">
                  {language === 'th' 
                    ? 'มีความเสี่ยง? รับยาภายใน 72 ชม.' 
                    : 'Had a risk? Get medication within 72 hrs'}
                </p>
              </div>
            </div>
          </button>
        </section>

        {/* Footer */}
        <footer className="pt-6 text-center space-y-3">
          <div className="flex items-center justify-center gap-2">
            <span className="text-xs text-muted-foreground">
              {language === 'th' ? 'สนับสนุนโดย' : 'Powered by'}
            </span>
            <img 
              src={swingLogo} 
              alt="SWING Thailand" 
              className="h-6 object-contain"
            />
          </div>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            {language === 'th' 
              ? 'บริการนี้ไม่มีค่าใช้จ่าย ข้อมูลของคุณเป็นความลับ' 
              : 'This service is free. Your information is confidential.'}
          </p>
        </footer>
      </main>

      {/* Popups */}
      <HIVTestPopup />
      <AdminRequestsPopup open={adminPopupOpen} onOpenChange={setAdminPopupOpen} />
    </div>
  );
}
