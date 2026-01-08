import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/lib/i18n";
import { getUserData, setUserData, AvatarConfig } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Lock, Sparkles, Save, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Avatar customization options
const SKIN_TONES = ['#FFDBB4', '#E8B98D', '#D08B5B', '#AE5D29', '#614335', '#3D2314'];
const HAIR_STYLES = ['🧑', '👨', '👩', '🧔', '👱', '🧒'];
const HAIR_COLORS = ['#2C1810', '#4A3728', '#8B4513', '#D4A574', '#FFD700', '#FF6B6B', '#9B59B6', '#3498DB'];
const OUTFITS = [
  { emoji: '👕', name: 'T-Shirt', level: 1 },
  { emoji: '👔', name: 'Shirt', level: 2 },
  { emoji: '🥋', name: 'Uniform', level: 3 },
  { emoji: '🧥', name: 'Jacket', level: 5 },
  { emoji: '👗', name: 'Dress', level: 7 },
  { emoji: '🦸', name: 'Hero Cape', level: 10 },
];
const ACCESSORIES = [
  { emoji: '✨', name: 'None', level: 1 },
  { emoji: '👓', name: 'Glasses', level: 2 },
  { emoji: '🎀', name: 'Bow', level: 3 },
  { emoji: '👑', name: 'Crown', level: 5 },
  { emoji: '🌟', name: 'Star Halo', level: 8 },
  { emoji: '🔥', name: 'Fire Aura', level: 10 },
  { emoji: '💎', name: 'Diamond', level: 15 },
  { emoji: '🦋', name: 'Butterfly Wings', level: 20 },
];
const BACKGROUNDS = [
  { gradient: 'from-sky-200 to-blue-300', name: 'Sky', level: 1 },
  { gradient: 'from-green-200 to-emerald-300', name: 'Forest', level: 2 },
  { gradient: 'from-pink-200 to-rose-300', name: 'Sakura', level: 3 },
  { gradient: 'from-purple-200 to-violet-300', name: 'Twilight', level: 5 },
  { gradient: 'from-amber-200 to-orange-300', name: 'Sunset', level: 7 },
  { gradient: 'from-cyan-200 to-teal-300', name: 'Ocean', level: 10 },
  { gradient: 'from-fuchsia-300 to-pink-400', name: 'Magic', level: 15 },
  { gradient: 'from-yellow-300 via-red-300 to-purple-300', name: 'Rainbow', level: 20 },
];

