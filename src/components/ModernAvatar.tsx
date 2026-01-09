import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { getUserData, AvatarConfig } from "@/lib/store";
import { useLanguage } from "@/lib/i18n";
import { Flame, Star, TrendingUp } from "lucide-react";

// Avatar customization options
const SKIN_TONES = ["#FFDFC4", "#F0D5BE", "#D1A684", "#A67C52", "#8B5A2B", "#614335"];
const HAIR_STYLES = ["💇", "💇‍♀️", "👨‍🦱", "👩‍🦱", "👨‍🦰", "👩‍🦰", "👱", "👱‍♀️", "🧑‍🦲", "👨‍🦳"];
const BACKGROUNDS = [
  "from-blue-400 to-purple-500",
  "from-pink-400 to-rose-500", 
  "from-green-400 to-teal-500",
  "from-orange-400 to-amber-500",
  "from-indigo-400 to-blue-500",
  "from-purple-400 to-pink-500",
];

interface ModernAvatarProps {
  showStats?: boolean;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  className?: string;
}

export function ModernAvatar({ 
  showStats = true, 
  size = "md", 
  onClick,
  className 
}: ModernAvatarProps) {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const userData = getUserData();

  const sizeConfig = {
    sm: {
      avatar: "h-10 w-10",
      emoji: "text-lg",
      wrapper: "gap-2",
    },
    md: {
      avatar: "h-12 w-12",
      emoji: "text-xl",
      wrapper: "gap-3",
    },
    lg: {
      avatar: "h-16 w-16",
      emoji: "text-3xl",
      wrapper: "gap-4",
    },
  };

  const config = sizeConfig[size];
  const avatarConfig = userData.avatarConfig || { skinTone: 0, hairStyle: 0, outfit: 0, accessory: 0, background: 0 };
  
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate("/avatar");
    }
  };

  const level = userData.level || 1;
  const xp = userData.xp || 0;
  const streak = userData.streak || 0;
  const xpToNextLevel = level * 100;
  const xpProgress = Math.min((xp / xpToNextLevel) * 100, 100);

  return (
    <button 
      onClick={handleClick}
      className={cn(
        "flex items-center transition-all duration-200 active:scale-95",
        config.wrapper,
        className
      )}
    >
      {/* Avatar Circle */}
      <div className={cn(
        "relative rounded-full bg-gradient-to-br flex items-center justify-center shadow-md overflow-hidden",
        BACKGROUNDS[avatarConfig.background % BACKGROUNDS.length],
        config.avatar
      )}>
        {/* Skin base */}
        <div 
          className="absolute inset-[15%] rounded-full"
          style={{ backgroundColor: SKIN_TONES[avatarConfig.skinTone % SKIN_TONES.length] }}
        />
        {/* Hair/emoji overlay */}
        <span className={cn("relative z-10", config.emoji)}>
          {HAIR_STYLES[avatarConfig.hairStyle % HAIR_STYLES.length]}
        </span>
        
        {/* Level badge */}
        <div className="absolute -bottom-0.5 -right-0.5 h-5 w-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold border-2 border-background">
          {level}
        </div>
      </div>

      {/* Stats */}
      {showStats && (
        <div className="flex flex-col gap-1">
          {/* Name and Level */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-foreground">
              {userData.personalInfo?.fullName || (language === 'th' ? 'ผู้เล่น' : 'Player')}
            </span>
          </div>
          
          {/* XP Bar and Streak */}
          <div className="flex items-center gap-2">
            {/* Mini XP Progress */}
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3 text-xp" />
              <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-xp to-warning rounded-full transition-all duration-500"
                  style={{ width: `${xpProgress}%` }}
                />
              </div>
            </div>
            
            {/* Streak */}
            {streak > 0 && (
              <div className="flex items-center gap-0.5 text-streak">
                <Flame className="h-3 w-3" />
                <span className="text-xs font-bold">{streak}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </button>
  );
}
