import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/lib/i18n';
import { ArrowDown, Loader2 } from 'lucide-react';

interface LinkCascadeProps {
  linkId: string;
  clickCount: number;
  destinationPath: string;
}

// Define the funnel steps to look for in analytics_events
const FUNNEL_STEPS: { key: string; events: string[]; labelTh: string; labelEn: string }[] = [
  { key: 'pageview', events: ['pageview'], labelTh: 'เข้าชมหน้า', labelEn: 'Page Views' },
  { key: 'service_view', events: ['page_view_booking', 'page_view_selftest', 'service_card_view', 'service_detail_view'], labelTh: 'ดูบริการ', labelEn: 'Viewed Service' },
  { key: 'started', events: ['booking_started', 'selftest_started', 'signup_started'], labelTh: 'เริ่มทำ', labelEn: 'Started Action' },
  { key: 'submitted', events: ['booking_submitted', 'booking_created', 'selftest_submitted', 'signup_completed'], labelTh: 'ส่งสำเร็จ', labelEn: 'Submitted' },
  { key: 'completed', events: ['booking_confirmed', 'check_in', 'completed'], labelTh: 'สำเร็จ / Check-in', labelEn: 'Confirmed / Check-in' },
];

export function LinkCascade({ linkId, clickCount, destinationPath }: LinkCascadeProps) {
  const { language } = useLanguage();

  const { data: stepCounts, isLoading } = useQuery({
    queryKey: ['link-cascade', linkId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('analytics_events')
        .select('event_type, anonymous_id, user_id')
        .eq('link_id', linkId);
      if (error) throw error;

      // For each step, count distinct visitors (anonymous_id || user_id) that triggered any matching event
      return FUNNEL_STEPS.map((step) => {
        const visitors = new Set<string>();
        (data as any[]).forEach((row) => {
          if (step.events.includes(row.event_type)) {
            const id = row.user_id || row.anonymous_id;
            if (id) visitors.add(id);
          }
        });
        return { key: step.key, count: visitors.size };
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        <span className="text-xs">{language === 'th' ? 'กำลังโหลด...' : 'Loading cascade...'}</span>
      </div>
    );
  }

  // Build full cascade including the click as step 0
  const cascade = [
    { key: 'click', count: clickCount, labelTh: 'คลิกลิงก์', labelEn: 'Link Clicks' },
    ...FUNNEL_STEPS.map((s, i) => ({
      key: s.key,
      count: stepCounts?.[i]?.count || 0,
      labelTh: s.labelTh,
      labelEn: s.labelEn,
    })),
  ];

  const maxCount = Math.max(...cascade.map((c) => c.count), 1);

  return (
    <div className="mt-3 pt-3 border-t border-border/50">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-muted-foreground">
          {language === 'th' ? '🔄 เส้นทางจากลิงก์นี้' : '🔄 Cascade from this link'}
        </p>
        <code className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
          → {destinationPath}
        </code>
      </div>

      <div className="space-y-1">
        {cascade.map((step, i) => {
          const widthPct = Math.max((step.count / maxCount) * 100, 6);
          const prev = i > 0 ? cascade[i - 1].count : null;
          const dropoff = prev !== null && prev > 0
            ? Math.round(((prev - step.count) / prev) * 100)
            : null;
          const conversion = i === 0 || clickCount === 0
            ? null
            : Math.round((step.count / clickCount) * 100);

          return (
            <div key={step.key} className="flex items-center gap-2">
              <span className="text-[11px] w-24 shrink-0 text-right text-muted-foreground">
                {language === 'th' ? step.labelTh : step.labelEn}
              </span>
              <div className="flex-1 relative">
                <div
                  className="h-6 rounded flex items-center px-2 transition-all"
                  style={{
                    width: `${widthPct}%`,
                    backgroundColor: i === 0
                      ? 'hsl(var(--primary))'
                      : `hsl(var(--primary) / ${Math.max(0.85 - i * 0.13, 0.25)})`,
                    minWidth: '36px',
                  }}
                >
                  <span className="text-[11px] font-medium text-primary-foreground">
                    {step.count}
                  </span>
                </div>
              </div>
              <div className="w-16 shrink-0 flex flex-col items-end leading-tight">
                {conversion !== null && (
                  <span className="text-[10px] text-muted-foreground">
                    {conversion}% {language === 'th' ? 'ของคลิก' : 'of clicks'}
                  </span>
                )}
                {dropoff !== null && dropoff > 0 && i > 0 && (
                  <span className="text-[10px] text-destructive flex items-center gap-0.5">
                    <ArrowDown className="h-2.5 w-2.5" />{dropoff}%
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {clickCount > 0 && cascade[cascade.length - 1].count > 0 && (
        <p className="text-[11px] text-muted-foreground mt-2 text-center">
          {language === 'th' ? '✨ Conversion โดยรวม: ' : '✨ Overall conversion: '}
          <span className="font-semibold text-foreground">
            {Math.round((cascade[cascade.length - 1].count / clickCount) * 100)}%
          </span>
        </p>
      )}
    </div>
  );
}
