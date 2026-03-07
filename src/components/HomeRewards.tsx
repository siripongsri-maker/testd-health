import { forwardRef, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { Skeleton } from "@/components/ui/skeleton";
import { Gift, Trophy, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface Reward {
  id: string;
  reward_title: string;
  reward_description: string;
  reward_image_url: string | null;
  status_label: string | null;
  display_order: number;
  season_end_at: string | null;
}

const SeasonCountdown = forwardRef<HTMLDivElement, { language: string }>(function SeasonCountdown({ language }, ref) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, ended: false });

  useEffect(() => {
    // Season ends on the last day of the current month
    const getSeasonEnd = () => {
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    };

    const update = () => {
      const now = new Date();
      const end = getSeasonEnd();
      const diff = end.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, ended: true });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);
      setTimeLeft({ days, hours, minutes, seconds, ended: false });
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  if (timeLeft.ended) {
    return (
      <div ref={ref} className="inline-flex items-center gap-1.5 bg-muted/50 rounded-full px-3 py-1">
        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold text-muted-foreground">
          {language === 'th' ? 'ซีซันจบแล้ว' : 'Season Ended'}
        </span>
      </div>
    );
  }

  const labels = language === 'th'
    ? { d: 'วัน', h: 'ชม.', m: 'นาที', s: 'วินาที' }
    : { d: 'Days', h: 'Hours', m: 'Min', s: 'Sec' };

  return (
    <div ref={ref} className="space-y-1.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        {language === 'th' ? 'ซีซันจบใน' : 'Season ends in'}
      </p>
      <div className="flex gap-1.5">
        {[
          { val: timeLeft.days, label: labels.d },
          { val: timeLeft.hours, label: labels.h },
          { val: timeLeft.minutes, label: labels.m },
          { val: timeLeft.seconds, label: labels.s },
        ].map((item, i) => (
          <div key={i} className="flex flex-col items-center bg-background/60 rounded-lg px-2 py-1 min-w-[40px]">
            <span className="text-base font-bold text-primary tabular-nums leading-tight">
              {String(item.val).padStart(2, '0')}
            </span>
            <span className="text-[9px] text-muted-foreground leading-tight">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
});

export function HomeRewards() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: flag } = await supabase
        .from("app_feature_flags")
        .select("enabled")
        .eq("flag_key", "homepage_rewards_enabled")
        .single();

      if (!flag?.enabled) {
        setEnabled(false);
        setLoading(false);
        return;
      }

      setEnabled(true);

      const { data } = await supabase
        .from("homepage_rewards")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      setRewards((data as Reward[]) || []);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  if (!enabled || rewards.length === 0) return null;

  return (
    <section className="space-y-3">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <Gift className="h-4 w-4 text-primary" />
          </div>
          <h2 className="font-bold text-foreground text-sm sm:text-base">
            {t("home.healthRewards")}
          </h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-primary h-8 px-3"
          onClick={() => navigate('/leaderboard')}
        >
          <Trophy className="h-3.5 w-3.5 mr-1" />
          {language === 'th' ? 'ดูกระดาน' : 'Leaderboard'}
        </Button>
      </div>

      {/* Featured reward card with countdown */}
      <div className="glass rounded-2xl overflow-hidden">
        {rewards[0]?.reward_image_url ? (
          <div className="relative h-36 sm:h-44">
            <img
              src={rewards[0].reward_image_url}
              alt={rewards[0].reward_title}
              loading="lazy"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-base leading-tight line-clamp-2 drop-shadow">
                    {rewards[0].reward_title}
                  </h3>
                  <p className="text-xs text-white/80 line-clamp-2 mt-0.5">
                    {rewards[0].reward_description}
                  </p>
                </div>
                {rewards[0].status_label && (
                  <span className="shrink-0 text-[10px] font-semibold bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full">
                    {rewards[0].status_label}
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4">
            <h3 className="font-bold text-sm text-foreground">{rewards[0]?.reward_title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{rewards[0]?.reward_description}</p>
          </div>
        )}

        {/* Countdown timer */}
        <div className="p-3 border-t border-border/30 flex items-center justify-between">
          <SeasonCountdown language={language} />
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs rounded-xl"
            onClick={() => navigate('/leaderboard')}
          >
            {language === 'th' ? 'ดูรายละเอียด' : 'View Details'}
          </Button>
        </div>
      </div>

      {/* Additional rewards (horizontal scroll) */}
      {rewards.length > 1 && (
        <div className="flex gap-2.5 overflow-x-auto pb-1 snap-x snap-mandatory scrollbar-hide">
          {rewards.slice(1).map((r) => (
            <div
              key={r.id}
              className="snap-start shrink-0 w-44 sm:w-48 glass rounded-xl overflow-hidden flex flex-col"
            >
              {r.reward_image_url ? (
                <img
                  src={r.reward_image_url}
                  alt={r.reward_title}
                  loading="lazy"
                  className="h-24 w-full object-cover"
                />
              ) : (
                <div className="h-24 w-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                  <Gift className="h-8 w-8 text-primary/40" />
                </div>
              )}
              <div className="p-2.5 flex flex-col gap-0.5 flex-1">
                <h3 className="font-semibold text-xs text-foreground leading-tight line-clamp-2">
                  {r.reward_title}
                </h3>
                {r.status_label && (
                  <span className="self-start text-[9px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded-full mt-0.5">
                    {r.status_label}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
