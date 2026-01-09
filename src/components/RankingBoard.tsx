import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, Shield, Star, Award, Trophy } from "lucide-react";

// Tier definitions with XP thresholds
export const TIERS = [
  { 
    id: 'starter', 
    nameTh: 'ผู้เริ่มต้น', 
    nameEn: 'Starter', 
    minXP: 0, 
    maxXP: 499,
    icon: Star,
    color: 'text-slate-500',
    bgColor: 'bg-slate-100',
    borderColor: 'border-slate-300',
  },
  { 
    id: 'advocate', 
    nameTh: 'ผู้สนับสนุน', 
    nameEn: 'Advocate', 
    minXP: 500, 
    maxXP: 1499,
    icon: Shield,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-300',
  },
  { 
    id: 'guardian', 
    nameTh: 'ผู้พิทักษ์', 
    nameEn: 'Guardian', 
    minXP: 1500, 
    maxXP: 3499,
    icon: Award,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
  },
  { 
    id: 'hero', 
    nameTh: 'ฮีโร่', 
    nameEn: 'Hero', 
    minXP: 3500, 
    maxXP: 6999,
    icon: Trophy,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-300',
  },
  { 
    id: 'legend', 
    nameTh: 'ตำนาน', 
    nameEn: 'Legend', 
    minXP: 7000, 
    maxXP: Infinity,
    icon: Crown,
    color: 'text-amber-500',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-300',
  },
];

export function getTierByXP(xp: number) {
  return TIERS.find(tier => xp >= tier.minXP && xp <= tier.maxXP) || TIERS[0];
}

interface RankedUser {
  id: string;
  display_name: string | null;
  xp: number;
  level: number;
  avatar_url: string | null;
}

interface RankingBoardProps {
  compact?: boolean;
  maxUsers?: number;
}

