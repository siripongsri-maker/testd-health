import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { Target, Gift, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Milestone {
  id: string;
  month: string;
  metric_type: string;
  target_value: number;
  current_value: number;
  reward_xp: number;
  reward_ticket: number;
  is_completed: boolean;
  completed_at: string | null;
}

export function CommunityMilestoneCard() {
  const { language } = useLanguage();
  const [milestone, setMilestone] = useState<Milestone | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);
  const [prevCompleted, setPrevCompleted] = useState(false);

  const currentMonth = new Date().toISOString().slice(0, 7); // '2026-03'

  const fetchMilestone = useCallback(async () => {
    const { data } = await supabase
      .from("community_milestones")
      .select("*")
      .eq("month", currentMonth)
      .limit(1)
      .maybeSingle();

    if (data) {
      const m = data as unknown as Milestone;
      // Detect completion transition
      if (m.is_completed && !prevCompleted && !loading) {
        setShowCelebration(true);
      }
      setPrevCompleted(m.is_completed);
      setMilestone(m);
    }
    setLoading(false);
  }, [currentMonth, prevCompleted, loading]);

  useEffect(() => {
    fetchMilestone();
  }, []);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("community-milestone")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "community_milestones",
          filter: `month=eq.${currentMonth}`,
        },
        (payload) => {
          if (payload.new) {
            const m = payload.new as unknown as Milestone;
            if (m.is_completed && !prevCompleted) {
              setShowCelebration(true);
            }
            setPrevCompleted(m.is_completed);
            setMilestone(m);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentMonth, prevCompleted]);

  if (loading) {
    return (
      <div className="glass rounded-2xl p-4 animate-pulse">
        <div className="h-5 bg-muted rounded w-2/3 mb-3" />
        <div className="h-3 bg-muted rounded w-full mb-2" />
        <div className="h-6 bg-muted rounded w-full" />
      </div>
    );
  }

  if (!milestone) return null;

  const pct = Math.min(
    Math.round((milestone.current_value / milestone.target_value) * 100),
    100
  );
  const remaining = Math.max(
    milestone.target_value - milestone.current_value,
    0
  );

  const metricLabel =
    language === "th" ? "การตรวจสุขภาพ" : "health checks";

  return (
    <>
      <div className="glass glass-shine rounded-2xl p-4 transition-all duration-300">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <div className="h-8 w-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
            <Target className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-foreground text-sm leading-tight">
              {language === "th"
                ? "🌍 ภารกิจชุมชน"
                : "🌍 Community Goal"}
            </h3>
            <p className="text-[11px] text-muted-foreground leading-tight">
              {language === "th"
                ? "ช่วยกันดูแลสุขภาพของชุมชนให้ถึงเป้าหมาย"
                : "Work together to reach the community health goal"}
            </p>
          </div>
        </div>

        {/* Target */}
        <div className="bg-muted/30 rounded-xl p-3 mb-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
            {language === "th"
              ? "🎯 เป้าหมายเดือนนี้"
              : "🎯 This Month's Target"}
          </p>
          <p className="text-lg font-bold text-foreground">
            {milestone.target_value.toLocaleString()}{" "}
            <span className="text-sm font-normal text-muted-foreground">
              {metricLabel}
            </span>
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-foreground tabular-nums">
              {milestone.current_value.toLocaleString()} /{" "}
              {milestone.target_value.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-primary tabular-nums">
              {pct}%
            </span>
          </div>
          <Progress
            value={pct}
            className="h-3 rounded-full bg-muted/50"
          />
        </div>

        {/* Status text */}
        {milestone.is_completed ? (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5" />
            {language === "th"
              ? "🎉 ชุมชนทำสำเร็จแล้ว!"
              : "🎉 Community goal achieved!"}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {language === "th"
              ? `เหลืออีก ${remaining.toLocaleString()} ${metricLabel} เพื่อปลดล็อกรางวัล`
              : `${remaining.toLocaleString()} more ${metricLabel} to unlock rewards`}
          </p>
        )}

        {/* Reward preview */}
        <div className="mt-3 pt-3 border-t border-border/30">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Gift className="h-3.5 w-3.5 text-primary" />
            <span>
              {language === "th"
                ? "เมื่อครบเป้า ทุกคนจะได้รับ"
                : "When completed, everyone gets"}
            </span>
          </div>
          <div className="flex gap-3 mt-1.5">
            <span className="inline-flex items-center gap-1 text-xs font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">
              +{milestone.reward_xp} XP
            </span>
            {milestone.reward_ticket > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full">
                +{milestone.reward_ticket}{" "}
                {language === "th" ? "ตั๋วลุ้นรางวัล" : "Lucky Ticket"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Celebration popup */}
      <Dialog open={showCelebration} onOpenChange={setShowCelebration}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              🎉{" "}
              {language === "th"
                ? "ชุมชนของเราทำสำเร็จแล้ว!"
                : "Community Goal Achieved!"}
            </DialogTitle>
            <DialogDescription className="space-y-3 pt-2">
              <p className="text-base">
                {milestone.target_value.toLocaleString()} {metricLabel}{" "}
                {language === "th" ? "ครบแล้ว" : "completed"}
              </p>
              <div className="flex justify-center gap-3 py-2">
                <span className="inline-flex items-center gap-1 text-sm font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-3 py-1 rounded-full">
                  +{milestone.reward_xp} XP
                </span>
                {milestone.reward_ticket > 0 && (
                  <span className="inline-flex items-center gap-1 text-sm font-bold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-3 py-1 rounded-full">
                    +{milestone.reward_ticket}{" "}
                    {language === "th" ? "ตั๋วลุ้นรางวัล" : "Lucky Ticket"}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {language === "th"
                  ? "ขอบคุณที่ช่วยดูแลสุขภาพของชุมชน 💖"
                  : "Thank you for caring for community health 💖"}
              </p>
            </DialogDescription>
          </DialogHeader>
          <Button onClick={() => setShowCelebration(false)} className="mt-2">
            {language === "th" ? "เยี่ยมเลย!" : "Awesome!"}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
