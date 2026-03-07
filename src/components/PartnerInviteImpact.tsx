import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/lib/i18n";
import { Heart, Eye, TestTube, Calendar, Users, Timer, TrendingUp, ThumbsUp, CalendarCheck, CheckCircle2, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface Stats {
  invites_created: number;
  invites_opened: number;
  unique_opens: number;
  kit_cta: number;
  booking_cta: number;
  sessions_joined: number;
  timer_completed: number;
  bookings_completed: number;
  selftest_requests: number;
  conversion_rate: number;
  accepted_count: number;
  plans_to_test_count: number;
  booked_count: number;
  completed_count: number;
  active_invites: number;
  expired_invites: number;
  pair_completed: number;
  booking_started_count: number;
  raw_impact_score: number;
  adjusted_impact_score: number;
  suspicious_events_count: number;
}

export function PartnerInviteImpact() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isTh = language === 'th';
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.rpc('get_partner_invite_stats').then(({ data }) => {
      if (data) setStats(data as unknown as Stats);
    });
  }, [user]);

  if (!user || !stats || stats.invites_created === 0) return null;

  const items = [
    { icon: Heart, label: isTh ? 'ส่งคำชวน' : 'Invites sent', value: stats.invites_created },
    { icon: Eye, label: isTh ? 'เปิดดู' : 'Unique opens', value: stats.unique_opens || stats.invites_opened },
    { icon: ThumbsUp, label: isTh ? 'ตอบรับ' : 'Accepted', value: stats.accepted_count },
    { icon: CalendarCheck, label: isTh ? 'ตั้งใจตรวจ' : 'Plans to test', value: stats.plans_to_test_count },
    { icon: Calendar, label: isTh ? 'จองแล้ว' : 'Booked', value: stats.booked_count },
    { icon: CheckCircle2, label: isTh ? 'ตรวจแล้ว' : 'Completed', value: stats.completed_count },
    { icon: Users, label: isTh ? 'ตรวจคู่สำเร็จ' : 'Pair completed', value: stats.pair_completed || 0 },
    { icon: Timer, label: isTh ? 'จับเวลาเสร็จ' : 'Timer done', value: stats.timer_completed },
  ];

  const qualityRate = stats.invites_created > 0
    ? Math.round(((stats.booked_count + stats.completed_count + stats.bookings_completed) / stats.invites_created) * 100)
    : 0;

  return (
    <div className="rounded-2xl bg-card border border-border p-5 shadow-card">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <Heart className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground text-sm">
            {isTh ? 'ผลกระทบของคุณ' : 'Your Impact'}
          </h3>
          <p className="text-xs text-muted-foreground">
            {isTh ? `คะแนนผลกระทบ: ${stats.adjusted_impact_score}` : `Impact score: ${stats.adjusted_impact_score}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {qualityRate > 0 && (
            <div className="flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-1">
              <Shield className="h-3 w-3 text-blue-600" />
              <span className="text-xs font-medium text-blue-600">{qualityRate}%</span>
            </div>
          )}
          {stats.conversion_rate > 0 && (
            <div className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1">
              <TrendingUp className="h-3 w-3 text-emerald-600" />
              <span className="text-xs font-medium text-emerald-600">{stats.conversion_rate}%</span>
            </div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {items.filter(i => i.value > 0).map(item => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="text-center rounded-lg bg-muted/50 p-2">
              <Icon className="h-4 w-4 text-primary mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground">{item.value}</p>
              <p className="text-[10px] text-muted-foreground">{item.label}</p>
            </div>
          );
        })}
      </div>
      {stats.suspicious_events_count > 0 && (
        <p className="text-[10px] text-muted-foreground text-center mt-3 pt-2 border-t border-border">
          {isTh ? 'กิจกรรมที่ซ้ำบางรายการอาจไม่ถูกนับ' : 'Some repeated activity may not be counted.'}
        </p>
      )}
    </div>
  );
}