export function RankingBoard({ compact = false, maxUsers = 5 }: RankingBoardProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [topUsers, setTopUsers] = useState<RankedUser[]>([]);
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);
  const [currentUserData, setCurrentUserData] = useState<RankedUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRankings();
  }, [user]);

  const fetchRankings = async () => {
    setLoading(true);
    
    // Fetch top users by XP
    const { data: rankings } = await supabase
      .from('profiles')
      .select('id, display_name, xp, level, avatar_url')
      .order('xp', { ascending: false })
      .limit(maxUsers);
    
    if (rankings) {
      setTopUsers(rankings);
    }

    // Fetch current user's rank
    if (user) {
      const { data: allUsers } = await supabase
        .from('profiles')
        .select('id, xp')
        .order('xp', { ascending: false });
      
      if (allUsers) {
        const rank = allUsers.findIndex(u => u.id === user.id) + 1;
        setCurrentUserRank(rank > 0 ? rank : null);
      }

      const { data: userData } = await supabase
        .from('profiles')
        .select('id, display_name, xp, level, avatar_url')
        .eq('id', user.id)
        .maybeSingle();
      
      if (userData) {
        setCurrentUserData(userData);
      }
    }
    
    setLoading(false);
  };

  if (loading) {
    return (
      <Card className="p-4 animate-pulse">
        <div className="h-6 bg-muted rounded w-1/3 mb-3"></div>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-10 bg-muted rounded"></div>
          ))}
        </div>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card className="p-3 bg-gradient-to-br from-amber-50/50 to-orange-50/50 border-amber-200/50">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-sm flex items-center gap-1.5">
            <Trophy className="h-4 w-4 text-amber-500" />
            {language === 'th' ? 'อันดับ' : 'Ranking'}
          </h3>
          {currentUserRank && currentUserData && (
            <Badge variant="secondary" className="text-xs">
              #{currentUserRank} • {currentUserData.xp || 0} XP
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {topUsers.slice(0, 5).map((rankedUser, index) => {
            const tier = getTierByXP(rankedUser.xp || 0);
            const TierIcon = tier.icon;
            const isCurrentUser = user?.id === rankedUser.id;
            
            return (
              <div
                key={rankedUser.id}
                className={`flex-shrink-0 flex flex-col items-center p-1.5 rounded-lg transition-all ${
                  isCurrentUser ? 'bg-primary/10 ring-1 ring-primary/30' : ''
                }`}
              >
                <div className={`relative w-8 h-8 rounded-full ${tier.bgColor} ${tier.borderColor} border-2 flex items-center justify-center`}>
                  <TierIcon className={`h-4 w-4 ${tier.color}`} />
                  {index < 3 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {index + 1}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[40px]">
                  {rankedUser.display_name?.split(' ')[0] || 'User'}
                </span>
              </div>
            );
          })}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <h3 className="font-bold text-lg flex items-center gap-2 mb-4">
        <Trophy className="h-5 w-5 text-amber-500" />
        {language === 'th' ? 'กระดานอันดับ' : 'Leaderboard'}
      </h3>

      {/* Tier Legend */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {TIERS.map(tier => {
          const TierIcon = tier.icon;
          return (
            <Badge key={tier.id} variant="outline" className={`${tier.bgColor} ${tier.borderColor} ${tier.color} text-xs`}>
              <TierIcon className="h-3 w-3 mr-1" />
              {language === 'th' ? tier.nameTh : tier.nameEn}
            </Badge>
          );
        })}
      </div>

      {/* Rankings List */}
      <div className="space-y-2">
        {topUsers.map((rankedUser, index) => {
          const tier = getTierByXP(rankedUser.xp || 0);
          const TierIcon = tier.icon;
          const isCurrentUser = user?.id === rankedUser.id;
          
          return (
            <div
              key={rankedUser.id}
              className={`flex items-center gap-3 p-2 rounded-lg transition-all ${
                isCurrentUser 
                  ? 'bg-primary/10 ring-1 ring-primary/30' 
                  : 'bg-muted/30 hover:bg-muted/50'
              }`}
            >
              {/* Rank Number */}
              <div className={`w-7 h-7 flex items-center justify-center rounded-full font-bold text-sm ${
                index === 0 ? 'bg-amber-400 text-white' :
                index === 1 ? 'bg-slate-400 text-white' :
                index === 2 ? 'bg-orange-400 text-white' :
                'bg-muted text-muted-foreground'
              }`}>
                {index + 1}
              </div>

              {/* Tier Badge */}
              <div className={`w-8 h-8 rounded-full ${tier.bgColor} ${tier.borderColor} border-2 flex items-center justify-center`}>
                <TierIcon className={`h-4 w-4 ${tier.color}`} />
              </div>

              {/* User Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {rankedUser.display_name || (language === 'th' ? 'ผู้ใช้' : 'User')}
                  {isCurrentUser && <span className="text-primary ml-1">({language === 'th' ? 'คุณ' : 'You'})</span>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {language === 'th' ? tier.nameTh : tier.nameEn} • Lv.{rankedUser.level || 1}
                </p>
              </div>

              {/* XP */}
              <div className="text-right">
                <p className="font-bold text-sm text-primary">{(rankedUser.xp || 0).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">XP</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Current User (if not in top) */}
      {currentUserRank && currentUserRank > maxUsers && currentUserData && (
        <>
          <div className="my-2 text-center text-muted-foreground text-xs">• • •</div>
          <div className="flex items-center gap-3 p-2 rounded-lg bg-primary/10 ring-1 ring-primary/30">
            <div className="w-7 h-7 flex items-center justify-center rounded-full bg-muted text-muted-foreground font-bold text-sm">
              {currentUserRank}
            </div>
            <div className={`w-8 h-8 rounded-full ${getTierByXP(currentUserData.xp || 0).bgColor} ${getTierByXP(currentUserData.xp || 0).borderColor} border-2 flex items-center justify-center`}>
              {(() => {
                const tier = getTierByXP(currentUserData.xp || 0);
                const TierIcon = tier.icon;
                return <TierIcon className={`h-4 w-4 ${tier.color}`} />;
              })()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">
                {currentUserData.display_name || (language === 'th' ? 'คุณ' : 'You')}
                <span className="text-primary ml-1">({language === 'th' ? 'คุณ' : 'You'})</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {language === 'th' ? getTierByXP(currentUserData.xp || 0).nameTh : getTierByXP(currentUserData.xp || 0).nameEn}
              </p>
            </div>
            <div className="text-right">
              <p className="font-bold text-sm text-primary">{(currentUserData.xp || 0).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">XP</p>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
