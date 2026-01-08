import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getUserData, getXPForLevel, AvatarConfig } from "@/lib/store";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Flame, Star, Sparkles } from "lucide-react";

// Avatar customization options - same as AvatarCustomization page
const SKIN_TONES = ['#FFDBB4', '#E8B98D', '#D08B5B', '#AE5D29', '#614335', '#3D2314'];
const HAIR_STYLES = ['🧑', '👨', '👩', '🧔', '👱', '🧒'];
const OUTFITS = ['👕', '👔', '🥋', '🧥', '👗', '🦸'];
const ACCESSORIES = ['✨', '👓', '🎀', '👑', '🌟', '🔥', '💎', '🦋'];
const BACKGROUNDS = [
  'from-sky-200 to-blue-300',
  'from-green-200 to-emerald-300',
  'from-pink-200 to-rose-300',
  'from-purple-200 to-violet-300',
  'from-amber-200 to-orange-300',
  'from-cyan-200 to-teal-300',
  'from-fuchsia-300 to-pink-400',
  'from-yellow-300 via-red-300 to-purple-300',
];

interface GameAvatarProps {
  showStats?: boolean;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  className?: string;
}

export function GameAvatar({ showStats = true, size = "md", onClick, className }: GameAvatarProps) {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [userData, setUserData] = useState(getUserData());
  
  useEffect(() => {
    setUserData(getUserData());
  }, []);

  const config: AvatarConfig = userData.avatarConfig || {
    skinTone: 0,
    hairStyle: 0,
    hairColor: 0,
    outfit: 0,
    accessory: 0,
    background: 0,
  };

  const xpData = getXPForLevel(userData.level || 1);
  const xpPercent = Math.round((xpData.current / xpData.required) * 100);

  const sizeClasses = {
    sm: { container: "w-12 h-14", face: "w-8 h-8 text-xl", outfit: "text-lg" },
    md: { container: "w-16 h-20", face: "w-10 h-10 text-2xl", outfit: "text-2xl" },
    lg: { container: "w-24 h-28", face: "w-14 h-14 text-3xl", outfit: "text-4xl" },
  };

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate("/avatar");
    }
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* Avatar Display */}
      <button
        onClick={handleClick}
        className={cn(
          "relative rounded-2xl overflow-hidden transition-all hover:scale-105 active:scale-95",
          "bg-gradient-to-b shadow-lg border-2 border-card",
          BACKGROUNDS[config.background],
          sizeClasses[size].container
        )}
      >
        {/* Accessory */}
        {config.accessory > 0 && (
          <div className="absolute top-0.5 left-1/2 -translate-x-1/2 text-sm animate-bounce-gentle">
            {ACCESSORIES[config.accessory]}
          </div>
        )}
        
        {/* Face */}
        <div 
          className={cn(
            "absolute top-3 left-1/2 -translate-x-1/2 rounded-full flex items-center justify-center border-2 border-card shadow-sm",
            sizeClasses[size].face
          )}
          style={{ backgroundColor: SKIN_TONES[config.skinTone] }}
        >
          <span style={{ filter: `hue-rotate(${config.hairColor * 40}deg)` }}>
            {HAIR_STYLES[config.hairStyle]}
          </span>
        </div>
        
        {/* Outfit */}
        <div className={cn(
          "absolute bottom-1 left-1/2 -translate-x-1/2",
          sizeClasses[size].outfit
        )}>
          {OUTFITS[config.outfit] || '👕'}
        </div>

        {/* Level badge */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-xp text-[10px] font-bold text-foreground shadow-md border border-card">
          {userData.level || 1}
        </div>

        {/* Edit indicator */}
        <div className="absolute top-0 right-0 p-0.5 rounded-bl-lg bg-card/80">
          <Sparkles className="h-2.5 w-2.5 text-xp" />
        </div>
      </button>

      {/* Stats panel */}
      {showStats && (
        <div className="flex flex-col gap-1.5">
          {/* Level & XP */}
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-xp" />
            <span className="text-sm font-bold text-foreground">
              {language === 'th' ? 'เลเวล' : 'Level'} {userData.level || 1}
            </span>
          </div>
          
          {/* XP Progress */}
          <div className="flex items-center gap-2 min-w-[100px]">
            <Progress value={xpPercent} className="h-2 flex-1" />
            <span className="text-xs text-muted-foreground">
              {xpData.current}/{xpData.required}
            </span>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1">
              <Flame className="h-3.5 w-3.5 text-streak" />
              <span className="font-semibold">{userData.streak || 0}</span>
            </div>
            <div className="flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-xp" />
              <span className="font-semibold">{userData.xp || 0} XP</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}