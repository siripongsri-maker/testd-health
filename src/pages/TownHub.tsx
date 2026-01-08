import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/lib/i18n";
import { getUserData } from "@/lib/store";
import { TownBuilding } from "@/components/TownBuilding";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { HIVTestPopup } from "@/components/HIVTestPopup";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Button } from "@/components/ui/button";
import {
  TestTube,
  Pill,
  MessageCircle,
  Heart,
  BookOpen,
  Trophy,
  Settings,
  Sparkles,
  MapPin,
  Shield,
  Users,
  Compass,
} from "lucide-react";
import swingLogo from "@/assets/swing-logo.webp";

export default function TownHub() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [userData, setUserData] = useState(getUserData());

  useEffect(() => {
    setUserData(getUserData());
  }, []);

  const isNewUser = !userData.onboardingComplete;

  // Town buildings configuration
  const featuredBuilding = {
    icon: <TestTube className="h-full w-full" />,
    name: language === 'th' ? '🏥 ศูนย์ตรวจ HIV' : '🏥 HIV Test Center',
    description: language === 'th' ? 'รับชุดตรวจฟรี!' : 'Get FREE test kit!',
    onClick: () => navigate("/hiv-selftest"),
    variant: "featured" as const,
    glowing: true,
    badge: language === 'th' ? 'ฟรี' : 'FREE',
  };

  const mainBuildings = [
    {
      icon: <Pill className="h-full w-full" />,
      name: language === 'th' ? '💊 ร้านยา' : '💊 Pharmacy',
      description: language === 'th' ? 'PrEP & PEP' : 'PrEP & PEP',
      onClick: () => navigate("/dashboard"),
    },
    {
      icon: <Trophy className="h-full w-full" />,
      name: language === 'th' ? '🏆 กิลด์ฮอลล์' : '🏆 Guild Hall',
      description: language === 'th' ? 'เควสท์และความสำเร็จ' : 'Quests & Achievements',
      onClick: () => navigate("/quests"),
    },
    {
      icon: <MessageCircle className="h-full w-full" />,
      name: language === 'th' ? '🗨️ โรงเตี๊ยม' : '🗨️ Tavern',
      description: language === 'th' ? 'พูดคุยกับเพื่อนๆ' : 'Chat with friends',
      onClick: () => navigate("/community"),
    },
    {
      icon: <Heart className="h-full w-full" />,
      name: language === 'th' ? '🌸 สวนสุขภาพ' : '🌸 Wellness Garden',
      description: language === 'th' ? 'ดูแลตัวเอง' : 'Self-care tips',
      onClick: () => navigate("/self-care"),
    },
    {
      icon: <BookOpen className="h-full w-full" />,
      name: language === 'th' ? '📚 ห้องสมุด' : '📚 Library',
      description: language === 'th' ? 'ความรู้สุขภาพ' : 'Health info',
      onClick: () => navigate("/info"),
    },
    {
      icon: <Shield className="h-full w-full" />,
      name: language === 'th' ? '🛡️ SWING' : '🛡️ SWING Center',
      description: language === 'th' ? 'บริการสุขภาพ' : 'Health services',
      onClick: () => navigate("/swing"),
    },
  ];

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Sky gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-sky-200 via-sky-100 to-green-100 dark:from-indigo-950 dark:via-slate-900 dark:to-emerald-950" />
      
      {/* Clouds */}
      <div className="absolute top-10 left-10 w-20 h-8 bg-white/60 dark:bg-white/10 rounded-full blur-sm animate-float" style={{ animationDelay: "0s" }} />
      <div className="absolute top-20 right-20 w-32 h-10 bg-white/50 dark:bg-white/10 rounded-full blur-sm animate-float" style={{ animationDelay: "2s" }} />
      <div className="absolute top-16 left-1/3 w-24 h-8 bg-white/40 dark:bg-white/10 rounded-full blur-sm animate-float" style={{ animationDelay: "4s" }} />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-4 py-3 safe-top">
        <PlayerAvatar showStats className="flex-1" />
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => navigate("/settings")}
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Town Name Banner */}
      <div className="relative z-10 text-center py-4">
        <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-card/90 shadow-lg border-2 border-primary/20">
          <MapPin className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">
            {language === 'th' ? 'เมือง testD' : 'testD Town'}
          </h1>
          <Sparkles className="h-5 w-5 text-xp" />
        </div>
      </div>

      {/* Main content - Town grid */}
      <main className="relative z-10 flex-1 px-4 pb-24 overflow-y-auto">
        {/* Welcome message for new users */}
        {isNewUser && (
          <div className="mb-4 p-4 rounded-2xl bg-gradient-to-r from-primary/20 to-accent/20 border-2 border-primary/30">
            <div className="flex items-center gap-3">
              <Compass className="h-8 w-8 text-primary" />
              <div>
                <p className="font-bold text-foreground">
                  {language === 'th' ? 'ยินดีต้อนรับนักผจญภัย!' : 'Welcome, Adventurer!'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {language === 'th' ? 'สำรวจเมืองและเริ่มต้นการเดินทางของคุณ' : 'Explore the town and start your journey'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Featured building - HIV Test Center */}
        <div className="mb-6">
          <TownBuilding
            {...featuredBuilding}
            className="w-full min-h-[140px]"
          />
        </div>

        {/* Town buildings grid */}
        <div className="grid grid-cols-2 gap-4">
          {mainBuildings.map((building, index) => (
            <TownBuilding
              key={index}
              {...building}
              className="min-h-[130px]"
            />
          ))}
        </div>

        {/* Quick actions */}
        {userData.mode && (
          <div className="mt-6 p-4 rounded-2xl bg-card/80 border-2 border-border">
            <p className="text-sm font-semibold text-muted-foreground mb-3">
              {language === 'th' ? '⚡ การกระทำด่วน' : '⚡ Quick Actions'}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-2"
                onClick={() => navigate("/dashboard")}
              >
                <Pill className="h-4 w-4" />
                {language === 'th' ? 'บันทึกยา' : 'Log Meds'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-2"
                onClick={() => navigate("/progress")}
              >
                <Trophy className="h-4 w-4" />
                {language === 'th' ? 'ดูความก้าวหน้า' : 'View Progress'}
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Bottom decorative grass */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-green-400/30 to-transparent dark:from-emerald-900/30 pointer-events-none" />

      {/* Footer */}
      <footer className="relative z-10 pb-6 pt-2 text-center safe-bottom">
        <div className="flex items-center justify-center gap-2">
          <span className="text-xs text-muted-foreground">
            {language === 'th' ? 'สนับสนุนโดย' : 'Supported by'}
          </span>
          <img src={swingLogo} alt="SWING Thailand" className="h-6 object-contain" />
        </div>
      </footer>

      {/* HIV Test Popup */}
      <HIVTestPopup />
    </div>
  );
}
