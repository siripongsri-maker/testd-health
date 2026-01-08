import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/lib/i18n";
import { getUserData } from "@/lib/store";
import { TownBuilding, PixelTree, Pond, Fence, PixelRock, PixelCharacter, WalkingVillager, FlyingBird, Butterfly } from "@/components/TownBuilding";
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
} from "lucide-react";
import swingLogo from "@/assets/swing-logo.webp";

export default function TownHub() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [userData, setUserData] = useState(getUserData());
  const [loaded, setLoaded] = useState(false);
  const [timeOfDay, setTimeOfDay] = useState<'day' | 'evening' | 'night'>('day');

  useEffect(() => {
    setUserData(getUserData());
    setLoaded(true);
    const timer = setTimeout(() => playWelcome(), 500);
    
    // Set time of day based on actual time
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 17) setTimeOfDay('day');
    else if (hour >= 17 && hour < 20) setTimeOfDay('evening');
    else setTimeOfDay('night');
    
    return () => clearTimeout(timer);
  }, []);

  const isNewUser = !userData.onboardingComplete;

  const skyGradient = {
    day: "from-sky-400 via-sky-300 to-cyan-200",
    evening: "from-orange-400 via-pink-400 to-purple-500",
    night: "from-indigo-900 via-purple-900 to-slate-900"
  };

  const groundColor = {
    day: "from-green-500 to-green-600",
    evening: "from-green-600 to-green-700",
    night: "from-green-800 to-green-900"
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ fontFamily: "'VT323', monospace", imageRendering: "auto" }}>
      {/* 64-bit style sky with layers */}
      <div className={`absolute inset-0 bg-gradient-to-b ${skyGradient[timeOfDay]} transition-colors duration-1000`} />
      
      {/* Pixel-style sun/moon */}
      {timeOfDay === 'day' && (
        <div className="absolute top-8 right-8 w-12 h-12 bg-yellow-300 rounded-full shadow-[0_0_40px_10px_rgba(253,224,71,0.4)]">
          <div className="absolute inset-1 bg-yellow-200 rounded-full" />
        </div>
      )}
      {timeOfDay === 'evening' && (
        <div className="absolute top-8 right-8 w-14 h-14 bg-orange-400 rounded-full shadow-[0_0_50px_15px_rgba(251,146,60,0.3)]">
          <div className="absolute inset-2 bg-orange-300 rounded-full" />
        </div>
      )}
      {timeOfDay === 'night' && (
        <div className="absolute top-8 right-8 w-10 h-10 bg-gray-200 rounded-full shadow-[0_0_30px_8px_rgba(229,231,235,0.2)]">
          <div className="absolute top-2 left-2 w-3 h-3 bg-gray-400 rounded-full opacity-50" />
          <div className="absolute bottom-2 right-3 w-2 h-2 bg-gray-400 rounded-full opacity-30" />
        </div>
      )}
      
      {/* Animated pixel clouds */}
      <div className="absolute top-10 animate-[slideCloud_30s_linear_infinite]" style={{ left: '-80px' }}>
        <PixelCloud size="lg" />
      </div>
      <div className="absolute top-20 animate-[slideCloud_40s_linear_infinite]" style={{ left: '-60px', animationDelay: '10s' }}>
        <PixelCloud size="md" />
      </div>
      <div className="absolute top-6 animate-[slideCloud_35s_linear_infinite]" style={{ left: '-40px', animationDelay: '20s' }}>
        <PixelCloud size="sm" />
      </div>

      {/* Stars for night */}
      {timeOfDay === 'night' && (
        <>
          {[...Array(20)].map((_, i) => (
            <div 
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
              style={{ 
                left: `${5 + (i * 17) % 90}%`, 
                top: `${5 + (i * 13) % 30}%`,
                animationDelay: `${i * 0.2}s`,
                opacity: 0.5 + Math.random() * 0.5
              }} 
            />
          ))}
        </>
      )}

      {/* Flying Birds */}
      <FlyingBird variant="sparrow" startX={-10} startY={8} speed={0.8} />
      <FlyingBird variant="bluebird" startX={20} startY={15} speed={1.2} />
      <FlyingBird variant="cardinal" startX={-5} startY={12} speed={0.6} />

      {/* Header */}
      <header className="relative z-20 flex items-center justify-between px-3 py-2 safe-top">
        <GameAvatar showStats size="md" />
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 bg-stone-800 text-white hover:bg-stone-700 border-2 border-l-stone-600 border-t-stone-600 border-r-stone-900 border-b-stone-900 rounded-none"
            style={{ boxShadow: "2px 2px 0 #1c1917" }}
            onClick={() => navigate("/personal-info")}
          >
            <User className="h-4 w-4" />
          </Button>
          <LanguageToggle />
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 bg-stone-800 text-white hover:bg-stone-700 border-2 border-l-stone-600 border-t-stone-600 border-r-stone-900 border-b-stone-900 rounded-none"
            style={{ boxShadow: "2px 2px 0 #1c1917" }}
            onClick={() => navigate("/settings")}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Town Name Banner - Pixel style */}
      <div className="relative z-10 text-center py-2">
        <div className="inline-block px-6 py-2 bg-stone-800 border-4 border-l-stone-600 border-t-stone-600 border-r-stone-900 border-b-stone-900"
          style={{ boxShadow: "4px 4px 0 #1c1917" }}>
          <h1 className="text-xl text-yellow-400 tracking-wider flex items-center gap-2">
            <span className="text-2xl">🏰</span>
            {language === 'th' ? 'หมู่บ้าน SWING' : 'SWING Village'}
            <span className="text-2xl">🏰</span>
          </h1>
        </div>
      </div>

      {/* Scrollable Town Map */}
      <main className="relative z-10 flex-1 overflow-auto pb-20">
        <div className={`min-h-[900px] transition-all duration-700 ${loaded ? "opacity-100" : "opacity-0"}`}>
          
          {/* Welcome message */}
          {isNewUser && (
            <div className="mx-4 mb-4 animate-fade-in">
              <div className="p-3 bg-stone-800 border-4 border-l-stone-600 border-t-stone-600 border-r-stone-900 border-b-stone-900"
                style={{ boxShadow: "4px 4px 0 #1c1917" }}>
                <p className="text-sm text-yellow-400 text-center">
                  {language === 'th' ? '🎮 ยินดีต้อนรับนักผจญภัย! แตะอาคารเพื่อสำรวจ' : '🎮 Welcome adventurer! Tap buildings to explore'}
                </p>
              </div>
            </div>
          )}

          {/* Ground layer with path */}
          <div className="relative mx-2 rounded-lg overflow-hidden">
            {/* Grass base */}
            <div className={`absolute inset-0 bg-gradient-to-b ${groundColor[timeOfDay]}`} />
            
            {/* Pixel grass texture */}
            <div className="absolute inset-0 opacity-40" style={{
              backgroundImage: `
                linear-gradient(90deg, transparent 50%, rgba(34,197,94,0.5) 50%),
                linear-gradient(transparent 50%, rgba(22,163,74,0.5) 50%)
              `,
              backgroundSize: '4px 4px'
            }} />

            {/* Main cobblestone path */}
            <div className="absolute top-[200px] left-0 right-0 h-16 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600">
              <div className="absolute inset-0 opacity-60" style={{
                backgroundImage: `
                  radial-gradient(ellipse 12px 8px at center, #b45309 30%, transparent 30%),
                  radial-gradient(ellipse 10px 6px at center, #92400e 30%, transparent 30%)
                `,
                backgroundSize: '20px 12px',
                backgroundPosition: '0 0, 10px 6px'
              }} />
            </div>
            
            {/* Vertical path */}
            <div className="absolute top-[250px] left-1/2 -translate-x-1/2 w-12 h-[300px] bg-gradient-to-b from-amber-500 to-amber-600">
              <div className="absolute inset-0 opacity-50" style={{
                backgroundImage: `radial-gradient(ellipse 8px 10px at center, #b45309 30%, transparent 30%)`,
                backgroundSize: '12px 16px'
              }} />
            </div>

            {/* Content */}
            <div className="relative py-8 px-4 space-y-12">
              
              {/* Row 1: Featured HIV Test Center */}
              <div className="flex flex-col items-center gap-4">
                <div className="flex justify-center items-end gap-3">
                  <PixelTree variant="pine" className="animate-float" style={{ animationDelay: '0s' }} />
                  <PixelTree variant="oak" className="animate-float" style={{ animationDelay: '0.3s' }} />
                </div>
                
                <TownBuilding
                  icon={<TestTube className="h-full w-full" />}
                  name={language === 'th' ? '🏥 ศูนย์ตรวจ HIV' : '🏥 HIV Test Center'}
                  description={language === 'th' ? '✨ รับชุดตรวจฟรี!' : '✨ Get FREE test kit!'}
                  onClick={() => navigate("/hiv-selftest")}
                  variant="featured"
                  badge="FREE"
                  size="lg"
                />
                
                <div className="flex justify-center items-end gap-3">
                  <PixelTree variant="oak" className="animate-float" style={{ animationDelay: '0.6s' }} />
                  <PixelTree variant="pine" className="animate-float" style={{ animationDelay: '0.9s' }} />
                </div>
              </div>

              {/* Row 2: Main buildings */}
              <div className="flex justify-center items-end gap-8 flex-wrap">
                <div className="flex flex-col items-center gap-2">
                  <PixelTree variant="bush" />
                  <TownBuilding
                    icon={<Pill className="h-full w-full" />}
                    name={language === 'th' ? '💊 ร้านยา' : '💊 Pharmacy'}
                    description="PrEP & PEP"
                    onClick={() => navigate("/dashboard")}
                    roofColor="bg-teal-500"
                    wallColor="bg-teal-50"
                    size="md"
                  />
                </div>

                <TownBuilding
                  icon={<Heart className="h-full w-full" />}
                  name={language === 'th' ? '💆 สปาสุขภาพ' : '💆 Wellness Spa'}
                  description={language === 'th' ? 'ดูแลตัวเอง' : 'Self-care'}
                  onClick={() => navigate("/self-care")}
                  roofColor="bg-pink-400"
                  wallColor="bg-pink-50"
                  size="md"
                />

                <div className="flex flex-col items-center gap-2">
                  <PixelTree variant="bush" />
                  <TownBuilding
                    icon={<Trophy className="h-full w-full" />}
                    name={language === 'th' ? '🏆 กิลด์ผจญภัย' : '🏆 Adventure Guild'}
                    description={language === 'th' ? 'ทำภารกิจ' : 'Quests'}
                    onClick={() => navigate("/quests")}
                    roofColor="bg-amber-500"
                    wallColor="bg-amber-50"
                    size="md"
                  />
                </div>
              </div>

              {/* Center area with pond and character */}
              <div className="flex justify-center items-center gap-10 py-6">
                <div className="flex flex-col items-center gap-3">
                  <Pond />
                  <div className="flex gap-2">
                    <PixelRock size="sm" />
                    <PixelTree variant="flower" />
                    <PixelRock size="md" />
                  </div>
                </div>
                
                {/* Player character */}
                <PixelCharacter 
                  onClick={() => {
                    playBuildingTap();
                    navigate("/avatar");
                  }}
                />

                <div className="flex flex-col items-center gap-3">
                  <PixelTree variant="oak" />
                  <div className="flex gap-2">
                    <PixelTree variant="flower" />
                    <PixelRock size="sm" />
                    <PixelTree variant="bush" />
                  </div>
                </div>
              </div>

              {/* Row 3: Secondary buildings */}
              <div className="flex justify-center items-end gap-8 flex-wrap">
                <TownBuilding
                  icon={<MessageCircle className="h-full w-full" />}
                  name={language === 'th' ? '🍺 โรงเตี๊ยม' : '🍺 Tavern'}
                  description={language === 'th' ? 'พูดคุยชุมชน' : 'Community Chat'}
                  onClick={() => navigate("/community")}
                  roofColor="bg-purple-500"
                  wallColor="bg-purple-50"
                  size="md"
                />

                <div className="flex flex-col items-center gap-2">
                  <Fence />
                  <TownBuilding
                    icon={<BookOpen className="h-full w-full" />}
                    name={language === 'th' ? '📚 ห้องสมุด' : '📚 Library'}
                    description={language === 'th' ? 'เรียนรู้ข้อมูล' : 'Learn & Discover'}
                    onClick={() => navigate("/info")}
                    roofColor="bg-blue-500"
                    wallColor="bg-blue-50"
                    size="md"
                  />
                </div>

                <TownBuilding
                  icon={<Shield className="h-full w-full" />}
                  name="🛡️ SWING HQ"
                  description={language === 'th' ? 'เกี่ยวกับเรา' : 'About Us'}
                  onClick={() => navigate("/swing")}
                  roofColor="bg-emerald-500"
                  wallColor="bg-emerald-50"
                  size="md"
                />
              </div>

              {/* Bottom decorations */}
              <div className="flex justify-center items-end gap-4 pt-4 relative">
                <PixelTree variant="pine" />
                <PixelTree variant="flower" />
                <PixelRock size="lg" />
                <PixelTree variant="oak" />
                <PixelTree variant="flower" />
                <PixelTree variant="bush" />
                <PixelRock size="md" />
                <PixelTree variant="pine" />
                <PixelTree variant="flower" />
              </div>

              {/* Walking Villagers */}
              <div className="relative h-16 mt-4">
                <WalkingVillager variant="farmer" direction="right" startX={10} />
                <WalkingVillager variant="merchant" direction="left" startX={80} />
                <WalkingVillager variant="villager" direction="right" startX={40} />
              </div>
            </div>
          </div>

          {/* Butterflies near flowers */}
          <Butterfly color="pink" startX={25} startY={75} />
          <Butterfly color="blue" startX={55} startY={72} />
          <Butterfly color="yellow" startX={70} startY={78} />
          <Butterfly color="purple" startX={40} startY={70} />
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 z-20 py-2 text-center bg-gradient-to-t from-green-800 via-green-700/90 to-transparent safe-bottom">
        <div className="flex items-center justify-center gap-2">
          <span className="text-xs text-white/90">
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

// Pixel-style cloud component
function PixelCloud({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: { w: 40, h: 20, blocks: 3 },
    md: { w: 60, h: 28, blocks: 4 },
    lg: { w: 80, h: 36, blocks: 5 }
  };
  
  const { w, h, blocks } = sizes[size];
  
  return (
    <div className="relative opacity-80" style={{ width: w, height: h, imageRendering: "pixelated" }}>
      <div className="flex items-end gap-0.5">
        {[...Array(blocks)].map((_, i) => (
          <div 
            key={i} 
            className="bg-white rounded-sm"
            style={{ 
              width: 8 + Math.sin(i * 1.5) * 4, 
              height: h * (0.4 + Math.sin(i * 0.8) * 0.3),
              boxShadow: "inset -2px -2px 0 rgba(200,200,200,0.5)"
            }} 
          />
        ))}
      </div>
    </div>
  );
}