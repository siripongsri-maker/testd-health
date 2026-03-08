import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { getTierByXP } from "@/components/RankingBoard";
import { getSafeDisplayName } from "@/lib/safeDisplayName";
import { Crown, Medal, Trophy, ChevronRight, Zap, ShieldAlert } from "lucide-react";

interface RankedUser {
  id: string;
  display_name: string | null;
  xp: number;
  level: number;
  avatar_url: string | null;
}

export function HomeLeaderboard() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user } = useAuth();
  const [topUsers, setTopUsers] = useState<RankedUser[]>([]);
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);
  const [currentUserData, setCurrentUserData] = useState<RankedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetchLeaderboard();
  }, [user]);

  const fetchLeaderboard = async () => {
    // leaderboard_profiles view already excludes admins at DB level
    const { data } = await supabase
      .from('leaderboard_profiles')
      .select('id, display_name, xp, level, avatar_url')
      .order('xp', { ascending: false })
      .limit(5);

    if (data) {
      setTopUsers(data);
      if (user) {
        const rank = data.findIndex(u => u.id === user.id) + 1;
        if (rank > 0) {
          setCurrentUserRank(rank);
          setCurrentUserData(data[rank - 1]);
        } else {
          const { data: allData } = await supabase
            .from('leaderboard_profiles')
            .select('id, display_name, xp, level, avatar_url')
            .order('xp', { ascending: false });
          if (allData) {
            const fullRank = allData.findIndex(u => u.id === user.id) + 1;
            setCurrentUserRank(fullRank > 0 ? fullRank : null);
            const found = allData.find(u => u.id === user.id);
            if (found) setCurrentUserData(found);
          }
        }
      }
    }
    setLoading(false);
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Crown className="h-4 w-4 text-amber-400" />;
    if (index === 1) return <Medal className="h-4 w-4 text-slate-400" />;
    if (index === 2) return <Medal className="h-4 w-4 text-orange-400" />;
    return null;
  };

  if (loading) {
    return (
      <div className="glass rounded-2xl p-4 animate-pulse">
        <div className="h-5 bg-muted rounded w-1/3 mb-3" />
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-10 bg-muted rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (topUsers.length === 0) return null;

  const displayUsers = expanded ? topUsers : topUsers.slice(0, 3);

  return (
    <div className="glass glass-shine rounded-2xl p-4 transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
            <Trophy className="h-4 w-4 text-amber-500" />
          </div>
          <h3 className="font-bold text-foreground text-sm">
            {language === 'th' ? 'กระดานอันดับ' : 'Leaderboard'}
          </h3>
        </div>
        <button onClick={() => navigate('/leaderboard')} className="text-xs text-primary hover:underline flex items-center gap-0.5">
          {language === 'th' ? 'ดูทั้งหมด' : 'View All'}
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Rankings */}
      <div className="space-y-1.5">
        {displayUsers.map((u, i) => {
          const tier = getTierByXP(u.xp || 0);
          const TierIcon = tier.icon;
          const isCurrentUser = user?.id === u.id;
          const safeName = getSafeDisplayName(
            u.display_name,
            u.id || '',
            language === 'th' ? 'ผู้ใช้' : 'User',
            user?.id
          );
          return (
            <div
              key={u.id}
              className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 transition-colors ${
                isCurrentUser
                  ? 'bg-primary/10 ring-1 ring-primary/30'
                  : i < 3 ? 'bg-muted/30' : ''
              }`}
            >
              <div className="w-5 flex justify-center shrink-0">
                {getRankIcon(i) || (
                  <span className="text-xs font-bold text-muted-foreground">
                    {i + 1}
                  </span>
                )}
              </div>
              <div className={`h-6 w-6 shrink-0 rounded-full ${tier.bgColor} ${tier.borderColor} border flex items-center justify-center`}>
                <TierIcon className={`h-3 w-3 ${tier.color}`} />
              </div>
              <span className={`flex-1 text-xs font-medium truncate ${
                isCurrentUser ? 'text-primary' : 'text-foreground'
              }`}>
                {safeName}
                {isCurrentUser && (
                  <span className="ml-1 text-[10px] text-primary/70">
                    ({language === 'th' ? 'คุณ' : 'You'})
                  </span>
                )}
              </span>
              <div className="flex items-center gap-0.5 shrink-0">
                <Zap className="h-3 w-3 text-amber-500" />
                <span className="text-xs font-bold text-foreground tabular-nums">
                  {(u.xp || 0).toLocaleString()}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Current user rank if not in top list */}
      {currentUserRank && currentUserRank > displayUsers.length && currentUserData && (
        <div className="mt-1.5 pt-1.5 border-t border-border/50">
          <div className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 bg-primary/10 ring-1 ring-primary/30">
            <div className="w-5 flex justify-center shrink-0">
              <span className="text-xs font-bold text-primary">{currentUserRank}</span>
            </div>
            <div className={`h-6 w-6 shrink-0 rounded-full ${getTierByXP(currentUserData.xp || 0).bgColor} ${getTierByXP(currentUserData.xp || 0).borderColor} border flex items-center justify-center`}>
              {(() => {
                const tier = getTierByXP(currentUserData.xp || 0);
                const TierIcon = tier.icon;
                return <TierIcon className={`h-3 w-3 ${tier.color}`} />;
              })()}
            </div>
            <span className="flex-1 text-xs font-medium truncate text-primary">
              {getSafeDisplayName(currentUserData.display_name, currentUserData.id || '', language === 'th' ? 'คุณ' : 'You', user?.id)}
            </span>
            <div className="flex items-center gap-0.5 shrink-0">
              <Zap className="h-3 w-3 text-amber-500" />
              <span className="text-xs font-bold tabular-nums">{(currentUserData.xp || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* Expand toggle */}
      {topUsers.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full mt-2 text-xs text-primary hover:underline text-center py-1"
        >
          {expanded
            ? (language === 'th' ? 'แสดงน้อยลง' : 'Show less')
            : (language === 'th' ? 'ดูเพิ่มเติม' : 'See more')}
        </button>
      )}

      {/* Privacy notice */}
      <p className="text-[10px] text-center text-muted-foreground mt-2">
        <ShieldAlert className="inline h-3 w-3 mr-0.5 -mt-0.5" />
        {language === 'th'
          ? 'แสดงเฉพาะชื่อผู้ใช้หรือชื่อเล่นเท่านั้น'
          : 'Only usernames or nicknames are displayed.'}
      </p>
    </div>
  );
}
