import { isHoliday, isPostHoliday, isNearLongWeekend } from './holidays';

// ----------------- Types -----------------
export interface DailyHistoryRow {
  date: string; // YYYY-MM-DD
  dow: number; // 1=Mon..7=Sun
  arrivals: number;
  completed: number;
  no_show: number;
  cancelled: number;
  walkins: number;
  appts: number;
}

export interface WeekdayBaselineRow {
  dow: number;
  avg_arrivals: number;
  avg_completed: number;
  std_arrivals: number | null;
  max_arrivals: number;
  sample_size: number;
}

export interface HourlyBaselineRow {
  dow: number;
  hour: number;
  n: number;
}

export interface FutureBacklogRow {
  date: string;
  booked: number;
}

export interface RollingStats {
  ma7_arrivals: number | null;
  ma30_arrivals: number | null;
  ma90_arrivals: number | null;
  ma7_completed: number | null;
  ma30_completed: number | null;
  completion_rate_30d: number | null;
  no_show_rate_30d: number | null;
  walkin_share_14d: number | null;
  history_days_count: number;
}

export interface ForecastSignals {
  today_bkk: string;
  history_days_count: number;
  rolling: RollingStats;
  daily_history: DailyHistoryRow[];
  weekday_baseline: WeekdayBaselineRow[];
  hourly_baseline: HourlyBaselineRow[];
  future_backlog: FutureBacklogRow[];
}

export type Confidence = 'low' | 'medium' | 'high';

export interface Driver {
  key: string;
  label_th: string;
  label_en: string;
  effect: 'up' | 'down' | 'neutral';
  weight: number; // -1..1
}

export interface DailyForecast {
  date: string;
  dow: number;
  is_today: boolean;
  is_holiday: { name_th: string; name_en: string } | null;
  forecast_arrivals: number;
  forecast_arrivals_low: number;
  forecast_arrivals_high: number;
  forecast_completed: number;
  peak_hours: { start: number; end: number };
  confidence: Confidence;
  drivers: Driver[];
  // Comparison vs weekday baseline
  pct_vs_baseline: number | null;
}

export interface PeriodSummary {
  total_arrivals: number;
  total_completed: number;
  peak_day: { date: string; dow: number; n: number } | null;
  peak_hours: { start: number; end: number };
  pct_vs_previous: number | null; // % change vs previous comparable period
  confidence: Confidence;
  drivers: Driver[];
}

