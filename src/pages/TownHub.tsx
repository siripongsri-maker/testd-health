import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/lib/i18n";
import { getUserData } from "@/lib/store";
import { IsometricBuilding } from "@/components/IsometricBuilding";
import { GameAvatar } from "@/components/GameAvatar";
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
  MapPin,
  Shield,
  User,
  Bell,
} from "lucide-react";
import swingLogo from "@/assets/swing-logo.webp";

export default function TownHub() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [userData, setUserData] = useState(getUserData());

  useEffect(() => {
    setUserData(getUserData());
  }, []);

  const isNewUser = !userData.onboardingComplete;

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Sky gradient background - sunset/twilight feel like reference */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-300 via-pink-200 to-sky-300 dark:from-indigo-950 dark:via-purple-900 dark:to-slate-900" />
      
      {/* Clouds */}
      <div className="absolute top-8 left-8 w-24 h-10 bg-white/50 dark:bg-white/10 rounded-full blur-md" />
      <div className="absolute top-16 right-12 w-36 h-12 bg-white/40 dark:bg-white/10 rounded-full blur-md" />
      <div className="absolute top-24 left-1/4 w-28 h-8 bg-white/30 dark:bg-white/10 rounded-full blur-md" />

      {/* Header */}
      <header className="relative z-20 flex items-center justify-between px-4 py-3 safe-top">
        <GameAvatar showStats size="md" />
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full bg-card/50 backdrop-blur-sm"
            onClick={() => navigate("/personal-info")}
          >
            <User className="h-5 w-5" />
          </Button>
          <LanguageToggle />
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full bg-card/50 backdrop-blur-sm"
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

      {/* Isometric Town Map */}
      <main className="relative z-10 flex-1 overflow-hidden">
        {/* Ground/Island base */}
        <div className="absolute inset-x-0 bottom-20 top-0 flex items-center justify-center">
          <div className="relative w-full max-w-md aspect-square">
            {/* Grass island base */}
            <div className="absolute inset-0 rounded-[40%] bg-gradient-to-b from-green-400 to-green-600 dark:from-emerald-700 dark:to-emerald-900 shadow-2xl transform rotate-0 skew-x-0" 
                 style={{ 
                   borderRadius: '45% 45% 50% 50%',
                   boxShadow: '0 20px 60px -15px rgba(0,0,0,0.3), inset 0 -10px 30px rgba(0,0,0,0.1)'
                 }} />
            
            {/* Grass texture overlay */}
            <div className="absolute inset-4 rounded-[40%] opacity-50"
                 style={{
                   background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.2) 0%, transparent 50%), radial-gradient(circle at 70% 70%, rgba(0,0,0,0.1) 0%, transparent 40%)'
                 }} />

            {/* Paths - cross pattern */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {/* Horizontal path */}
              <div className="absolute w-3/4 h-6 bg-gradient-to-r from-transparent via-amber-100/80 to-transparent rounded-full" />
              {/* Vertical path */}
              <div className="absolute w-6 h-3/4 bg-gradient-to-b from-transparent via-amber-100/80 to-transparent rounded-full" />
              {/* Center circle */}
              <div className="absolute w-16 h-16 rounded-full bg-amber-100/60 border-4 border-amber-200/50 flex items-center justify-center">
                <Bell className="h-6 w-6 text-primary/60" />
              </div>
            </div>

            {/* Trees - decorative */}
            <div className="absolute top-8 left-8 text-2xl">🌳</div>
            <div className="absolute top-12 right-12 text-xl">🌲</div>
            <div className="absolute bottom-16 left-12 text-2xl">🌳</div>
            <div className="absolute bottom-20 right-8 text-xl">🌲</div>
            <div className="absolute top-1/3 left-4 text-lg">🌲</div>
            <div className="absolute bottom-1/3 right-4 text-lg">🌳</div>

            {/* Flowers */}
            <div className="absolute top-20 right-1/4 text-sm">🌸</div>
            <div className="absolute bottom-24 left-1/4 text-sm">🌷</div>
            <div className="absolute top-1/2 right-8 text-sm">🌺</div>

            {/* Buildings positioned around the island */}
            
            {/* HIV Test Center - TOP - Featured */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10">
              <IsometricBuilding
                icon={<TestTube className="h-full w-full" />}
                name={language === 'th' ? 'ศูนย์ตรวจ' : 'Test Center'}
                description={language === 'th' ? 'รับชุดตรวจ HIV ฟรี!' : 'Get FREE HIV test!'}
                onClick={() => navigate("/hiv-selftest")}
                variant="featured"
                glowing
                badge={language === 'th' ? 'ฟรี' : 'FREE'}
                size="lg"
              />
            </div>

            {/* Clinic - TOP RIGHT */}
            <div className="absolute top-16 right-2 z-10">
              <IsometricBuilding
                icon={<Heart className="h-full w-full" />}
                name={language === 'th' ? 'คลินิกใจ' : 'Wellness'}
                onClick={() => navigate("/self-care")}
                buildingColor="from-pink-100 to-pink-200"
                size="md"
              />
            </div>

            {/* Pharmacy - LEFT */}
            <div className="absolute top-1/3 left-0 z-10">
              <IsometricBuilding
                icon={<Pill className="h-full w-full" />}
                name={language === 'th' ? 'ร้านยา' : 'Pharmacy'}
                description="PrEP & PEP"
                onClick={() => navigate("/dashboard")}
                buildingColor="from-green-100 to-green-200"
                size="md"
              />
            </div>

            {/* Guild Hall / Quest - RIGHT */}
            <div className="absolute top-1/2 right-0 -translate-y-1/2 z-10">
              <IsometricBuilding
                icon={<Trophy className="h-full w-full" />}
                name={language === 'th' ? 'กิลด์' : 'Guild'}
                onClick={() => navigate("/quests")}
                buildingColor="from-amber-100 to-amber-200"
                size="md"
              />
            </div>

            {/* Community/Tavern - BOTTOM LEFT */}
            <div className="absolute bottom-20 left-4 z-10">
              <IsometricBuilding
                icon={<MessageCircle className="h-full w-full" />}
                name={language === 'th' ? 'โรงเตี๊ยม' : 'Tavern'}
                onClick={() => navigate("/community")}
                buildingColor="from-purple-100 to-purple-200"
                size="md"
              />
            </div>

            {/* Library - BOTTOM RIGHT */}
            <div className="absolute bottom-16 right-6 z-10">
              <IsometricBuilding
                icon={<BookOpen className="h-full w-full" />}
                name={language === 'th' ? 'ห้องสมุด' : 'Library'}
                onClick={() => navigate("/info")}
                buildingColor="from-blue-100 to-blue-200"
                size="md"
              />
            </div>

            {/* SWING Center - BOTTOM CENTER */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
              <IsometricBuilding
                icon={<Shield className="h-full w-full" />}
                name="SWING"
                onClick={() => navigate("/swing")}
                buildingColor="from-teal-100 to-teal-200"
                size="sm"
              />
            </div>

            {/* Character sprite in center - clicking goes to avatar customization */}
            <button 
              onClick={() => navigate("/avatar")}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 transition-transform hover:scale-110 active:scale-95"
            >
              <div className="relative">
                {/* Standing shadow */}
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-3 bg-black/20 rounded-full blur-sm" />
                {/* Character */}
                <div className="text-4xl animate-bounce-gentle">
                  🧍
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Welcome message for new users */}
        {isNewUser && (
          <div className="absolute top-4 left-4 right-4 z-30">
            <div className="p-3 rounded-2xl bg-card/95 backdrop-blur-sm border border-primary/20 shadow-lg">
              <p className="text-sm font-bold text-foreground text-center">
                {language === 'th' ? '🎮 ยินดีต้อนรับ! แตะที่ตัวละครเพื่อปรับแต่งอวาตาร์' : '🎮 Welcome! Tap your character to customize avatar'}
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 pb-4 pt-2 text-center safe-bottom">
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