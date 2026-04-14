import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, Gift, Calendar, Award, Star } from "lucide-react";

interface Props {
  userId: string;
  language: string;
}

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function PrizeDrawCard({ userId, language }: Props) {
  const [prizeLabels, setPrizeLabels] = useState<any>({});
  const [drawSettings, setDrawSettings] = useState<any>({});
  const [cycle, setCycle] = useState<any>(null);
  const [myWin, setMyWin] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const monthKey = getCurrentMonthKey();

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    setLoading(true);
    const [prizesRes, drawRes, cycleRes, winRes] = await Promise.all([
      supabase.from('reward_config').select('config_value').eq('config_key', 'prize_labels').maybeSingle(),
      supabase.from('reward_config').select('config_value').eq('config_key', 'draw_settings').maybeSingle(),
      supabase.from('reward_cycles').select('*').eq('month_key', monthKey).maybeSingle(),
      supabase.from('reward_winners').select('*').eq('user_id', userId).eq('month_key', monthKey).maybeSingle(),
    ]);

    if (prizesRes.data?.config_value) setPrizeLabels(prizesRes.data.config_value as any);
    if (drawRes.data?.config_value) setDrawSettings(drawRes.data.config_value as any);
    if (cycleRes.data) setCycle(cycleRes.data);
    if (winRes.data) setMyWin(winRes.data);
    setLoading(false);
  };

  const bigLabel = language === 'th' ? (prizeLabels.big_prize_th || 'รางวัลใหญ่') : (prizeLabels.big_prize_en || 'Grand Prize');
  const smallLabel = language === 'th' ? (prizeLabels.small_prize_th || 'รางวัลปลอบใจ') : (prizeLabels.small_prize_en || 'Consolation Prize');
  const bigCount = prizeLabels.big_prize_count || 1;
  const smallCount = prizeLabels.small_prize_count || 5;

  // Calculate draw date
  const drawDay = drawSettings.draw_day_of_month || 1;
  const now = new Date();
  const nextDrawDate = new Date(now.getFullYear(), now.getMonth() + 1, drawDay);
  const daysUntilDraw = Math.ceil((nextDrawDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (loading) {
    return (
      <Card>
        <CardContent className="p-5">
          <div className="animate-pulse space-y-3">
            <div className="h-6 bg-muted rounded w-1/2" />
            <div className="h-20 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-r from-amber-500/10 via-yellow-400/5 to-orange-400/10 p-5 pb-3">
        <h3 className="font-bold text-base flex items-center gap-2">
          <Crown className="h-4 w-4 text-amber-500" />
          {language === 'th' ? 'ลุ้นรางวัลประจำเดือน' : 'Monthly Lucky Draw'}
        </h3>
        <div className="flex items-center gap-2 mt-1">
          <Calendar className="h-3 w-3 text-muted-foreground" />
          <span className="text-[11px] text-muted-foreground">
            {language === 'th'
              ? `จับรางวัลในอีก ${daysUntilDraw} วัน`
              : `Draw in ${daysUntilDraw} days`}
          </span>
          {cycle?.status === 'drawn' && (
            <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-600 border-green-200">
              {language === 'th' ? 'จับรางวัลแล้ว' : 'Drawn'}
            </Badge>
          )}
        </div>
      </div>

      <CardContent className="p-5 space-y-3">
        {/* Winner notification */}
        {myWin && (
          <div className="rounded-xl bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border border-amber-200 dark:border-amber-700 p-4 text-center">
            <span className="text-3xl">🏆</span>
            <p className="font-bold text-amber-700 dark:text-amber-300 mt-1">
              {language === 'th' ? 'ยินดีด้วย! คุณชนะ!' : 'Congratulations! You won!'}
            </p>
            <p className="text-sm text-amber-600 dark:text-amber-400">
              {myWin.reward_type === 'big' ? bigLabel : smallLabel}
            </p>
          </div>
        )}

        {/* Prize list */}
        <div className="space-y-2">
          {/* Big prize */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-amber-500/5 to-transparent border border-amber-200/30">
            <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
              <Crown className="h-5 w-5 text-amber-500" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">{bigLabel}</p>
              <p className="text-[11px] text-muted-foreground">
                {language === 'th' ? `${bigCount} รางวัล` : `${bigCount} winner${bigCount > 1 ? 's' : ''}`}
              </p>
            </div>
            <Star className="h-4 w-4 text-amber-400" />
          </div>

          {/* Small prizes */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/30">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Gift className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">{smallLabel}</p>
              <p className="text-[11px] text-muted-foreground">
                {language === 'th' ? `${smallCount} รางวัล` : `${smallCount} winners`}
              </p>
            </div>
            <Award className="h-4 w-4 text-primary/50" />
          </div>
        </div>

        {/* Encouraging text */}
        <p className="text-center text-[11px] text-muted-foreground pt-1">
          {language === 'th'
            ? '💡 สะสมคะแนนให้มากขึ้นเพื่อเพิ่มโอกาสในการชนะ!'
            : '💡 Keep collecting points for more chances to win!'}
        </p>
      </CardContent>
    </Card>
  );
}
