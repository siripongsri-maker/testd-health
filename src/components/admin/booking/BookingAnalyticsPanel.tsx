import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, BarChart3, Clock, CalendarDays, TrendingUp, Building2, Bot, User, UserCheck, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { BranchOption } from './types';

interface HourBucket { hour: number; n: number; }
interface DowBucket { dow: number; n: number; }
interface LeadStats {
  avg_lead: number | null;
  median_lead: number | null;
  p90_lead: number | null;
  min_lead: number | null;
  max_lead: number | null;
}
interface BranchStat {
  branch_id: string | null;
  name_th: string | null;
  name_en: string | null;
  total: number;
  avg_lead: number | null;
}
interface CheckoutBucket { method: string; n: number; }
interface SourceBucket { source: string; n: number; }

interface AnalyticsResult {
  period_days: number;
  total_bookings: number;
  by_booking_hour: HourBucket[];
  by_booking_weekday: DowBucket[];
  by_appointment_hour: HourBucket[];
  by_appointment_weekday: DowBucket[];
  lead_time: LeadStats | null;
  by_source: SourceBucket[];
  by_branch: BranchStat[];
  checkout_breakdown: CheckoutBucket[];
}

interface Props {
  branches: BranchOption[];
  branchFilter: string; // 'all' | branchId
}

