import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Loader2, Users, CheckCircle2, Calendar, Activity, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import {
  buildDailyForecasts,
  buildWeeklyForecast,
  buildMonthlyForecast,
  type ForecastSignals,
  type DailyForecast,
  type PeriodSummary,
} from '@/lib/forecast/forecastEngine';
import type { BranchOption } from './types';
import { ForecastDriversPanel } from './forecast/ForecastDriversPanel';
import { NarrativeCard } from './forecast/NarrativeCard';
import { DailyForecastList } from './forecast/DailyForecastList';
import { PeakHeatmap } from './forecast/PeakHeatmap';

interface Props {
  branches: BranchOption[];
  branchFilter: string;
}

type ScopeTab = 'daily' | 'weekly' | 'monthly';

const DOW_TH = ['', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'];
const DOW_EN = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const CONF_LABEL = {
  th: { low: 'ต่ำ', medium: 'กลาง', high: 'สูง' },
  en: { low: 'Low', medium: 'Medium', high: 'High' },
};

export function ForecastPanel({ branches, branchFilter }: Props) {
  const { language } = useLanguage();
  const [signals, setSignals] = useState<ForecastSignals | null>(null);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<ScopeTab>('daily');
  const [dailyHorizon, setDailyHorizon] = useState<7 | 14 | 30>(7);
  const [sourceFilter, setSourceFilter] = useState<'all' | 'appointment' | 'walkin'>('all');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const branchId = branchFilter === 'all' ? null : branchFilter;
    (supabase.rpc as any)('get_forecast_signals', {
      p_branch_id: branchId,
      p_history_days: 120,
      p_source_filter: sourceFilter,
    }).then(({ data, error }: any) => {
      if (cancelled) return;
      if (error) {
        console.error('forecast signals error', error);
        setSignals(null);
      } else {
        setSignals(data as ForecastSignals);
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [branchFilter, sourceFilter]);

  const branchName = useMemo(() => {
    if (branchFilter === 'all') return null;
    const b = branches.find(b => b.id === branchFilter);
    return b ? (language === 'th' ? b.name_th : b.name_en) : null;
  }, [branches, branchFilter, language]);

  const dailyForecasts = useMemo<DailyForecast[]>(() => {
    if (!signals) return [];
    return buildDailyForecasts(signals, dailyHorizon);
  }, [signals, dailyHorizon]);

  const weeklySummary = useMemo<PeriodSummary | null>(() => signals ? buildWeeklyForecast(signals) : null, [signals]);
  const monthlySummary = useMemo<PeriodSummary | null>(() => signals ? buildMonthlyForecast(signals) : null, [signals]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!signals) {
    return (
      <Card className="p-6 text-center text-sm text-muted-foreground">
        {language === 'th' ? 'ไม่สามารถโหลดข้อมูล forecast ได้' : 'Unable to load forecast'}
      </Card>
    );
  }

  const lowData = signals.history_days_count < 14;
  const dowLabels = language === 'th' ? DOW_TH : DOW_EN;

  // ---------- Today's hero ----------
  const today = dailyForecasts[0];

  return (
    <div className="space-y-3">
      {/* Header + filters */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold">
            {language === 'th' ? 'AI Forecast & Insight Engine' : 'AI Forecast & Insight Engine'}
          </h3>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Source filter */}
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as any)}
            className="h-7 rounded-md border border-input bg-background px-2 text-[11px]"
          >
            <option value="all">{language === 'th' ? 'ทุกช่องทาง' : 'All sources'}</option>
            <option value="appointment">{language === 'th' ? 'เฉพาะ Appointment' : 'Appointment'}</option>
            <option value="walkin">{language === 'th' ? 'เฉพาะ Walk-in' : 'Walk-in'}</option>
          </select>
        </div>
      </div>

      {/* Scope tabs */}
      <div className="inline-flex rounded-lg border border-border/40 overflow-hidden text-xs">
        {(['daily', 'weekly', 'monthly'] as const).map(s => (
          <button
            key={s}
            onClick={() => setScope(s)}
            className={cn(
              'px-3 py-1.5 font-medium transition-colors',
              scope === s ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'
            )}
          >
            {s === 'daily' && (language === 'th' ? 'รายวัน' : 'Daily')}
            {s === 'weekly' && (language === 'th' ? 'รายสัปดาห์' : 'Weekly')}
            {s === 'monthly' && (language === 'th' ? 'รายเดือน' : 'Monthly')}
          </button>
        ))}
      </div>

      {/* Low-data warning */}
      {lowData && (
        <Card className="p-3 border-amber-300/40 bg-amber-50/50 dark:bg-amber-950/20">
          <p className="text-[11px] text-amber-700 dark:text-amber-300 flex items-start gap-1.5 leading-snug">
            <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>
              {language === 'th'
                ? `ยังมีข้อมูลย้อนหลังเพียง ${signals.history_days_count} วัน ระบบจะแสดงแนวโน้มเบื้องต้น confidence อาจไม่สูงนัก`
                : `Only ${signals.history_days_count} days of history available — confidence may be limited.`}
            </span>
          </p>
        </Card>
      )}

      {/* ============== DAILY VIEW ============== */}
      {scope === 'daily' && today && (
        <>
          {/* Today hero KPI */}
          <Card className="p-4 bg-gradient-to-br from-primary/10 to-background border-primary/30">
            <div className="flex items-center justify-between mb-2 gap-2">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  {language === 'th' ? 'วันนี้' : 'Today'} · {branchName ?? (language === 'th' ? 'ทุกสาขา' : 'All branches')}
                </p>
                <p className="text-xs font-medium">
                  {dowLabels[today.dow]} {new Date(today.date + 'T00:00:00').toLocaleDateString(
                    language === 'th' ? 'th-TH' : 'en-US',
                    { day: 'numeric', month: 'long', year: 'numeric' }
                  )}
                </p>
              </div>
              <div
                className={cn(
                  'text-[10px] font-semibold px-2 py-1 rounded uppercase',
                  today.confidence === 'high' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
                  today.confidence === 'medium' && 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
                  today.confidence === 'low' && 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                )}
              >
                {language === 'th' ? 'ความมั่นใจ' : 'Confidence'}: {CONF_LABEL[language][today.confidence]}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {language === 'th' ? 'คาดผู้รับบริการ' : 'Forecast arrivals'}
                </p>
                <p className="text-2xl font-bold text-primary tabular-nums">
                  {today.forecast_arrivals}
                </p>
                <p className="text-[10px] text-muted-foreground tabular-nums">
                  ({today.forecast_arrivals_low}–{today.forecast_arrivals_high})
                  {today.pct_vs_baseline != null && (
                    <span className={cn(
                      'ml-1 font-semibold',
                      today.pct_vs_baseline > 0 ? 'text-emerald-600 dark:text-emerald-400' : today.pct_vs_baseline < 0 ? 'text-rose-600 dark:text-rose-400' : ''
                    )}>
                      {today.pct_vs_baseline > 0 ? '+' : ''}{today.pct_vs_baseline}%
                    </span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {language === 'th' ? 'คาดเคสที่จบ' : 'Completed cases'}
                </p>
                <p className="text-2xl font-bold tabular-nums">
                  {today.forecast_completed}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {language === 'th' ? 'อิงจาก completion rate 30 วัน' : 'Based on 30d completion rate'}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {language === 'th' ? 'ช่วงพีค' : 'Peak hours'}
                </p>
                <p className="text-2xl font-bold font-mono tabular-nums">
                  {String(today.peak_hours.start).padStart(2, '0')}–{String(today.peak_hours.end).padStart(2, '0')}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {language === 'th' ? 'อิงจาก hourly pattern 60 วัน' : 'From 60-day hourly pattern'}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">
                  {language === 'th' ? 'ค่าเฉลี่ย 7 วัน' : '7-day moving avg'}
                </p>
                <p className="text-2xl font-bold tabular-nums">
                  {signals.rolling.ma7_arrivals?.toFixed(0) ?? '–'}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {language === 'th' ? 'เทียบ 30 วัน' : 'vs 30d'}: {signals.rolling.ma30_arrivals?.toFixed(0) ?? '–'}
                </p>
              </div>
            </div>
          </Card>

          {/* AI narrative for today */}
          <NarrativeCard
            language={language as 'th' | 'en'}
            scope="daily"
            triggerKey={`daily-${today.date}-${branchFilter}-${sourceFilter}`}
            context={{
              target_date: today.date,
              forecast_arrivals: today.forecast_arrivals,
              forecast_completed: today.forecast_completed,
              peak_hours: today.peak_hours,
              confidence: today.confidence,
              pct_vs_baseline: today.pct_vs_baseline,
              drivers: today.drivers,
              branch_name: branchName,
            }}
          />

          {/* Drivers for today */}
          <ForecastDriversPanel
            drivers={today.drivers}
            language={language as 'th' | 'en'}
            title={language === 'th' ? `ปัจจัยของวันนี้ (${dowLabels[today.dow]})` : `Today's Drivers (${dowLabels[today.dow]})`}
          />

          {/* Horizon selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {language === 'th' ? 'ดูล่วงหน้า' : 'Horizon'}:
            </span>
            {([7, 14, 30] as const).map(d => (
              <button
                key={d}
                onClick={() => setDailyHorizon(d)}
                className={cn(
                  'px-2.5 py-1 rounded text-xs font-medium border transition-colors',
                  dailyHorizon === d ? 'bg-primary text-primary-foreground border-primary' : 'border-border/40 hover:bg-muted'
                )}
              >
                {d} {language === 'th' ? 'วัน' : 'days'}
              </button>
            ))}
          </div>

          {/* Daily list */}
          <DailyForecastList forecasts={dailyForecasts} language={language as 'th' | 'en'} />
        </>
      )}

      {/* ============== WEEKLY VIEW ============== */}
      {scope === 'weekly' && weeklySummary && (
        <>
          <Card className="p-4 bg-gradient-to-br from-primary/10 to-background border-primary/30">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
              {language === 'th' ? 'สัปดาห์ถัดไป (7 วัน)' : 'Next 7 days'} · {branchName ?? (language === 'th' ? 'ทุกสาขา' : 'All branches')}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <p className="text-[10px] text-muted-foreground">
                  {language === 'th' ? 'คาดผู้รับบริการรวม' : 'Total arrivals'}
                </p>
                <p className="text-2xl font-bold text-primary tabular-nums">{weeklySummary.total_arrivals}</p>
                {weeklySummary.pct_vs_previous != null && (
                  <p className={cn(
                    'text-[10px] font-semibold',
                    weeklySummary.pct_vs_previous > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  )}>
                    {weeklySummary.pct_vs_previous > 0 ? '+' : ''}{weeklySummary.pct_vs_previous}% {language === 'th' ? 'จากสัปดาห์ก่อน' : 'vs prev week'}
                  </p>
                )}
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">
                  {language === 'th' ? 'เคสที่จะจบ' : 'Total completed'}
                </p>
                <p className="text-2xl font-bold tabular-nums">{weeklySummary.total_completed}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">
                  {language === 'th' ? 'วันพีค' : 'Peak day'}
                </p>
                <p className="text-2xl font-bold tabular-nums">
                  {weeklySummary.peak_day ? dowLabels[weeklySummary.peak_day.dow] : '–'}
                </p>
                <p className="text-[10px] text-muted-foreground tabular-nums">
                  {weeklySummary.peak_day?.n ?? 0} {language === 'th' ? 'คน' : 'arrivals'}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">
                  {language === 'th' ? 'ช่วงพีคเฉลี่ย' : 'Avg peak hours'}
                </p>
                <p className="text-2xl font-bold font-mono tabular-nums">
                  {String(weeklySummary.peak_hours.start).padStart(2, '0')}–{String(weeklySummary.peak_hours.end).padStart(2, '0')}
                </p>
              </div>
            </div>
          </Card>

          <NarrativeCard
            language={language as 'th' | 'en'}
            scope="weekly"
            triggerKey={`weekly-${signals.today_bkk}-${branchFilter}-${sourceFilter}`}
            context={{
              forecast_arrivals: weeklySummary.total_arrivals,
              forecast_completed: weeklySummary.total_completed,
              peak_hours: weeklySummary.peak_hours,
              peak_day: weeklySummary.peak_day ? { date: weeklySummary.peak_day.date, n: weeklySummary.peak_day.n } : null,
              confidence: weeklySummary.confidence,
              pct_vs_previous: weeklySummary.pct_vs_previous,
              drivers: weeklySummary.drivers,
              branch_name: branchName,
            }}
          />

          <ForecastDriversPanel drivers={weeklySummary.drivers} language={language as 'th' | 'en'} />
          <DailyForecastList forecasts={dailyForecasts.slice(0, 7)} language={language as 'th' | 'en'} />
          <PeakHeatmap hourly={signals.hourly_baseline} forecasts={dailyForecasts} language={language as 'th' | 'en'} />
        </>
      )}

      {/* ============== MONTHLY VIEW ============== */}
      {scope === 'monthly' && monthlySummary && (
        <>
          <Card className="p-4 bg-gradient-to-br from-primary/10 to-background border-primary/30">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
              {language === 'th' ? '30 วันข้างหน้า' : 'Next 30 days'} · {branchName ?? (language === 'th' ? 'ทุกสาขา' : 'All branches')}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <p className="text-[10px] text-muted-foreground">
                  {language === 'th' ? 'คาดผู้รับบริการรวม' : 'Total arrivals'}
                </p>
                <p className="text-2xl font-bold text-primary tabular-nums">{monthlySummary.total_arrivals}</p>
                {monthlySummary.pct_vs_previous != null && (
                  <p className={cn(
                    'text-[10px] font-semibold',
                    monthlySummary.pct_vs_previous > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  )}>
                    {monthlySummary.pct_vs_previous > 0 ? '+' : ''}{monthlySummary.pct_vs_previous}% {language === 'th' ? 'จาก 30 วันก่อน' : 'vs prev 30d'}
                  </p>
                )}
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">
                  {language === 'th' ? 'เฉลี่ย/วัน' : 'Avg per day'}
                </p>
                <p className="text-2xl font-bold tabular-nums">{Math.round(monthlySummary.total_arrivals / 30)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">
                  {language === 'th' ? 'วันพีคของช่วง' : 'Peak weekday'}
                </p>
                <p className="text-2xl font-bold tabular-nums">
                  {monthlySummary.peak_day ? dowLabels[monthlySummary.peak_day.dow] : '–'}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">
                  {language === 'th' ? 'ชั่วโมงพีคเฉลี่ย' : 'Avg peak hours'}
                </p>
                <p className="text-2xl font-bold font-mono tabular-nums">
                  {String(monthlySummary.peak_hours.start).padStart(2, '0')}–{String(monthlySummary.peak_hours.end).padStart(2, '0')}
                </p>
              </div>
            </div>
          </Card>

          <NarrativeCard
            language={language as 'th' | 'en'}
            scope="monthly"
            triggerKey={`monthly-${signals.today_bkk}-${branchFilter}-${sourceFilter}`}
            context={{
              forecast_arrivals: monthlySummary.total_arrivals,
              forecast_completed: monthlySummary.total_completed,
              peak_hours: monthlySummary.peak_hours,
              peak_day: monthlySummary.peak_day ? { date: monthlySummary.peak_day.date, n: monthlySummary.peak_day.n } : null,
              confidence: monthlySummary.confidence,
              pct_vs_previous: monthlySummary.pct_vs_previous,
              drivers: monthlySummary.drivers,
              branch_name: branchName,
            }}
          />

          <ForecastDriversPanel drivers={monthlySummary.drivers} language={language as 'th' | 'en'} />
          <PeakHeatmap hourly={signals.hourly_baseline} forecasts={dailyForecasts} language={language as 'th' | 'en'} />
        </>
      )}

      {/* Transparency footer */}
      <Card className="p-3 bg-muted/30 border-dashed">
        <p className="text-[10px] text-muted-foreground leading-relaxed flex items-start gap-1.5">
          <Info className="h-3 w-3 shrink-0 mt-0.5" />
          <span>
            {language === 'th'
              ? `Forecast นี้เป็นการคาดการณ์จากข้อมูลย้อนหลัง ${signals.history_days_count} วันในระบบ ร่วมกับสัญญาณภายในเช่น weekday pattern, hourly distribution, appointment backlog, MA7/MA30 momentum, วันหยุดราชการไทย และ post-holiday rebound — ใช้เพื่อการวางแผน capacity เท่านั้น ไม่ใช่ตัวเลขยืนยันจริง`
              : `This forecast is a heuristic projection from ${signals.history_days_count} days of internal history, combining weekday patterns, hourly distribution, booking backlog, MA7/MA30 momentum, Thai public holidays and post-holiday rebound. Use for capacity planning, not as a guaranteed value.`}
          </span>
        </p>
      </Card>
    </div>
  );
}
