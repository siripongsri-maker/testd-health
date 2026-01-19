import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TIERS, getTierByXP } from "@/components/RankingBoard";
import { Crown, Trophy, Medal, TrendingUp, Users, Sparkles } from "lucide-react";

interface RankedUser {
  id: string;
  display_name: string | null;
  xp: number;
  level: number;
  avatar_url: string | null;
}

export default function Leaderboard() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [allUsers, setAllUsers] = useState<RankedUser[]>([]);
  const [totalMembers, setTotalMembers] = useState<number>(0);
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);
  const [currentUserData, setCurrentUserData] = useState<RankedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTier, setSelectedTier] = useState<string>('all');

  useEffect(() => {
    fetchAllRankings();
  }, [user]);

  const fetchAllRankings = async () => {
    setLoading(true);
    
    // Fetch total members from user_roles (unique users)
    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('user_id');
    
    if (rolesData) {
      const uniqueUsers = new Set(rolesData.map(r => r.user_id));
      setTotalMembers(uniqueUsers.size);
    }
    
    // Use the secure leaderboard_profiles view (excludes sensitive health data)
    const { data: rankings } = await supabase
      .from('leaderboard_profiles')
      .select('id, display_name, xp, level, avatar_url')
      .order('xp', { ascending: false });
    
    if (rankings) {
      setAllUsers(rankings);
      
      if (user) {
        const rank = rankings.findIndex(u => u.id === user.id) + 1;
        setCurrentUserRank(rank > 0 ? rank : null);
        const userData = rankings.find(u => u.id === user.id);
        if (userData) setCurrentUserData(userData);
      }
    }
    
    setLoading(false);
  };

  const filteredUsers = selectedTier === 'all' 
    ? allUsers 
    : allUsers.filter(u => getTierByXP(u.xp || 0).id === selectedTier);

  const tierCounts = TIERS.map(tier => ({
    ...tier,
    count: allUsers.filter(u => getTierByXP(u.xp || 0).id === tier.id).length
  }));

  const getRankBadge = (index: number) => {
    if (index === 0) return <Crown className="h-5 w-5 text-amber-400" />;
    if (index === 1) return <Medal className="h-5 w-5 text-slate-400" />;
    if (index === 2) return <Medal className="h-5 w-5 text-orange-400" />;
    return null;
  };

  if (loading) {
    return (
      <PageContainer>
        <PageHeader 
          title={language === 'th' ? 'กระดานอันดับ' : 'Leaderboard'} 
          backTo="/"
        />
        <div className="p-4 space-y-4">
          <div className="animate-pulse space-y-3">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader 
        title={language === 'th' ? 'กระดานอันดับ' : 'Leaderboard'} 
        backTo="/"
      />
      
      <div className="p-4 space-y-4 pb-24">
        {/* Stats Summary */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-3 bg-gradient-to-br from-primary/10 to-primary/5">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{totalMembers}</p>
                <p className="text-xs text-muted-foreground">
                  {language === 'th' ? 'สมาชิกทั้งหมด' : 'Total Members'}
                </p>
              </div>
            </div>
          </Card>
          
          {currentUserRank && currentUserData && (
            <Card className="p-3 bg-gradient-to-br from-amber-100/50 to-orange-100/50">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="text-2xl font-bold">#{currentUserRank}</p>
                  <p className="text-xs text-muted-foreground">
                    {language === 'th' ? 'อันดับของคุณ' : 'Your Rank'}
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Tier Distribution */}
        <Card className="p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {language === 'th' ? 'การกระจายตามระดับ' : 'Tier Distribution'}
          </h3>
          <div className="flex flex-wrap gap-2">
            {tierCounts.map(tier => {
              const TierIcon = tier.icon;
              return (
                <button
                  key={tier.id}
                  onClick={() => setSelectedTier(selectedTier === tier.id ? 'all' : tier.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all ${
                    selectedTier === tier.id 
                      ? `${tier.bgColor} ${tier.borderColor} border-2 ${tier.color}` 
                      : 'bg-muted/50 hover:bg-muted'
                  }`}
                >
                  <TierIcon className={`h-4 w-4 ${tier.color}`} />
                  <span className="font-medium">{tier.count}</span>
                </button>
              );
            })}
            {selectedTier !== 'all' && (
              <button
                onClick={() => setSelectedTier('all')}
                className="px-3 py-1.5 rounded-full text-sm bg-muted hover:bg-muted/80 transition-all"
              >
                {language === 'th' ? 'แสดงทั้งหมด' : 'Show All'}
              </button>
            )}
          </div>
        </Card>

        {/* Top 3 Podium */}
        {selectedTier === 'all' && filteredUsers.length >= 3 && (
          <Card className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
            <h3 className="font-semibold mb-4 text-center flex items-center justify-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              {language === 'th' ? 'Top 3' : 'Top 3'}
            </h3>
            <div className="flex items-end justify-center gap-2">
              {/* 2nd Place */}
              <div className="flex flex-col items-center">
                <div className={`w-14 h-14 rounded-full ${getTierByXP(filteredUsers[1]?.xp || 0).bgColor} ${getTierByXP(filteredUsers[1]?.xp || 0).borderColor} border-2 flex items-center justify-center mb-1`}>
                  {(() => {
                    const tier = getTierByXP(filteredUsers[1]?.xp || 0);
                    const TierIcon = tier.icon;
                    return <TierIcon className={`h-6 w-6 ${tier.color}`} />;
                  })()}
                </div>
                <p className="text-xs font-medium truncate max-w-[70px] text-center">
                  {filteredUsers[1]?.display_name || 'User'}
                </p>
                <p className="text-xs text-muted-foreground">{(filteredUsers[1]?.xp || 0).toLocaleString()} XP</p>
                <div className="w-16 h-16 bg-slate-300 rounded-t-lg mt-2 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">2</span>
                </div>
              </div>
              
              {/* 1st Place */}
              <div className="flex flex-col items-center -mt-4">
                <Crown className="h-6 w-6 text-amber-400 mb-1" />
                <div className={`w-16 h-16 rounded-full ${getTierByXP(filteredUsers[0]?.xp || 0).bgColor} ${getTierByXP(filteredUsers[0]?.xp || 0).borderColor} border-3 flex items-center justify-center mb-1 ring-2 ring-amber-400`}>
                  {(() => {
                    const tier = getTierByXP(filteredUsers[0]?.xp || 0);
                    const TierIcon = tier.icon;
                    return <TierIcon className={`h-7 w-7 ${tier.color}`} />;
                  })()}
                </div>
                <p className="text-sm font-bold truncate max-w-[80px] text-center">
                  {filteredUsers[0]?.display_name || 'User'}
                </p>
                <p className="text-xs text-amber-600 font-medium">{(filteredUsers[0]?.xp || 0).toLocaleString()} XP</p>
                <div className="w-20 h-24 bg-amber-400 rounded-t-lg mt-2 flex items-center justify-center">
                  <span className="text-3xl font-bold text-white">1</span>
                </div>
              </div>
              
              {/* 3rd Place */}
              <div className="flex flex-col items-center">
                <div className={`w-14 h-14 rounded-full ${getTierByXP(filteredUsers[2]?.xp || 0).bgColor} ${getTierByXP(filteredUsers[2]?.xp || 0).borderColor} border-2 flex items-center justify-center mb-1`}>
                  {(() => {
                    const tier = getTierByXP(filteredUsers[2]?.xp || 0);
                    const TierIcon = tier.icon;
                    return <TierIcon className={`h-6 w-6 ${tier.color}`} />;
                  })()}
                </div>
                <p className="text-xs font-medium truncate max-w-[70px] text-center">
                  {filteredUsers[2]?.display_name || 'User'}
                </p>
                <p className="text-xs text-muted-foreground">{(filteredUsers[2]?.xp || 0).toLocaleString()} XP</p>
                <div className="w-16 h-12 bg-orange-400 rounded-t-lg mt-2 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">3</span>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Full Rankings List */}
        <Card className="p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" />
            {selectedTier === 'all' 
              ? (language === 'th' ? 'อันดับทั้งหมด' : 'All Rankings')
              : (language === 'th' 
                  ? `อันดับ ${TIERS.find(t => t.id === selectedTier)?.nameTh}` 
                  : `${TIERS.find(t => t.id === selectedTier)?.nameEn} Tier`
                )
            }
            <Badge variant="secondary" className="ml-auto">
              {filteredUsers.length} {language === 'th' ? 'คน' : 'users'}
            </Badge>
          </h3>
          
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {filteredUsers.map((rankedUser, index) => {
              const tier = getTierByXP(rankedUser.xp || 0);
              const TierIcon = tier.icon;
              const isCurrentUser = user?.id === rankedUser.id;
              const globalRank = allUsers.findIndex(u => u.id === rankedUser.id) + 1;
              
              return (
                <div
                  key={rankedUser.id}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                    isCurrentUser 
                      ? 'bg-primary/10 ring-2 ring-primary/30' 
                      : 'bg-muted/30 hover:bg-muted/50'
                  }`}
                >
                  {/* Rank */}
                  <div className="flex items-center gap-1 w-12">
                    {getRankBadge(globalRank - 1)}
                    <span className={`font-bold ${globalRank <= 3 ? 'text-lg' : 'text-sm text-muted-foreground'}`}>
                      #{globalRank}
                    </span>
                  </div>

                  {/* Tier Icon */}
                  <div className={`w-10 h-10 rounded-full ${tier.bgColor} ${tier.borderColor} border-2 flex items-center justify-center flex-shrink-0`}>
                    <TierIcon className={`h-5 w-5 ${tier.color}`} />
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {rankedUser.display_name || (language === 'th' ? 'ผู้ใช้' : 'User')}
                      {isCurrentUser && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          {language === 'th' ? 'คุณ' : 'You'}
                        </Badge>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {language === 'th' ? tier.nameTh : tier.nameEn} • Lv.{rankedUser.level || 1}
                    </p>
                  </div>

                  {/* XP */}
                  <div className="text-right">
                    <p className="font-bold text-primary">{(rankedUser.xp || 0).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">XP</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Tier Explainer */}
        <Card className="p-4">
          <h3 className="font-semibold mb-3">
            {language === 'th' ? 'ระดับ XP' : 'XP Tiers'}
          </h3>
          <div className="space-y-2">
            {TIERS.map(tier => {
              const TierIcon = tier.icon;
              const userTier = currentUserData ? getTierByXP(currentUserData.xp || 0) : null;
              const isCurrentTier = userTier?.id === tier.id;
              
              return (
                <div 
                  key={tier.id}
                  className={`flex items-center gap-3 p-2 rounded-lg ${
                    isCurrentTier ? 'bg-primary/10 ring-1 ring-primary/30' : 'bg-muted/20'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full ${tier.bgColor} ${tier.borderColor} border flex items-center justify-center`}>
                    <TierIcon className={`h-4 w-4 ${tier.color}`} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {language === 'th' ? tier.nameTh : tier.nameEn}
                      {isCurrentTier && (
                        <span className="text-primary text-xs ml-1">
                          ({language === 'th' ? 'ปัจจุบัน' : 'Current'})
                        </span>
                      )}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {tier.maxXP === Infinity 
                      ? `${tier.minXP.toLocaleString()}+ XP`
                      : `${tier.minXP.toLocaleString()} - ${tier.maxXP.toLocaleString()} XP`
                    }
                  </p>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