export default function AvatarCustomization() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [config, setConfig] = useState<AvatarConfig>({
    skinTone: 0,
    hairStyle: 0,
    hairColor: 0,
    outfit: 0,
    accessory: 0,
    background: 0,
  });
  const [userLevel, setUserLevel] = useState(1);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'body' | 'outfit' | 'accessory' | 'background'>('body');

  useEffect(() => {
    const userData = getUserData();
    setUserLevel(userData.level || 1);
    if (userData.avatarConfig) {
      setConfig(userData.avatarConfig);
    }
  }, []);

  const handleSave = () => {
    setUserData({ avatarConfig: config });
    setSaved(true);
    toast.success(language === 'th' ? 'บันทึกอวาตาร์สำเร็จ!' : 'Avatar saved!');
    setTimeout(() => setSaved(false), 2000);
  };

  const tabs = [
    { key: 'body', labelTh: '👤 ร่างกาย', labelEn: '👤 Body' },
    { key: 'outfit', labelTh: '👕 ชุด', labelEn: '👕 Outfit' },
    { key: 'accessory', labelTh: '✨ เครื่องประดับ', labelEn: '✨ Accessory' },
    { key: 'background', labelTh: '🎨 พื้นหลัง', labelEn: '🎨 Background' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-100 via-pink-50 to-sky-100 dark:from-slate-900 dark:via-purple-950 dark:to-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-20 backdrop-blur-lg bg-background/80 border-b border-border/50 px-4 py-3 safe-top">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold text-foreground">
              {language === 'th' ? 'ปรับแต่งอวาตาร์' : 'Customize Avatar'}
            </h1>
          </div>
          <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-xp/20 text-xp">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-bold">Lv.{userLevel}</span>
          </div>
        </div>
      </header>

      {/* Avatar Preview */}
      <div className="px-4 py-6">
        <div className={cn(
          "relative mx-auto w-48 h-64 rounded-3xl overflow-hidden shadow-xl border-4 border-card",
          "bg-gradient-to-b",
          BACKGROUNDS[config.background].gradient
        )}>
          {/* Character body */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {/* Accessory (top) */}
            {config.accessory > 0 && (
              <div className="absolute top-4 text-4xl animate-bounce-gentle">
                {ACCESSORIES[config.accessory].emoji}
              </div>
            )}
            
            {/* Face with skin tone */}
            <div 
              className="w-20 h-20 rounded-full flex items-center justify-center text-5xl shadow-lg border-4 border-card"
              style={{ backgroundColor: SKIN_TONES[config.skinTone] }}
            >
              <span style={{ filter: `hue-rotate(${config.hairColor * 40}deg)` }}>
                {HAIR_STYLES[config.hairStyle]}
              </span>
            </div>
            
            {/* Body/Outfit */}
            <div className="mt-2 text-6xl">
              {OUTFITS[config.outfit].emoji}
            </div>
            
            {/* Level badge */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-card/90 text-xs font-bold shadow-md">
              Lv.{userLevel}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 mb-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all",
                activeTab === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground"
              )}
            >
              {language === 'th' ? tab.labelTh : tab.labelEn}
            </button>
          ))}
        </div>
      </div>

      {/* Options */}
      <main className="px-4 pb-32">
        {activeTab === 'body' && (
          <div className="space-y-6">
            {/* Skin Tone */}
            <div className="space-y-3">
              <h3 className="font-bold text-foreground">
                {language === 'th' ? 'สีผิว' : 'Skin Tone'}
              </h3>
              <div className="flex gap-3 flex-wrap">
                {SKIN_TONES.map((color, i) => (
                  <button
                    key={i}
                    onClick={() => setConfig({ ...config, skinTone: i })}
                    className={cn(
                      "w-12 h-12 rounded-full border-4 transition-transform hover:scale-110",
                      config.skinTone === i ? "border-primary scale-110" : "border-card"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Hair Style */}
            <div className="space-y-3">
              <h3 className="font-bold text-foreground">
                {language === 'th' ? 'ทรงผม' : 'Hair Style'}
              </h3>
              <div className="flex gap-3 flex-wrap">
                {HAIR_STYLES.map((emoji, i) => (
                  <button
                    key={i}
                    onClick={() => setConfig({ ...config, hairStyle: i })}
                    className={cn(
                      "w-14 h-14 rounded-xl bg-card text-3xl flex items-center justify-center border-2 transition-all hover:scale-110",
                      config.hairStyle === i ? "border-primary scale-110" : "border-border"
                    )}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Hair Color */}
            <div className="space-y-3">
              <h3 className="font-bold text-foreground">
                {language === 'th' ? 'สีผม' : 'Hair Color'}
              </h3>
              <div className="flex gap-3 flex-wrap">
                {HAIR_COLORS.map((color, i) => (
                  <button
                    key={i}
                    onClick={() => setConfig({ ...config, hairColor: i })}
                    className={cn(
                      "w-10 h-10 rounded-full border-4 transition-transform hover:scale-110",
                      config.hairColor === i ? "border-primary scale-110" : "border-card"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'outfit' && (
          <div className="grid grid-cols-3 gap-3">
            {OUTFITS.map((outfit, i) => {
              const locked = userLevel < outfit.level;
              return (
                <button
                  key={i}
                  onClick={() => !locked && setConfig({ ...config, outfit: i })}
                  disabled={locked}
                  className={cn(
                    "relative p-4 rounded-2xl bg-card border-2 flex flex-col items-center gap-2 transition-all",
                    locked ? "opacity-50 cursor-not-allowed" : "hover:scale-105",
                    config.outfit === i ? "border-primary" : "border-border"
                  )}
                >
                  {locked && (
                    <div className="absolute inset-0 flex items-center justify-center bg-card/80 rounded-2xl">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Lock className="h-3 w-3" />
                        Lv.{outfit.level}
                      </div>
                    </div>
                  )}
                  <span className="text-4xl">{outfit.emoji}</span>
                  <span className="text-xs font-medium text-muted-foreground">{outfit.name}</span>
                </button>
              );
            })}
          </div>
        )}

        {activeTab === 'accessory' && (
          <div className="grid grid-cols-4 gap-3">
            {ACCESSORIES.map((acc, i) => {
              const locked = userLevel < acc.level;
              return (
                <button
                  key={i}
                  onClick={() => !locked && setConfig({ ...config, accessory: i })}
                  disabled={locked}
                  className={cn(
                    "relative p-3 rounded-xl bg-card border-2 flex flex-col items-center gap-1 transition-all",
                    locked ? "opacity-50 cursor-not-allowed" : "hover:scale-105",
                    config.accessory === i ? "border-primary" : "border-border"
                  )}
                >
                  {locked && (
                    <div className="absolute inset-0 flex items-center justify-center bg-card/80 rounded-xl">
                      <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                        <Lock className="h-2.5 w-2.5" />
                        {acc.level}
                      </div>
                    </div>
                  )}
                  <span className="text-2xl">{acc.emoji}</span>
                  <span className="text-[10px] font-medium text-muted-foreground truncate w-full text-center">
                    {acc.name}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {activeTab === 'background' && (
          <div className="grid grid-cols-2 gap-3">
            {BACKGROUNDS.map((bg, i) => {
              const locked = userLevel < bg.level;
              return (
                <button
                  key={i}
                  onClick={() => !locked && setConfig({ ...config, background: i })}
                  disabled={locked}
                  className={cn(
                    "relative h-24 rounded-2xl border-2 flex items-center justify-center transition-all overflow-hidden",
                    "bg-gradient-to-br",
                    bg.gradient,
                    locked ? "opacity-50 cursor-not-allowed" : "hover:scale-105",
                    config.background === i ? "border-primary border-4" : "border-transparent"
                  )}
                >
                  {locked && (
                    <div className="absolute inset-0 flex items-center justify-center bg-card/80">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Lock className="h-4 w-4" />
                        Lv.{bg.level}
                      </div>
                    </div>
                  )}
                  {!locked && (
                    <span className="text-sm font-bold text-foreground/80 drop-shadow-md">
                      {bg.name}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </main>

      {/* Save Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent safe-bottom">
        <Button
          onClick={handleSave}
          className="w-full h-12 text-base font-bold gap-2"
          disabled={saved}
        >
          {saved ? (
            <>
              <CheckCircle className="h-5 w-5" />
              {language === 'th' ? 'บันทึกแล้ว!' : 'Saved!'}
            </>
          ) : (
            <>
              <Save className="h-5 w-5" />
              {language === 'th' ? 'บันทึกอวาตาร์' : 'Save Avatar'}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}