const DOW_LABELS_TH = ['', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'];
const DOW_LABELS_EN = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const CHECKOUT_LABELS: Record<string, { th: string; en: string; color: string; icon: any }> = {
  staff: { th: 'โดยเจ้าหน้าที่', en: 'By Staff', color: 'text-blue-600 dark:text-blue-400', icon: UserCheck },
  self: { th: 'เช็คเอาท์เอง', en: 'Self Check-out', color: 'text-emerald-600 dark:text-emerald-400', icon: User },
  auto: { th: 'อัตโนมัติ', en: 'Auto', color: 'text-amber-600 dark:text-amber-400', icon: Bot },
  no_show: { th: 'ไม่มาตามนัด', en: 'No-show', color: 'text-red-600 dark:text-red-400', icon: AlertCircle },
  pending: { th: 'ยังไม่เช็คเอาท์', en: 'Pending', color: 'text-muted-foreground', icon: Clock },
};

export function BookingAnalyticsPanel({ branches, branchFilter }: Props) {
  const { language } = useLanguage();
  const [days, setDays] = useState<number>(30);
  const [data, setData] = useState<AnalyticsResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const branchId = branchFilter === 'all' ? null : branchFilter;
    (supabase.rpc as any)('get_booking_analytics', { p_days: days, p_branch_id: branchId })
      .then(({ data, error }: any) => {
        if (cancelled) return;
        if (error) {
          console.error('booking analytics error', error);
          setData(null);
        } else {
          setData(data as AnalyticsResult);
        }
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [days, branchFilter]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <Card className="p-6 text-center text-sm text-muted-foreground">
        {language === 'th' ? 'ไม่สามารถโหลดข้อมูลได้' : 'Unable to load analytics'}
      </Card>
    );
  }

  // Peak hour windows
  const sortedHours = [...data.by_appointment_hour].sort((a, b) => b.n - a.n).slice(0, 3);
  const sortedDow = [...data.by_appointment_weekday].sort((a, b) => b.n - a.n).slice(0, 3);
  const maxHourN = Math.max(1, ...data.by_appointment_hour.map(h => h.n));
  const maxDowN = Math.max(1, ...data.by_appointment_weekday.map(d => d.n));
  const dowLabels = language === 'th' ? DOW_LABELS_TH : DOW_LABELS_EN;

  // Anomaly detection: check if any branch is >50% above mean
  const branchMean = data.by_branch.length > 0
    ? data.by_branch.reduce((s, b) => s + b.total, 0) / data.by_branch.length
    : 0;
  const anomalies = data.by_branch.filter(b => b.total > branchMean * 1.5 && data.by_branch.length > 1);

  return (
    <div className="space-y-3">
      {/* Header / period selector */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold">
            {language === 'th' ? 'พฤติกรรมการจอง' : 'Booking Insights'}
          </h3>
          <span className="text-xs text-muted-foreground">
            ({data.total_bookings} {language === 'th' ? 'รายการ' : 'bookings'})
          </span>
        </div>
        <Select value={String(days)} onValueChange={(v) => setDays(parseInt(v))}>
          <SelectTrigger className="w-32 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">{language === 'th' ? '7 วัน' : '7 days'}</SelectItem>
            <SelectItem value="14">{language === 'th' ? '14 วัน' : '14 days'}</SelectItem>
            <SelectItem value="30">{language === 'th' ? '30 วัน' : '30 days'}</SelectItem>
            <SelectItem value="90">{language === 'th' ? '90 วัน' : '90 days'}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Top KPIs: Lead time + Peak windows */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Card className="p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
            {language === 'th' ? 'จองล่วงหน้าเฉลี่ย' : 'Avg Lead Time'}
          </p>
          <p className="text-2xl font-bold text-primary">
            {data.lead_time?.avg_lead?.toFixed(1) ?? '–'}
            <span className="text-xs ml-1 font-normal text-muted-foreground">
              {language === 'th' ? 'วัน' : 'days'}
            </span>
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {language === 'th' ? 'มัธยฐาน' : 'Median'} {data.lead_time?.median_lead?.toFixed(0) ?? '–'} · P90 {data.lead_time?.p90_lead?.toFixed(0) ?? '–'}
          </p>
        </Card>

        <Card className="p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {language === 'th' ? 'ชั่วโมงพีค (นัด)' : 'Peak Appt Hour'}
          </p>
          <p className="text-2xl font-bold text-primary">
            {sortedHours[0]
              ? `${String(sortedHours[0].hour).padStart(2, '0')}:00`
              : '–'}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {sortedHours[0]?.n || 0} {language === 'th' ? 'นัด' : 'appts'}
          </p>
        </Card>

        <Card className="p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <CalendarDays className="h-3 w-3" />
            {language === 'th' ? 'วันพีค (นัด)' : 'Peak Weekday'}
          </p>
          <p className="text-2xl font-bold text-primary">
            {sortedDow[0] ? dowLabels[sortedDow[0].dow] : '–'}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {sortedDow[0]?.n || 0} {language === 'th' ? 'นัด' : 'appts'}
          </p>
        </Card>

        <Card className="p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            {language === 'th' ? 'ช่องทาง' : 'Source Mix'}
          </p>
          <div className="flex flex-col gap-0.5 mt-1">
            {data.by_source.map(s => (
              <div key={s.source} className="flex items-center justify-between text-[11px]">
                <span className="capitalize text-muted-foreground">{s.source}</span>
                <span className="font-bold">{s.n}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Hour distribution (appointment hour) */}
      <Card className="p-3">
        <p className="text-xs font-semibold mb-2 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {language === 'th' ? 'การกระจายตัวตามชั่วโมงนัด' : 'Bookings by Appointment Hour'}
        </p>
        <div className="flex items-end gap-1 h-24">
          {Array.from({ length: 24 }).map((_, h) => {
            const bucket = data.by_appointment_hour.find(b => b.hour === h);
            const n = bucket?.n || 0;
            const pct = (n / maxHourN) * 100;
            const isPeak = sortedHours.some(p => p.hour === h);
            return (
              <div key={h} className="flex-1 flex flex-col items-center gap-1 group" title={`${h}:00 — ${n}`}>
                <div className="w-full flex-1 flex items-end">
                  <div
                    className={cn(
                      "w-full rounded-t transition-all",
                      isPeak ? 'bg-primary' : 'bg-primary/30 group-hover:bg-primary/60'
                    )}
                    style={{ height: `${pct}%`, minHeight: n > 0 ? '2px' : '0' }}
                  />
                </div>
                <span className="text-[8px] text-muted-foreground font-mono">
                  {h % 3 === 0 ? String(h).padStart(2, '0') : ''}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Weekday distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="p-3">
          <p className="text-xs font-semibold mb-2 flex items-center gap-1">
            <CalendarDays className="h-3 w-3" />
            {language === 'th' ? 'ตามวันในสัปดาห์ (วันที่นัด)' : 'By Weekday (appointment date)'}
          </p>
          <div className="flex items-end gap-2 h-24">
            {[1, 2, 3, 4, 5, 6, 7].map(dow => {
              const bucket = data.by_appointment_weekday.find(b => b.dow === dow);
              const n = bucket?.n || 0;
              const pct = (n / maxDowN) * 100;
              const isPeak = sortedDow.some(p => p.dow === dow);
              return (
                <div key={dow} className="flex-1 flex flex-col items-center gap-1" title={`${dowLabels[dow]} — ${n}`}>
                  <div className="w-full flex-1 flex items-end">
                    <div
                      className={cn("w-full rounded-t transition-all", isPeak ? 'bg-primary' : 'bg-primary/30')}
                      style={{ height: `${pct}%`, minHeight: n > 0 ? '2px' : '0' }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium">{dowLabels[dow]}</span>
                  <span className="text-[10px] font-bold">{n}</span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Checkout method breakdown */}
        <Card className="p-3">
          <p className="text-xs font-semibold mb-2 flex items-center gap-1">
            <UserCheck className="h-3 w-3" />
            {language === 'th' ? 'วิธีการเช็คเอาท์' : 'Checkout Method'}
          </p>
          <div className="space-y-1.5">
            {data.checkout_breakdown.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">–</p>
            ) : data.checkout_breakdown.map(c => {
              const cfg = CHECKOUT_LABELS[c.method] || CHECKOUT_LABELS.pending;
              const Icon = cfg.icon;
              const total = data.checkout_breakdown.reduce((s, x) => s + x.n, 0);
              const pct = total > 0 ? Math.round((c.n / total) * 100) : 0;
              return (
                <div key={c.method} className="flex items-center gap-2">
                  <Icon className={cn("h-3.5 w-3.5 shrink-0", cfg.color)} />
                  <span className="text-xs flex-1">{language === 'th' ? cfg.th : cfg.en}</span>
                  <span className="text-xs font-bold">{c.n}</span>
                  <span className="text-[10px] text-muted-foreground w-10 text-right">{pct}%</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Branch comparison */}
      {data.by_branch.length > 0 && branchFilter === 'all' && (
        <Card className="p-3">
          <p className="text-xs font-semibold mb-2 flex items-center gap-1">
            <Building2 className="h-3 w-3" />
            {language === 'th' ? 'เปรียบเทียบตามสาขา' : 'Branch Comparison'}
          </p>
          <div className="space-y-1.5">
            {data.by_branch.map(b => {
              const isAnomaly = anomalies.some(a => a.branch_id === b.branch_id);
              const maxTotal = Math.max(...data.by_branch.map(x => x.total));
              const pct = maxTotal > 0 ? (b.total / maxTotal) * 100 : 0;
              return (
                <div key={b.branch_id || 'none'} className="flex items-center gap-2">
                  <span className="text-xs w-24 truncate" title={language === 'th' ? b.name_th || '' : b.name_en || ''}>
                    {language === 'th' ? b.name_th : b.name_en}
                  </span>
                  <div className="flex-1 h-4 rounded bg-muted overflow-hidden relative">
                    <div
                      className={cn("h-full rounded transition-all", isAnomaly ? 'bg-amber-500' : 'bg-primary')}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold w-10 text-right">{b.total}</span>
                  <span className="text-[10px] text-muted-foreground w-16 text-right">
                    {b.avg_lead != null ? `${b.avg_lead}d lead` : '–'}
                  </span>
                  {isAnomaly && (
                    <AlertCircle className="h-3 w-3 text-amber-500"><title>{language === 'th' ? 'สูงผิดปกติ' : 'Anomaly'}</title></AlertCircle>
                  )}
                </div>
              );
            })}
          </div>
          {anomalies.length > 0 && (
            <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {language === 'th'
                ? `${anomalies.length} สาขามีปริมาณการจองสูงกว่าค่าเฉลี่ย 50%+`
                : `${anomalies.length} branch(es) have 50%+ above mean booking volume`}
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
