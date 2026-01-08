import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/lib/i18n";
import { getUserData } from "@/lib/store";
import { TownBuilding, PixelTree, Pond, Fence } from "@/components/TownBuilding";
import { GameAvatar } from "@/components/GameAvatar";
import { HIVTestPopup } from "@/components/HIVTestPopup";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Button } from "@/components/ui/button";
import { playWelcome, playBuildingTap } from "@/lib/sounds";
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
  Sparkles,
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
    const timer = setTimeout(() => playWelcome(), 500);
    return () => clearTimeout(timer);
  }, []);

  const isNewUser = !userData.onboardingComplete;

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Pixel-art style sky gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-sky-400 via-sky-300 to-emerald-300 dark:from-indigo-900 dark:via-purple-900 dark:to-emerald-900" />
      
      {/* Clouds - pixel style */}
      <div className="absolute top-8 left-8 flex gap-1">
        <div className="w-8 h-4 bg-white/80 rounded-full" />
        <div className="w-6 h-3 bg-white/80 rounded-full -ml-2 mt-1" />
        <div className="w-4 h-3 bg-white/80 rounded-full -ml-1" />
      </div>
      <div className="absolute top-12 right-12 flex gap-1">
        <div className="w-10 h-5 bg-white/70 rounded-full" />
        <div className="w-6 h-4 bg-white/70 rounded-full -ml-3 mt-1" />
      </div>
      <div className="absolute top-20 left-1/3 flex gap-1 animate-float" style={{ animationDuration: '10s' }}>
        <div className="w-6 h-3 bg-white/60 rounded-full" />
        <div className="w-4 h-2 bg-white/60 rounded-full -ml-1" />
      </div>

      {/* Header */}
      <header className="relative z-20 flex items-center justify-between px-3 py-2 safe-top">
        <GameAvatar showStats size="md" />
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-lg bg-stone-800/80 text-white hover:bg-stone-700 border-2 border-stone-600"
            onClick={() => navigate("/personal-info")}
          >
            <User className="h-4 w-4" />
          </Button>
          <LanguageToggle />
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-lg bg-stone-800/80 text-white hover:bg-stone-700 border-2 border-stone-600"
            onClick={() => navigate("/settings")}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Town Name Banner */}
      <div className="relative z-10 text-center py-1">
        <div className="inline-flex items-center gap-2 px-4 py-1 rounded-lg bg-stone-800/90 shadow-lg border-2 border-stone-600">
          <Sparkles className="h-4 w-4 text-amber-400" />
          <h1 className="text-base font-bold text-white tracking-wide">
            {language === 'th' ? '🏘️ เมือง testD' : '🏘️ testD Village'}
          </h1>
          <Sparkles className="h-4 w-4 text-amber-400" />
        </div>
      </div>

      {/* Scrollable Town Map */}
      <main className="relative z-10 flex-1 overflow-auto">
        <div className={`min-h-[700px] transition-all duration-700 ${loaded ? "opacity-100" : "opacity-0"}`}>
          
          {/* Welcome message */}
          {isNewUser && (
            <div className="mx-4 mb-4 animate-fade-in">
              <div className="p-3 rounded-lg bg-stone-800/90 border-2 border-amber-500 shadow-lg">
                <p className="text-sm font-bold text-white text-center">
                  {language === 'th' ? '🎮 ยินดีต้อนรับสู่หมู่บ้าน! แตะอาคารเพื่อสำรวจ' : '🎮 Welcome to the village! Tap buildings to explore'}
                </p>
              </div>
            </div>
          )}

          {/* Ground/grass layer */}
          <div className="relative mx-2">
            {/* Grass base */}
            <div className="absolute inset-0 bg-gradient-to-b from-green-500 to-green-600 rounded-3xl" />
            
            {/* Grass texture pattern */}
            <div className="absolute inset-0 opacity-30 rounded-3xl" style={{
              backgroundImage: `
                radial-gradient(circle at 20% 30%, #22c55e 1px, transparent 1px),
                radial-gradient(circle at 80% 70%, #16a34a 1px, transparent 1px),
                radial-gradient(circle at 50% 50%, #22c55e 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px'
            }} />

            {/* Dirt path */}
            <div className="absolute top-1/2 left-0 right-0 h-12 bg-gradient-to-b from-amber-600/60 to-amber-700/60 -translate-y-1/2" />
            <div className="absolute top-20 left-1/2 w-10 h-48 bg-gradient-to-r from-amber-600/60 to-amber-700/60 -translate-x-1/2" />

            {/* Content */}
            <div className="relative py-6 px-4">
              
              {/* Top row - Trees and Featured Building */}
              <div className="flex justify-center items-end gap-2 mb-4">
                <PixelTree variant="pine" className="animate-float" style={{ animationDelay: '0s' }} />
                <PixelTree variant="oak" className="animate-float" style={{ animationDelay: '0.5s' }} />
                
                {/* Featured HIV Test Center */}
                <div className="mx-4">
                  <TownBuilding
                    icon={<TestTube className="h-full w-full" />}
                    name={language === 'th' ? '🏥 ศูนย์ตรวจ' : '🏥 Test Center'}
                    description={language === 'th' ? '✨ รับชุดตรวจ HIV ฟรี!' : '✨ FREE HIV test kit!'}
                    onClick={() => navigate("/hiv-selftest")}
                    variant="featured"
                    badge="FREE"
                    size="lg"
                  />
                </div>

                <PixelTree variant="oak" className="animate-float" style={{ animationDelay: '1s' }} />
                <PixelTree variant="pine" className="animate-float" style={{ animationDelay: '1.5s' }} />
              </div>

              {/* Second row - Main buildings */}
              <div className="flex justify-center items-end gap-6 mb-6">
                <div className="flex flex-col items-center gap-1">
                  <PixelTree variant="bush" />
                  <TownBuilding
                    icon={<Pill className="h-full w-full" />}
                    name={language === 'th' ? '💊 ร้านยา' : '💊 Pharmacy'}
                    description="PrEP & PEP"
                    onClick={() => navigate("/dashboard")}
                    roofColor="from-teal-500 to-teal-600"
                    wallColor="from-teal-50 to-teal-100"
                    size="md"
                  />
                </div>

                <TownBuilding
                  icon={<Heart className="h-full w-full" />}
                  name={language === 'th' ? '💆 สปา' : '💆 Wellness'}
                  description={language === 'th' ? 'ดูแลสุขภาพ' : 'Self-care'}
                  onClick={() => navigate("/self-care")}
                  roofColor="from-pink-400 to-pink-500"
                  wallColor="from-pink-50 to-pink-100"
                  size="md"
                />

                <div className="flex flex-col items-center gap-1">
                  <PixelTree variant="bush" />
                  <TownBuilding
                    icon={<Trophy className="h-full w-full" />}
                    name={language === 'th' ? '🏆 กิลด์' : '🏆 Guild'}
                    description={language === 'th' ? 'ทำภารกิจ' : 'Quests'}
                    onClick={() => navigate("/quests")}
                    roofColor="from-amber-500 to-amber-600"
                    wallColor="from-amber-50 to-amber-100"
                    size="md"
                  />
                </div>
              </div>

              {/* Pond and center area */}
              <div className="flex justify-center items-center gap-8 mb-6">
                <Pond />
                
                {/* Character in center */}
                <button 
                  onClick={() => {
                    playBuildingTap();
                    navigate("/avatar");
                  }}
                  className="relative transition-all duration-200 hover:scale-110 active:scale-95 group"
                >
                  <div className="absolute inset-0 rounded-full bg-amber-400/30 blur-xl scale-150 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-10 h-3 bg-black/30 rounded-full blur-sm" />
                  <div className="relative text-5xl animate-bounce-gentle">🧍</div>
                  <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <span className="text-[10px] font-bold text-white bg-stone-800/90 px-2 py-0.5 rounded border border-stone-600">
                      {language === 'th' ? 'แต่งตัว' : 'Customize'}
                    </span>
                  </div>
                </button>

                <div className="flex flex-col gap-2">
                  <PixelTree variant="oak" />
                  <PixelTree variant="bush" />
                </div>
              </div>

              {/* Third row - Secondary buildings */}
              <div className="flex justify-center items-end gap-6 mb-6">
                <TownBuilding
                  icon={<MessageCircle className="h-full w-full" />}
                  name={language === 'th' ? '🍺 โรงเตี๊ยม' : '🍺 Tavern'}
                  description={language === 'th' ? 'พูดคุย' : 'Chat'}
                  onClick={() => navigate("/community")}
                  roofColor="from-purple-500 to-purple-600"
                  wallColor="from-purple-50 to-purple-100"
                  size="md"
                />

                <div className="flex flex-col items-center">
                  <Fence />
                  <TownBuilding
                    icon={<BookOpen className="h-full w-full" />}
                    name={language === 'th' ? '📚 ห้องสมุด' : '📚 Library'}
                    description={language === 'th' ? 'ความรู้' : 'Learn'}
                    onClick={() => navigate("/info")}
                    roofColor="from-blue-500 to-blue-600"
                    wallColor="from-blue-50 to-blue-100"
                    size="md"
                  />
                </div>

                <TownBuilding
                  icon={<Shield className="h-full w-full" />}
                  name="SWING"
                  description={language === 'th' ? 'เกี่ยวกับเรา' : 'About us'}
                  onClick={() => navigate("/swing")}
                  roofColor="from-emerald-500 to-emerald-600"
                  wallColor="from-emerald-50 to-emerald-100"
                  size="md"
                />
              </div>

              {/* Bottom decorations */}
              <div className="flex justify-center items-end gap-4">
                <PixelTree variant="pine" />
                <PixelTree variant="oak" />
                <div className="text-2xl">🌻</div>
                <PixelTree variant="bush" />
                <PixelTree variant="pine" />
                <div className="text-2xl">🌷</div>
                <PixelTree variant="oak" />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-3 text-center safe-bottom bg-gradient-to-t from-green-600/80 to-transparent">
        <div className="flex items-center justify-center gap-2">
          <span className="text-xs text-white/90 font-medium">
            {language === 'th' ? 'สนับสนุนโดย' : 'Supported by'}
          </span>
          <img src={swingLogo} alt="SWING Thailand" className="h-5 object-contain brightness-110" />
        </div>
      </footer>

      {/* HIV Test Popup */}
      <HIVTestPopup />
    </div>
  );
}
