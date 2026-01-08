import { useState, useEffect } from "react";
import { getUserData, getXPForLevel } from "@/lib/store";
import { useLanguage } from "@/lib/i18n";
import { Flame, Star, Sparkles, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface PlayerAvatarProps {
  size?: "sm" | "md" | "lg";
  showStats?: boolean;
  className?: string;
}

const AVATAR_STYLES = [
  { bg: "from-pink-400 to-rose-500", face: "😊" },
  { bg: "from-blue-400 to-indigo-500", face: "😎" },
  { bg: "from-green-400 to-emerald-500", face: "🌟" },
  { bg: "from-purple-400 to-violet-500", face: "✨" },
  { bg: "from-orange-400 to-amber-500", face: "🔥" },
  { bg: "from-cyan-400 to-teal-500", face: "💎" },
];

export function PlayerAvatar({ size = "md", showStats = false, className }: PlayerAvatarProps) {
  const { language } = useLanguage();
  const [userData, setUserData] = useState(getUserData());
  
  useEffect(() => {
    setUserData(getUserData());
  }, []);

  const avatarIndex = (userData.level || 1) % AVATAR_STYLES.length;
  const avatar = AVATAR_STYLES[avatarIndex];
  const xpData = getXPForLevel(userData.level || 1);
  const xpPercent = Math.round((xpData.current / xpData.required) * 100);

  const sizeClasses = {
    sm: "h-10 w-10 text-lg",
    md: "h-16 w-16 text-2xl",
    lg: "h-24 w-24 text-4xl",
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* Avatar Circle */}
      <div className="relative">
        <div className={cn(
          "flex items-center justify-center rounded-full bg-gradient-to-br shadow-lg border-4 border-card",
          avatar.bg,
          sizeClasses[size]
        )}>
          <span className="drop-shadow-md">{avatar.face}</span>
        </div>
        
        {/* Level badge */}
        <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-xp text-xs font-bold text-foreground shadow-md border-2 border-card">
          {userData.level || 1}
        </div>
      </div>

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
          <div className="flex items-center gap-2 min-w-[120px]">
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
            <div className="flex items-center gap-1">
              <Heart className="h-3.5 w-3.5 text-accent" />
              <span className="font-semibold">{userData.badges?.length || 0}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
