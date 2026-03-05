import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/lib/i18n";
import { Heart, Eye, TestTube, Calendar, Users, Timer } from "lucide-react";

interface Stats {
  invites_created: number;
  invites_opened: number;
  kit_cta: number;
  booking_cta: number;
  sessions_joined: number;
  timer_completed: number;
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

  const impactScore = stats.invites_opened + stats.kit_cta * 3 + stats.booking_cta * 3 + stats.timer_completed * 5;

  const items = [
    { icon: Heart, label: isTh ? 'ส่งคำชวน' : 'Invites sent', value: stats.invites_created },
    { icon: Eye, label: isTh ? 'เปิดดู' : 'Opened', value: stats.invites_opened },
    { icon: TestTube, label: isTh ? 'ขอชุดตรวจ' : 'Kit requests', value: stats.kit_cta },
    { icon: Calendar, label: isTh ? 'จองคลินิก' : 'Bookings', value: stats.booking_cta },
    { icon: Users, label: isTh ? 'เข้าร่วม' : 'Joined', value: stats.sessions_joined },
    { icon: Timer, label: isTh ? 'ตรวจเสร็จ' : 'Completed', value: stats.timer_completed },
  ];

  return (
    <div className="rounded-2xl bg-card border border-border p-5 shadow-card">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <Heart className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground text-sm">
            {isTh ? 'ผลกระทบของคุณ' : 'Your Impact'}
          </h3>
          <p className="text-xs text-muted-foreground">
            {isTh ? `คะแนนผลกระทบ: ${impactScore}` : `Impact score: ${impactScore}`}
          </p>
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
    </div>
  );
}