// ----------------- Helpers -----------------

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function isoDow(iso: string): number {
  // 1=Mon..7=Sun (matching Postgres ISODOW)
  const d = new Date(iso + 'T00:00:00');
  const js = d.getDay(); // 0=Sun..6=Sat
  return js === 0 ? 7 : js;
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

// ----------------- Peak hour from baseline -----------------

export function findPeakHourBand(
  hourly: HourlyBaselineRow[],
  dow?: number
): { start: number; end: number } {
  const filtered = dow ? hourly.filter(h => h.dow === dow) : hourly;
  if (!filtered.length) return { start: 11, end: 14 };

  // Aggregate by hour
  const byHour = new Map<number, number>();
  for (const row of filtered) {
    byHour.set(row.hour, (byHour.get(row.hour) ?? 0) + row.n);
  }
  // Find best contiguous 3-hour window
  let bestStart = 11;
  let bestSum = -1;
  for (let h = 8; h <= 18; h++) {
    const sum = (byHour.get(h) ?? 0) + (byHour.get(h + 1) ?? 0) + (byHour.get(h + 2) ?? 0);
    if (sum > bestSum) {
      bestSum = sum;
      bestStart = h;
    }
  }
  return { start: bestStart, end: bestStart + 3 };
}

// ----------------- Daily forecast -----------------

export function forecastDay(
  targetDate: string,
  signals: ForecastSignals
): DailyForecast {
  const dow = isoDow(targetDate);
  const baseline = signals.weekday_baseline.find(b => b.dow === dow);
  const ma7 = signals.rolling.ma7_arrivals ?? 0;
  const ma30 = signals.rolling.ma30_arrivals ?? 0;
  const completionRate = signals.rolling.completion_rate_30d ?? 0.85;

  // Base prediction = weekday baseline (averaged with MA7 for recent shift)
  const baseAvg = baseline?.avg_arrivals ?? ma30 ?? 0;
  const recentBlend = baseAvg * 0.6 + ma7 * 0.4;

  // Adjustments + drivers
  const drivers: Driver[] = [];
  let multiplier = 1.0;

  // Holiday (very low or zero demand on actual holiday)
  const holiday = isHoliday(targetDate);
  if (holiday) {
    multiplier *= 0.15;
    drivers.push({
      key: 'holiday',
      label_th: `วันหยุด: ${holiday.name_th}`,
      label_en: `Holiday: ${holiday.name_en}`,
      effect: 'down',
      weight: -0.85,
    });
  }

  // Sunday closure note (most clinics low on Sun)
  if (dow === 7 && !holiday) {
    drivers.push({
      key: 'sunday',
      label_th: 'วันอาทิตย์ — ปริมาณต่ำตามรอบสัปดาห์',
      label_en: 'Sunday — typically low weekly volume',
      effect: 'down',
      weight: -0.2,
    });
  }

  // Post-holiday rebound (demand 10-25% higher day after holiday)
  const postH = isPostHoliday(targetDate);
  if (postH && !holiday) {
    multiplier *= 1.18;
    drivers.push({
      key: 'post_holiday_rebound',
      label_th: `Backlog หลังวันหยุด (${postH.name_th})`,
      label_en: `Post-holiday rebound (${postH.name_en})`,
      effect: 'up',
      weight: 0.3,
    });
  }

  // Long weekend nearby
  if (isNearLongWeekend(targetDate)) {
    drivers.push({
      key: 'long_weekend',
      label_th: 'อยู่ใกล้ช่วงวันหยุดยาว — อาจมีการเลื่อนนัด',
      label_en: 'Near long weekend — possible reschedule shift',
      effect: 'neutral',
      weight: 0.1,
    });
  }

  // Monday effect — historically high
  if (dow === 1 && !holiday) {
    drivers.push({
      key: 'monday_effect',
      label_th: 'วันจันทร์ — วันต้นสัปดาห์ที่มียอดเข้ารับบริการสูง',
      label_en: 'Monday effect — start-of-week peak day',
      effect: 'up',
      weight: 0.25,
    });
  }

  // Weekend (Sat) — moderate
  if (dow === 6 && !holiday) {
    drivers.push({
      key: 'saturday_weekend',
      label_th: 'วันเสาร์ — ผู้ใช้บริการบางกลุ่มนิยมมาวันหยุด',
      label_en: 'Saturday — preferred by working clients',
      effect: 'neutral',
      weight: 0.05,
    });
  }

  // Backlog from booked appointments
  const backlog = signals.future_backlog.find(b => b.date === targetDate)?.booked ?? 0;
  if (backlog > (baseline?.avg_arrivals ?? 0) * 1.2 && backlog > 5) {
    multiplier *= 1.1;
    drivers.push({
      key: 'high_booking_backlog',
      label_th: `Appointment ที่จองล่วงหน้า ${backlog} รายการ — สูงกว่าค่าเฉลี่ย`,
      label_en: `${backlog} pre-booked appointments — above average`,
      effect: 'up',
      weight: 0.25,
    });
  } else if (backlog > 0) {
    drivers.push({
      key: 'pre_booked',
      label_th: `มีการจองล่วงหน้า ${backlog} รายการ`,
      label_en: `${backlog} pre-booked appointment(s)`,
      effect: 'neutral',
      weight: 0.05,
    });
  }

  // MA7 vs MA30 momentum
  if (ma7 > ma30 * 1.15 && ma30 > 0) {
    multiplier *= 1.05;
    drivers.push({
      key: 'recent_uptrend',
      label_th: `แนวโน้ม 7 วันล่าสุดสูงกว่าค่าเฉลี่ย 30 วัน (+${Math.round(((ma7 / ma30) - 1) * 100)}%)`,
      label_en: `7-day trend above 30-day mean (+${Math.round(((ma7 / ma30) - 1) * 100)}%)`,
      effect: 'up',
      weight: 0.2,
    });
  } else if (ma7 < ma30 * 0.85 && ma30 > 0) {
    multiplier *= 0.95;
    drivers.push({
      key: 'recent_downtrend',
      label_th: `แนวโน้ม 7 วันล่าสุดต่ำกว่าค่าเฉลี่ย 30 วัน (-${Math.round((1 - ma7 / ma30) * 100)}%)`,
      label_en: `7-day trend below 30-day mean (-${Math.round((1 - ma7 / ma30) * 100)}%)`,
      effect: 'down',
      weight: -0.2,
    });
  }

  const forecast = Math.max(0, Math.round(recentBlend * multiplier));
  const std = baseline?.std_arrivals ?? Math.max(1, forecast * 0.25);
  const lowBand = Math.max(0, Math.round(forecast - std));
  const highBand = Math.round(forecast + std);

  // Confidence: based on sample size + std/mean ratio + history depth
  let confidence: Confidence = 'medium';
  const sample = baseline?.sample_size ?? 0;
  const cv = baseline && baseline.avg_arrivals > 0 ? (baseline.std_arrivals ?? 0) / baseline.avg_arrivals : 1;
  if (signals.history_days_count < 21 || sample < 3) {
    confidence = 'low';
  } else if (sample >= 8 && cv < 0.4 && signals.history_days_count >= 60) {
    confidence = 'high';
  } else if (cv > 0.7) {
    confidence = 'low';
  }

  const peakBand = findPeakHourBand(signals.hourly_baseline, dow);
  const today = signals.today_bkk;

  // Comparison vs weekday baseline
  const pct = baseline && baseline.avg_arrivals > 0
    ? Math.round(((forecast - baseline.avg_arrivals) / baseline.avg_arrivals) * 100)
    : null;

  return {
    date: targetDate,
    dow,
    is_today: targetDate === today,
    is_holiday: holiday ? { name_th: holiday.name_th, name_en: holiday.name_en } : null,
    forecast_arrivals: forecast,
    forecast_arrivals_low: lowBand,
    forecast_arrivals_high: highBand,
    forecast_completed: Math.round(forecast * clamp(completionRate || 0.85, 0.5, 1)),
    peak_hours: peakBand,
    confidence,
    drivers: drivers.slice(0, 5),
    pct_vs_baseline: pct,
  };
}

export function forecastNextDays(signals: ForecastSignals, days: number): DailyForecast[] {
  const out: DailyForecast[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(signals.today_bkk, i);
    out.push(forecastDay(date, signals));
  }
  return out;
}

// ----------------- Period summaries -----------------

function summarize(forecasts: DailyForecast[], previousActuals: number[] | null): PeriodSummary {
  const total_arrivals = forecasts.reduce((s, f) => s + f.forecast_arrivals, 0);
  const total_completed = forecasts.reduce((s, f) => s + f.forecast_completed, 0);
  let peak_day = null as PeriodSummary['peak_day'];
  for (const f of forecasts) {
    if (!peak_day || f.forecast_arrivals > peak_day.n) {
      peak_day = { date: f.date, dow: f.dow, n: f.forecast_arrivals };
    }
  }

  // Average peak band: use median of peak band starts
  const starts = forecasts.map(f => f.peak_hours.start);
  const medStart = Math.round(median(starts));
  const peak_hours = { start: medStart, end: medStart + 3 };

  // Compare with previous period
  let pct_vs_previous: number | null = null;
  if (previousActuals && previousActuals.length > 0) {
    const prevSum = previousActuals.reduce((s, n) => s + n, 0);
    if (prevSum > 0) {
      pct_vs_previous = Math.round(((total_arrivals - prevSum) / prevSum) * 100);
    }
  }

  // Aggregate confidence
  const confCounts = forecasts.reduce<Record<Confidence, number>>(
    (acc, f) => ({ ...acc, [f.confidence]: (acc[f.confidence] ?? 0) + 1 }),
    { low: 0, medium: 0, high: 0 }
  );
  let confidence: Confidence = 'medium';
  if (confCounts.high >= forecasts.length * 0.5) confidence = 'high';
  else if (confCounts.low >= forecasts.length * 0.5) confidence = 'low';

  // Aggregate drivers — top 4 by combined weight
  const driverScore = new Map<string, Driver & { score: number }>();
  for (const f of forecasts) {
    for (const d of f.drivers) {
      const cur = driverScore.get(d.key);
      if (cur) {
        cur.score += Math.abs(d.weight);
      } else {
        driverScore.set(d.key, { ...d, score: Math.abs(d.weight) });
      }
    }
  }
  const drivers = [...driverScore.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(({ score, ...rest }) => rest);

  return {
    total_arrivals,
    total_completed,
    peak_day,
    peak_hours,
    pct_vs_previous,
    confidence,
    drivers,
  };
}

export function buildWeeklyForecast(signals: ForecastSignals): PeriodSummary {
  const next7 = forecastNextDays(signals, 7);
  // previous 7 days actuals (excluding today)
  const todayIdx = signals.daily_history.findIndex(h => h.date === signals.today_bkk);
  const last = todayIdx >= 0 ? signals.daily_history.slice(Math.max(0, todayIdx - 7), todayIdx) : signals.daily_history.slice(-7);
  return summarize(next7, last.map(d => d.arrivals));
}

export function buildMonthlyForecast(signals: ForecastSignals): PeriodSummary {
  const next30 = forecastNextDays(signals, 30);
  // previous 30 days actuals
  const last = signals.daily_history.slice(-30);
  return summarize(next30, last.map(d => d.arrivals));
}

export function buildDailyForecasts(signals: ForecastSignals, days: number): DailyForecast[] {
  return forecastNextDays(signals, days);
}
