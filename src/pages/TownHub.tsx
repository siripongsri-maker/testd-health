import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/lib/i18n";
import { getUserData } from "@/lib/store";
import { IsometricBuilding } from "@/components/IsometricBuilding";
import { GameAvatar } from "@/components/GameAvatar";
import { HIVTestPopup } from "@/components/HIVTestPopup";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Button } from "@/components/ui/button";
import { playWelcome } from "@/lib/sounds";
import {
  TestTube,
  Pill,
  MessageCircle,
  Heart,
  BookOpen,
  Trophy,
  Settings,
  MapPin,
  Shield,
  User,
} from "lucide-react";
import swingLogo from "@/assets/swing-logo.webp";

export default function TownHub() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [userData, setUserData] = useState(getUserData());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setUserData(getUserData());
    setLoaded(true);
    // Play welcome sound on first load
    const timer = setTimeout(() => playWelcome(), 500);
    return () => clearTimeout(timer);
  }, []);

  const isNewUser = !userData.onboardingComplete;

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Sky gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-sky-300 via-sky-200 to-emerald-200 dark:from-indigo-950 dark:via-purple-900 dark:to-slate-900" />
      
      {/* Animated clouds */}
      <div className="absolute top-6 left-4 w-20 h-8 bg-white/60 dark:bg-white/10 rounded-full blur-sm animate-float" style={{ animationDuration: '6s' }} />
      <div className="absolute top-10 right-8 w-28 h-10 bg-white/50 dark:bg-white/10 rounded-full blur-sm animate-float" style={{ animationDuration: '8s', animationDelay: '1s' }} />
      <div className="absolute top-20 left-1/3 w-24 h-8 bg-white/40 dark:bg-white/10 rounded-full blur-sm animate-float" style={{ animationDuration: '7s', animationDelay: '2s' }} />
      <div className="absolute top-14 right-1/3 w-16 h-6 bg-white/50 dark:bg-white/10 rounded-full blur-sm animate-float" style={{ animationDuration: '9s', animationDelay: '0.5s' }} />

      {/* Header */}
      <header className="relative z-20 flex items-center justify-between px-4 py-3 safe-top">
        <GameAvatar showStats size="md" />
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full bg-card/60 backdrop-blur-sm hover:bg-card/80 transition-colors"
            onClick={() => navigate("/personal-info")}
          >
            <User className="h-5 w-5" />
          </Button>
          <LanguageToggle />
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full bg-card/60 backdrop-blur-sm hover:bg-card/80 transition-colors"
            onClick={() => navigate("/settings")}
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Town Name */}
      <div className="relative z-10 text-center py-2">
        <div className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full bg-card/80 shadow-lg backdrop-blur-sm border border-white/30">
          <MapPin className="h-4 w-4 text-primary" />
          <h1 className="text-lg font-bold text-foreground">
            {language === 'th' ? 'เมือง testD' : 'testD Town'}
          </h1>
        </div>
      </div>

      {/* Scrollable Town Map */}
      <main className="relative z-10 flex-1 overflow-auto pb-20">
        <div className={cn(
          "min-h-[600px] px-4 py-6 transition-all duration-700",
          loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        )}>
          
          {/* Welcome message for new users */}
          {isNewUser && (
            <div className="mb-6 mx-auto max-w-sm animate-fade-in">
              <div className="p-4 rounded-2xl bg-card/95 backdrop-blur-sm border border-primary/20 shadow-lg">
                <p className="text-sm font-bold text-foreground text-center">
                  {language === 'th' ? '🎮 ยินดีต้อนรับ! แตะที่อาคารเพื่อเข้าใช้บริการ' : '🎮 Welcome! Tap buildings to explore'}
                </p>
              </div>
            </div>
          )}

          {/* Featured Building - HIV Test Center */}
          <div className="flex justify-center mb-8" style={{ animationDelay: '0.1s' }}>
            <IsometricBuilding
              icon={<TestTube className="h-full w-full" />}
              name={language === 'th' ? 'ศูนย์ตรวจ HIV' : 'HIV Test Center'}
              description={language === 'th' ? '🎁 รับชุดตรวจฟรี!' : '🎁 Get FREE test kit!'}
              onClick={() => navigate("/hiv-selftest")}
              variant="featured"
              glowing
              badge={language === 'th' ? 'ฟรี' : 'FREE'}
              size="lg"
            />
          </div>

          {/* Main Buildings Row */}
          <div className="flex justify-center gap-6 mb-8 flex-wrap" style={{ animationDelay: '0.2s' }}>
            <IsometricBuilding
              icon={<Pill className="h-full w-full" />}
              name={language === 'th' ? 'ร้านยา PrEP' : 'PrEP Pharmacy'}
              description={language === 'th' ? 'จัดการยา PrEP/PEP' : 'Manage PrEP/PEP'}
              onClick={() => navigate("/dashboard")}
              buildingColor="from-emerald-100 to-emerald-200 dark:from-emerald-800 dark:to-emerald-900"
              size="md"
            />
            <IsometricBuilding
              icon={<Heart className="h-full w-full" />}
              name={language === 'th' ? 'สปาสุขภาพ' : 'Wellness Spa'}
              description={language === 'th' ? 'ดูแลตัวเอง' : 'Self-care tips'}
              onClick={() => navigate("/self-care")}
              buildingColor="from-pink-100 to-pink-200 dark:from-pink-800 dark:to-pink-900"
              size="md"
            />
            <IsometricBuilding
              icon={<Trophy className="h-full w-full" />}
              name={language === 'th' ? 'กิลด์ผจญภัย' : 'Quest Guild'}
              description={language === 'th' ? 'ทำภารกิจรับรางวัล' : 'Complete quests'}
              onClick={() => navigate("/quests")}
              buildingColor="from-amber-100 to-amber-200 dark:from-amber-800 dark:to-amber-900"
              size="md"
            />
          </div>

          {/* Secondary Buildings Row */}
          <div className="flex justify-center gap-6 mb-8 flex-wrap" style={{ animationDelay: '0.3s' }}>
            <IsometricBuilding
              icon={<MessageCircle className="h-full w-full" />}
              name={language === 'th' ? 'โรงเตี๊ยม' : 'Community Tavern'}
              description={language === 'th' ? 'พูดคุยแชร์ประสบการณ์' : 'Chat & share'}
              onClick={() => navigate("/community")}
              buildingColor="from-purple-100 to-purple-200 dark:from-purple-800 dark:to-purple-900"
              size="md"
            />
            <IsometricBuilding
              icon={<BookOpen className="h-full w-full" />}
              name={language === 'th' ? 'ห้องสมุดความรู้' : 'Knowledge Library'}
              description={language === 'th' ? 'เรียนรู้สุขภาพ' : 'Learn health tips'}
              onClick={() => navigate("/info")}
              buildingColor="from-blue-100 to-blue-200 dark:from-blue-800 dark:to-blue-900"
              size="md"
            />
          </div>

          {/* Decorative ground area */}
          <div className="relative mx-auto max-w-md">
            {/* Grass area */}
            <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-b from-green-400/30 to-green-500/40 dark:from-green-800/30 dark:to-green-900/40 blur-xl" />
            
            {/* Path to character */}
            <div className="py-8 flex flex-col items-center gap-4">
              {/* Decorative elements */}
              <div className="flex gap-8 text-2xl">
                <span className="animate-float" style={{ animationDelay: '0s' }}>🌳</span>
                <span className="animate-float" style={{ animationDelay: '0.5s' }}>🌸</span>
                <span className="animate-float" style={{ animationDelay: '1s' }}>🌳</span>
              </div>
              
              {/* Character in center */}
              <button 
                onClick={() => navigate("/avatar")}
                className="relative transition-all duration-300 hover:scale-110 active:scale-95 group"
              >
                {/* Glow effect */}
                <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl scale-150 opacity-0 group-hover:opacity-100 transition-opacity" />
                
                {/* Standing shadow */}
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-12 h-4 bg-black/20 rounded-full blur-sm" />
                
                {/* Character */}
                <div className="relative text-6xl animate-bounce-gentle">
                  🧍
                </div>
                
                {/* Tap hint */}
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
                  <span className="text-xs font-medium text-foreground/70 bg-card/80 px-2 py-1 rounded-full">
                    {language === 'th' ? 'แตะเพื่อแต่งตัว' : 'Tap to customize'}
                  </span>
                </div>
              </button>

              {/* More decorative elements */}
              <div className="flex gap-8 text-2xl mt-8">
                <span className="animate-float" style={{ animationDelay: '0.3s' }}>🌲</span>
                <span className="animate-float" style={{ animationDelay: '0.8s' }}>🌷</span>
                <span className="animate-float" style={{ animationDelay: '1.3s' }}>🌲</span>
              </div>
            </div>
          </div>

          {/* SWING Building at bottom */}
          <div className="flex justify-center mt-6" style={{ animationDelay: '0.4s' }}>
            <IsometricBuilding
              icon={<Shield className="h-full w-full" />}
              name="SWING Thailand"
              description={language === 'th' ? 'เกี่ยวกับเรา' : 'About SWING'}
              onClick={() => navigate("/swing")}
              buildingColor="from-teal-100 to-teal-200 dark:from-teal-800 dark:to-teal-900"
              size="sm"
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 z-10 pb-4 pt-2 text-center safe-bottom bg-gradient-to-t from-emerald-200/80 to-transparent dark:from-slate-900/80 backdrop-blur-sm">
        <div className="flex items-center justify-center gap-2">
          <span className="text-xs text-foreground/70 font-medium">
            {language === 'th' ? 'สนับสนุนโดย' : 'Supported by'}
          </span>
          <img src={swingLogo} alt="SWING Thailand" className="h-5 object-contain opacity-80" />
        </div>
      </footer>

      {/* HIV Test Popup */}
      <HIVTestPopup />
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
