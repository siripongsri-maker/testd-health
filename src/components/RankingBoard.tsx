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

export function RankingBoard({ compact = false }: RankingBoardProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);
  const [currentUserData, setCurrentUserData] = useState<RankedUser | null>(null);
  const [totalUsers, setTotalUsers] = useState(0);
  const [activePlayers, setActivePlayers] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRankings();
  }, [user]);

  const fetchRankings = async () => {
    setLoading(true);
    
    // Fetch total members from user_roles (unique users) - synced with home page
    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('user_id');
    
    if (rolesData) {
      const uniqueUsers = new Set(rolesData.map(r => r.user_id));
      setTotalUsers(uniqueUsers.size);
    }
    
    // Fetch active players (users who earned XP in last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { count: activeCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gt('xp', 0)
      .gte('updated_at', sevenDaysAgo.toISOString());
    
    setActivePlayers(activeCount || 0);

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

  // Calculate knowledge percentage based on XP (max tier is Legend at 7000+ XP)
  const getKnowledgePercentage = (xp: number) => {
    const maxXP = 7000; // Legend tier threshold
    return Math.min(Math.round((xp / maxXP) * 100), 100);
  };

  if (loading) {
    return (
      <Card className="p-4 animate-pulse">
        <div className="h-6 bg-muted rounded w-1/3 mb-3"></div>
        <div className="h-16 bg-muted rounded"></div>
      </Card>
    );
  }

  const tier = currentUserData ? getTierByXP(currentUserData.xp || 0) : TIERS[0];
  const TierIcon = tier.icon;
  const knowledgePercent = currentUserData ? getKnowledgePercentage(currentUserData.xp || 0) : 0;

  if (compact) {
    return (
      <Card className="p-4 bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200/50">
        <div className="flex items-center gap-3">
          {/* Tier Icon */}
          <div className={`w-14 h-14 rounded-full ${tier.bgColor} ${tier.borderColor} border-2 flex items-center justify-center`}>
            <TierIcon className={`h-7 w-7 ${tier.color}`} />
          </div>
          
          {/* Rank Info */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="h-4 w-4 text-amber-500" />
              <span className="font-bold text-lg">
                {currentUserRank ? `#${currentUserRank}` : '-'}
              </span>
              <span className="text-muted-foreground text-sm">
                {language === 'th' ? `จาก ${totalUsers} คน` : `from ${totalUsers} users`}
              </span>
              <span className="text-xs text-green-600 dark:text-green-400">
                • {activePlayers} {language === 'th' ? 'แอคทีฟ' : 'active'}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {language === 'th' ? tier.nameTh : tier.nameEn} • {currentUserData?.xp || 0} XP
            </p>
            
            {/* Knowledge Progress */}
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">
                  {language === 'th' ? 'ความรู้ปกป้องตนเอง' : 'Self-protection knowledge'}
                </span>
                <span className="font-bold text-primary">{knowledgePercent}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-amber-500 rounded-full transition-all duration-500"
                  style={{ width: `${knowledgePercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="font-bold text-lg flex items-center gap-2 mb-6">
        <Trophy className="h-5 w-5 text-amber-500" />
        {language === 'th' ? 'อันดับของคุณ' : 'Your Rank'}
      </h3>

      {/* Main Rank Display */}
      <div className="text-center mb-6">
        <div className={`w-24 h-24 mx-auto rounded-full ${tier.bgColor} ${tier.borderColor} border-4 flex items-center justify-center mb-4`}>
          <TierIcon className={`h-12 w-12 ${tier.color}`} />
        </div>
        
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-4xl font-bold text-primary">
            #{currentUserRank || '-'}
          </span>
        </div>
        <p className="text-muted-foreground">
          {language === 'th' ? `จากผู้ใช้ทั้งหมด ${totalUsers} คน` : `from ${totalUsers} total users`}
        </p>
      </div>

      {/* Tier Info */}
      <div className="bg-muted/30 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium">{language === 'th' ? 'ระดับปัจจุบัน' : 'Current Tier'}</span>
          <Badge className={`${tier.bgColor} ${tier.color} ${tier.borderColor} border`}>
            {language === 'th' ? tier.nameTh : tier.nameEn}
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">XP</span>
          <span className="font-bold text-primary">{(currentUserData?.xp || 0).toLocaleString()}</span>
        </div>
      </div>

      {/* Knowledge Progress */}
      <div className="bg-gradient-to-r from-primary/10 to-amber-500/10 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium">
            {language === 'th' ? 'ความรู้ในการปกป้องตนเองและชุมชน' : 'Knowledge to protect yourself & community'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${knowledgePercent}%` }}
            />
          </div>
          <span className="font-bold text-lg text-primary">{knowledgePercent}%</span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {language === 'th' 
            ? 'เรียนรู้เพิ่มเติมเพื่อปลดล็อคความรู้และปกป้องชุมชน' 
            : 'Learn more to unlock knowledge and protect your community'}
        </p>
      </div>

      {/* Tier Legend */}
      <div className="mt-6">
        <p className="text-sm font-medium mb-3">{language === 'th' ? 'ระดับทั้งหมด' : 'All Tiers'}</p>
        <div className="flex flex-wrap gap-1.5">
          {TIERS.map(t => {
            const Icon = t.icon;
            const isCurrentTier = t.id === tier.id;
            return (
              <Badge 
                key={t.id} 
                variant="outline" 
                className={`${t.bgColor} ${t.borderColor} ${t.color} text-xs ${isCurrentTier ? 'ring-2 ring-primary' : ''}`}
              >
                <Icon className="h-3 w-3 mr-1" />
                {language === 'th' ? t.nameTh : t.nameEn}
              </Badge>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
