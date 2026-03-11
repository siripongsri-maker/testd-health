import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TIERS, getTierByXP } from "@/components/RankingBoard";
import { getSafeDisplayName } from "@/lib/safeDisplayName";
import { Crown, Trophy, Medal, TrendingUp, Users, Sparkles, Zap, Award, RotateCcw, Loader2, ShieldAlert, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { toast } from "sonner";

interface RankedUser {
  id: string;
  display_name: string | null;
  xp: number;
  level: number;
  avatar_url: string | null;
}

interface HallOfFameEntry {
  id: string;
  season_key: string;
  season_label: string;
  category: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  score: number;
  captured_at: string;
}

export default function Leaderboard() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [allUsers, setAllUsers] = useState<RankedUser[]>([]);
  const [totalMembers, setTotalMembers] = useState<number>(0);
  const [activePlayers, setActivePlayers] = useState<number>(0);
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);
  const [currentUserData, setCurrentUserData] = useState<RankedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTier, setSelectedTier] = useState<string>('all');
  const [hallOfFame, setHallOfFame] = useState<HallOfFameEntry[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    fetchAllRankings();
    fetchHallOfFame();
    checkAdminRole();
  }, [user]);

  useEffect(() => {
    if (!carouselApi) return;
    const onSelect = () => setCurrentSlide(carouselApi.selectedScrollSnap());
    carouselApi.on('select', onSelect);
    onSelect();
    return () => { carouselApi.off('select', onSelect); };
  }, [carouselApi]);

  const checkAdminRole = async () => {
    if (!user) { setIsAdmin(false); return; }
    const { data } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
    setIsAdmin(!!data);
  };

  const fetchHallOfFame = async () => {
    const { data } = await supabase
      .from('hall_of_fame')
      .select('*')
      .order('captured_at', { ascending: false });
    if (data) setHallOfFame(data);
  };

  const handleRecalculateLeaderboard = async () => {
    if (!isAdmin) return;
    setRecalculating(true);
    try {
      // The view already excludes admins. Re-fetching is the "recalculation".
      await fetchAllRankings();
      
      // Log recalculation
      await supabase.from('notifications').insert({
        notification_type: 'system',
        title: 'Leaderboard Recalculated',
        message: `Admin ${user?.id} recalculated leaderboard at ${new Date().toISOString()}. ${allUsers.length} eligible users ranked.`,
        created_by: user?.id,
        recipient_user_id: user?.id,
      });

      toast.success(
        language === 'th'
          ? `คำนวณอันดับใหม่สำเร็จ (${allUsers.length} ผู้ใช้)`
          : `Recalculated rankings for ${allUsers.length} users`
      );
    } catch (error) {
      toast.error(language === 'th' ? 'เกิดข้อผิดพลาด' : 'Recalculation failed');
    } finally {
      setRecalculating(false);
    }
  };

  const handleResetLeaderboard = async () => {
    if (!isAdmin || allUsers.length === 0) return;
    
    const confirmed = window.confirm(
      language === 'th' 
        ? `คุณแน่ใจหรือไม่ว่าต้องการรีเซ็ต Leaderboard และเริ่ม Season 2?\n\n• จะบันทึกข้อมูลผู้ใช้ทั้งหมด ${allUsers.length} คน\n• ส่งการแจ้งเตือนถึงทุกคน\n• การกระทำนี้ไม่สามารถย้อนกลับได้`
        : `Are you sure you want to reset the leaderboard and start Season 2?\n\n• Will save data for all ${allUsers.length} users\n• Send notification to everyone\n• This action cannot be undone.`
    );
    if (!confirmed) return;
    
    setResetting(true);
    try {
      const seasonKey = 'S1_2026_01';
      const seasonLabel = 'Season 1 — January 2026 (มกราคม 2569)';
      
      const snapshotData = allUsers.map((u, index) => ({
        season_key: seasonKey,
        user_id: u.id,
        display_name: u.display_name,
        xp: u.xp || 0,
        level: u.level || 1,
        streak: 0,
        rank: index + 1,
      }));
      
      for (let i = 0; i < snapshotData.length; i += 100) {
        const batch = snapshotData.slice(i, i + 100);
        const { error: snapshotError } = await supabase
          .from('leaderboard_snapshots')
          .insert(batch);
        if (snapshotError) throw snapshotError;
      }
      
      const winner = allUsers[0];
      if (winner) {
        const { error: hofError } = await supabase
          .from('hall_of_fame')
          .upsert({
            season_key: seasonKey,
            season_label: seasonLabel,
            category: 'Top Health Score',
            user_id: winner.id,
            display_name: winner.display_name,
            avatar_url: winner.avatar_url,
            score: winner.xp || 0,
          }, { onConflict: 'season_key' });
        if (hofError) throw hofError;
      }
      
      const { error: resetError } = await supabase
        .from('profiles')
        .update({ xp: 0, level: 1, streak: 0 })
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (resetError) throw resetError;
      
      const { error: notifyError } = await supabase
        .from('notifications')
        .insert({
          notification_type: 'broadcast',
          title: '🎉 Season 2 เริ่มต้นแล้ว! / Season 2 Has Begun!',
          message: language === 'th' 
            ? '🏆 ขอแสดงความยินดีกับผู้ชนะ Season 1!\n\n🚀 Season 2 เริ่มต้นแล้ว - ทุกคนกลับมาที่ 0 XP เท่ากัน นี่คือโอกาสใหม่ในการพิชิตอันดับ!\n\n💪 มาร่วมดูแลสุขภาพและสะสม XP กันเถอะ'
            : '🏆 Congratulations to Season 1 Champion!\n\n🚀 Season 2 has begun - everyone starts fresh at 0 XP. This is your chance to climb the leaderboard!\n\n💪 Join us in taking care of your health and earning XP together.',
          created_by: user?.id,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        });
      if (notifyError) console.warn('Notification error:', notifyError);
      
      toast.success(
        language === 'th' 
          ? `บันทึกข้อมูล ${allUsers.length} คน และแจ้งเตือน Season 2 สำเร็จ!`
          : `Saved ${allUsers.length} users data and notified about Season 2!`
      );
      
      await fetchAllRankings();
      await fetchHallOfFame();
    } catch (error) {
      console.error('Reset error:', error);
      toast.error(language === 'th' ? 'เกิดข้อผิดพลาด' : 'Failed to reset leaderboard');
    } finally {
      setResetting(false);
    }
  };

  const fetchAllRankings = async () => {
    setLoading(true);
    
    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('user_id');
    if (rolesData) {
      const uniqueUsers = new Set(rolesData.map(r => r.user_id));
      setTotalMembers(uniqueUsers.size);
    }
    
    // leaderboard_profiles view already excludes admins at DB level
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

    const active = rankings?.filter(u => (u.xp || 0) > 0).length || 0;
    setActivePlayers(active);
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
        <PageHeader title={language === 'th' ? 'กระดานอันดับ' : 'Leaderboard'} backTo="/" />
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
      <PageHeader title={language === 'th' ? 'กระดานอันดับ' : 'Leaderboard'} backTo="/" />
      
      <div className="p-4 space-y-4 pb-24">
        {/* Privacy Notice */}
        <div className="flex items-start gap-2 p-3 rounded-xl bg-muted/40 border border-border/50">
          <ShieldAlert className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">
            {language === 'th'
              ? 'เพื่อความเป็นส่วนตัว ระบบจะแสดงเฉพาะชื่อผู้ใช้หรือชื่อเล่นเท่านั้น ชื่อจริงจะไม่ถูกแสดงบนกระดานอันดับ'
              : 'For privacy, only usernames or nicknames are displayed. Real names are never shown on the leaderboard.'}
          </p>
        </div>

        {/* Hall of Fame */}
        {hallOfFame.length > 0 && (
          <Card className="p-4 bg-gradient-to-br from-amber-100 to-yellow-50 dark:from-amber-900/40 dark:to-yellow-900/30 border-amber-300 dark:border-amber-700 overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-600" />
                <h3 className="font-bold text-amber-800 dark:text-amber-200">
                  {language === 'th' ? 'หอเกียรติยศ' : 'Hall of Fame'}
                </h3>
              </div>
              {hallOfFame.length > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => carouselApi?.scrollPrev()}
                    className="h-7 w-7 rounded-full bg-amber-200/60 dark:bg-amber-800/40 flex items-center justify-center hover:bg-amber-300/80 dark:hover:bg-amber-700/60 transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4 text-amber-700 dark:text-amber-300" />
                  </button>
                  <button
                    onClick={() => carouselApi?.scrollNext()}
                    className="h-7 w-7 rounded-full bg-amber-200/60 dark:bg-amber-800/40 flex items-center justify-center hover:bg-amber-300/80 dark:hover:bg-amber-700/60 transition-colors"
                  >
                    <ChevronRight className="h-4 w-4 text-amber-700 dark:text-amber-300" />
                  </button>
                </div>
              )}
            </div>

            <Carousel
              opts={{ loop: hallOfFame.length > 1, align: 'start' }}
              setApi={setCarouselApi}
              className="w-full"
            >
              <CarouselContent className="-ml-0">
                {hallOfFame.map((entry, idx) => {
                  const seasonNum = entry.season_key.match(/S(\d+)/)?.[1] || String(idx + 1);
                  return (
                    <CarouselItem key={entry.id} className="pl-0 basis-full">
                      <div className="bg-white/60 dark:bg-black/20 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                            {entry.season_label}
                          </p>
                          <Badge className="bg-amber-500 text-white text-[10px]">
                            {language === 'th' ? `แชมป์ Season ${seasonNum}` : `Season ${seasonNum} Champion`}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground mb-3">
                          {language === 'th' ? 'คะแนนสุขภาพสูงสุดประจำเซิร์ฟเวอร์' : 'Top Health Score of the Server'}
                        </p>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center ring-2 ring-amber-500 shrink-0">
                            <Crown className="h-6 w-6 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-amber-800 dark:text-amber-200 truncate">
                              {getSafeDisplayName(entry.display_name, entry.user_id, 'Champion', user?.id)}
                            </p>
                            <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                              {entry.score.toLocaleString()} XP
                            </p>
                          </div>
                        </div>
                      </div>
                    </CarouselItem>
                  );
                })}
              </CarouselContent>
            </Carousel>

            {/* Pagination dots */}
            {hallOfFame.length > 1 && (
              <div className="flex justify-center gap-1.5 mt-3">
                {hallOfFame.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => carouselApi?.scrollTo(idx)}
                    className={`h-1.5 rounded-full transition-all ${
                      idx === currentSlide
                        ? 'w-5 bg-amber-600 dark:bg-amber-400'
                        : 'w-1.5 bg-amber-300 dark:bg-amber-700'
                    }`}
                  />
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Admin Controls */}
        {isAdmin && (
          <Card className="p-4 border-destructive/30 bg-destructive/5">
            <div className="space-y-3">
              <p className="font-medium text-sm">
                {language === 'th' ? 'การจัดการ Admin' : 'Admin Controls'}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleRecalculateLeaderboard}
                  disabled={recalculating}
                >
                  {recalculating ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-1" />
                  )}
                  {language === 'th' ? 'คำนวณอันดับใหม่' : 'Recalculate Rankings'}
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={handleResetLeaderboard}
                  disabled={resetting || allUsers.length === 0}
                >
                  {resetting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <RotateCcw className="h-4 w-4 mr-1" />
                  )}
                  {language === 'th' ? 'รีเซ็ต (Season 2)' : 'Reset (Season 2)'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {language === 'th' 
                  ? 'หมายเหตุ: บัญชี Admin จะไม่ปรากฏในกระดานอันดับ'
                  : 'Note: Admin accounts are excluded from rankings'}
              </p>
            </div>
          </Card>
        )}

        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 bg-gradient-to-br from-primary/10 to-primary/5">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{totalMembers}</p>
                <p className="text-xs text-muted-foreground">
                  {language === 'th' ? 'สมาชิก' : 'Members'}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-3 bg-gradient-to-br from-emerald-100/50 to-green-100/50 dark:from-emerald-900/30 dark:to-green-900/30">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{activePlayers}</p>
                <p className="text-xs text-muted-foreground">
                  {language === 'th' ? 'แอคทีฟ 7 วัน' : 'Active 7d'}
                </p>
              </div>
            </div>
          </Card>
          {currentUserRank && currentUserData && (
            <Card className="p-3 bg-gradient-to-br from-amber-100/50 to-orange-100/50 dark:from-amber-900/30 dark:to-orange-900/30">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                <div>
                  <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">#{currentUserRank}</p>
                  <p className="text-xs text-muted-foreground">
                    {language === 'th' ? 'อันดับคุณ' : 'Your Rank'}
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
                  {getSafeDisplayName(filteredUsers[1]?.display_name, filteredUsers[1]?.id || '', 'User', user?.id)}
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
                  {getSafeDisplayName(filteredUsers[0]?.display_name, filteredUsers[0]?.id || '', 'User', user?.id)}
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
                  {getSafeDisplayName(filteredUsers[2]?.display_name, filteredUsers[2]?.id || '', 'User', user?.id)}
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
              const safeName = getSafeDisplayName(
                rankedUser.display_name,
                rankedUser.id || '',
                language === 'th' ? 'ผู้ใช้' : 'User',
                user?.id
              );
              
              return (
                <div
                  key={rankedUser.id}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                    isCurrentUser 
                      ? 'bg-primary/10 ring-2 ring-primary/30' 
                      : 'bg-muted/30 hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-1 w-12">
                    {getRankBadge(globalRank - 1)}
                    <span className={`font-bold ${globalRank <= 3 ? 'text-lg' : 'text-sm text-muted-foreground'}`}>
                      #{globalRank}
                    </span>
                  </div>
                  <div className={`w-10 h-10 rounded-full ${tier.bgColor} ${tier.borderColor} border-2 flex items-center justify-center flex-shrink-0`}>
                    <TierIcon className={`h-5 w-5 ${tier.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {safeName}
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
