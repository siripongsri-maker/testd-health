import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Star, Target, TrendingUp, Ticket, Sparkles } from "lucide-react";

interface Props {
  userId: string;
  language: string;
}

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthLabel(monthKey: string, lang: string) {
  const [y, m] = monthKey.split('-');
  const date = new Date(parseInt(y), parseInt(m) - 1);
  return date.toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US', { month: 'long', year: 'numeric' });
}

export function RewardsSummaryCard({ userId, language }: Props) {
  const [points, setPoints] = useState(0);
  const [rank, setRank] = useState<number | null>(null);
  const [entries, setEntries] = useState(0);
  const [isEligible, setIsEligible] = useState(false);
  const [threshold, setThreshold] = useState(100);
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [loading, setLoading] = useState(true);

  const monthKey = getCurrentMonthKey();

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [monthlyRes, rankRes, participantsRes, configRes] = await Promise.all([
        supabase
          .from('reward_points_monthly')
          .select('total_points, entries, is_eligible')
          .eq('user_id', userId)
          .eq('month_key', monthKey)
          .maybeSingle(),
        supabase.rpc('get_my_monthly_rank', { p_user_id: userId, p_month_key: monthKey }),
        supabase.rpc('get_monthly_participants', { p_month_key: monthKey }),
        supabase
          .from('reward_config')
          .select('config_value')
          .eq('config_key', 'eligibility_threshold')
          .maybeSingle(),
      ]);

      if (monthlyRes.data) {
        setPoints(monthlyRes.data.total_points || 0);
        setEntries(monthlyRes.data.entries || 0);
        setIsEligible(monthlyRes.data.is_eligible || false);
      }

      if (rankRes.data && rankRes.data > 0) {
        setRank(rankRes.data);
      }

      setTotalParticipants(participantsRes.data || 0);

      if (configRes.data?.config_value) {
        const val = configRes.data.config_value as any;
        setThreshold(val.min_points || 100);
      }
    } catch (err) {
      console.error('Error fetching reward data:', err);
    }
    setLoading(false);
  };

  const progressPercent = Math.min((points / threshold) * 100, 100);

  if (loading) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-5">
          <div className="animate-pulse space-y-3">
            <div className="h-6 bg-muted rounded w-1/3" />
            <div className="h-4 bg-muted rounded w-2/3" />
            <div className="h-8 bg-muted rounded w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-primary/20">
      {/* Gradient header */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 p-5 pb-3">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {language === 'th' ? 'คะแนนเดือนนี้' : 'This Month\'s Score'}
          </h3>
          <Badge variant={isEligible ? "default" : "secondary"} className="text-[10px]">
            {isEligible
              ? (language === 'th' ? '✨ มีสิทธิ์ลุ้นรางวัล' : '✨ Eligible')
              : (language === 'th' ? 'ยังไม่ถึงเกณฑ์' : 'Not yet eligible')}
          </Badge>
        </div>
        <p className="text-[11px] text-muted-foreground">
          {getMonthLabel(monthKey, language)}
        </p>
      </div>

      <CardContent className="p-5 space-y-4">
        {/* Points display */}
        <div className="flex items-end gap-2">
          <span className="text-4xl font-black text-primary tabular-nums">{points.toLocaleString()}</span>
          <span className="text-sm text-muted-foreground mb-1">
            {language === 'th' ? 'คะแนน' : 'points'}
          </span>
        </div>

        {/* Progress to eligibility */}
        {!isEligible && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>{language === 'th' ? 'ความคืบหน้าสู่เกณฑ์ลุ้นรางวัล' : 'Progress to eligibility'}</span>
              <span>{points}/{threshold}</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
            <p className="text-[10px] text-muted-foreground">
              {language === 'th'
                ? `อีก ${Math.max(threshold - points, 0)} คะแนนเพื่อร่วมลุ้นรางวัล`
                : `${Math.max(threshold - points, 0)} more points to enter the draw`}
            </p>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-xl bg-muted/50">
            <Trophy className="h-4 w-4 mx-auto text-amber-500 mb-1" />
            <p className="text-lg font-bold">{rank ? `#${rank}` : '-'}</p>
            <p className="text-[10px] text-muted-foreground">
              {language === 'th' ? 'อันดับ' : 'Rank'}
            </p>
          </div>
          <div className="text-center p-3 rounded-xl bg-muted/50">
            <Ticket className="h-4 w-4 mx-auto text-primary mb-1" />
            <p className="text-lg font-bold">{entries}</p>
            <p className="text-[10px] text-muted-foreground">
              {language === 'th' ? 'สิทธิ์ลุ้น' : 'Entries'}
            </p>
          </div>
          <div className="text-center p-3 rounded-xl bg-muted/50">
            <TrendingUp className="h-4 w-4 mx-auto text-green-500 mb-1" />
            <p className="text-lg font-bold">{totalParticipants}</p>
            <p className="text-[10px] text-muted-foreground">
              {language === 'th' ? 'ผู้เข้าร่วม' : 'Players'}
            </p>
          </div>
        </div>

        {/* Eligibility message */}
        {isEligible && (
          <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 text-center">
            <p className="text-sm font-medium text-primary">
              🎉 {language === 'th' ? 'คุณมีสิทธิ์ลุ้นรางวัลประจำเดือนนี้!' : 'You\'re in this month\'s draw!'}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {language === 'th'
                ? `คุณมี ${entries} สิทธิ์ในการลุ้นรางวัล`
                : `You have ${entries} entries in the draw`}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
