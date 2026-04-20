// Frontend-friendly demand engine for /booking page.
// Consumes the public-safe RPC `get_public_demand_hints` and maps raw
// aggregates into easy-to-understand UX states.
//
// Reuses the holiday signal from the admin forecast engine but otherwise
// stays minimal and presentation-focused.

import { isHoliday, isPostHoliday, isNearLongWeekend } from './holidays';

// ---------------- Types ----------------
export interface PublicDemandRaw {
  today_bkk: string;
  history_window_days: number;
  sample_size: number;
  weekday_hour: { dow: number; hour: number; n: number }[];
  weekday_totals: { dow: number; avg_per_day: number; sample_days: number }[];
  hour_totals: { hour: number; n: number }[];
  future_load: { date: string; booked: number }[];
}

export type DemandLevel = 'quiet' | 'comfortable' | 'popular' | 'peak';

export interface SlotHint {
  time: string; // "HH:MM"
  level: DemandLevel;
  isRecommended: boolean;
  label_th: string;
  label_en: string;
}

export interface DayHint {
  date: string; // YYYY-MM-DD
  dow: number; // 1..7 ISO
  level: DemandLevel;
  futureBooked: number; // booked count for this date
  isHoliday: { name_th: string; name_en: string } | null;
  label_th: string;
  label_en: string;
}

export interface DayGuidance {
  bannerHeadline_th: string;
  bannerHeadline_en: string;
  bannerSub_th: string;
  bannerSub_en: string;
  peakWindow: { start: number; end: number } | null;
  quietWindows: { start: number; end: number }[];
  recommendedSlots: string[]; // HH:MM
}

// ---------------- Helpers ----------------

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function quantile(sortedAsc: number[], q: number): number {
  if (sortedAsc.length === 0) return 0;
  const pos = (sortedAsc.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sortedAsc[base + 1] !== undefined) {
    return sortedAsc[base] + rest * (sortedAsc[base + 1] - sortedAsc[base]);
  }
  return sortedAsc[base];
}

function isoDow(date: Date): number {
  // JS getDay: 0=Sun..6=Sat → ISO 1=Mon..7=Sun
  const d = date.getDay();
  return d === 0 ? 7 : d;
}

function levelToLabel(level: DemandLevel) {
  switch (level) {
    case 'quiet':
      return { th: 'ช่วงสบาย', en: 'Quiet' };
    case 'comfortable':
      return { th: 'แนะนำ', en: 'Recommended' };
    case 'popular':
      return { th: 'ช่วงนิยม', en: 'Popular' };
    case 'peak':
      return { th: 'พีค', en: 'Peak' };
  }
}

// ---------------- Slot hints (for chosen date) ----------------

export function buildSlotHints(
  raw: PublicDemandRaw | null,
  dateISO: string,
  slotTimes: string[],
  bookedSlots: Record<string, number> = {},
  capacityPerSlot = 1
): { slots: SlotHint[]; guidance: DayGuidance } {
  const dow = isoDow(new Date(dateISO + 'T00:00:00'));
  const holiday = isHoliday(dateISO);

  // Build hour → typical demand for THIS dow from history
  const dowHourMap = new Map<number, number>();
  if (raw) {
    raw.weekday_hour
      .filter((r) => r.dow === dow)
      .forEach((r) => dowHourMap.set(r.hour, (dowHourMap.get(r.hour) ?? 0) + r.n));
  }

  // Fallback: overall hour totals when this dow has thin data
  const overallHourMap = new Map<number, number>();
  if (raw) {
    raw.hour_totals.forEach((r) => overallHourMap.set(r.hour, r.n));
  }

  // Decide thresholds based on the busier signal source
  const dowHourValues = Array.from(dowHourMap.values()).sort((a, b) => a - b);
  const overallHourValues = Array.from(overallHourMap.values()).sort((a, b) => a - b);

  // Use dow-specific signal if we have at least 3 distinct hours with data,
  // otherwise fall back to overall hour distribution.
  const useOverall = dowHourValues.length < 3;
  const sourceMap = useOverall ? overallHourMap : dowHourMap;
  const sourceValues = useOverall ? overallHourValues : dowHourValues;

  const p50 = quantile(sourceValues, 0.5);
  const p75 = quantile(sourceValues, 0.75);
  const p90 = quantile(sourceValues, 0.9);

  // Per-slot live capacity ratio (0..1) — current booked/capacity
  function liveLevel(time: string): DemandLevel | null {
    const cap = capacityPerSlot;
    if (cap <= 0) return null;
    const ratio = (bookedSlots[time] ?? 0) / cap;
    if (ratio >= 1) return 'peak';
    if (ratio >= 0.7) return 'popular';
    return null;
  }

  function historicalLevel(hour: number): DemandLevel {
    const v = sourceMap.get(hour) ?? 0;
    if (sourceValues.length === 0 || p90 === 0) return 'comfortable';
    if (v >= p90 && v > 0) return 'peak';
    if (v >= p75 && v > 0) return 'popular';
    if (v <= p50) return v === 0 ? 'quiet' : 'comfortable';
    return 'comfortable';
  }

  // On holidays, demand pattern shifts — flatten everything to comfortable
  const holidayOverride: DemandLevel | null = holiday ? 'comfortable' : null;

  const slots: SlotHint[] = slotTimes.map((time) => {
    const hour = parseInt(time.split(':')[0], 10);
    const live = liveLevel(time);
    const hist = holidayOverride ?? historicalLevel(hour);
    // Live signal dominates when present (it means slot is filling NOW)
    const level: DemandLevel = live ?? hist;
    const labels = levelToLabel(level);
    return {
      time,
      level,
      isRecommended: false, // set below
      label_th: labels.th,
      label_en: labels.en,
    };
  });

  // Mark up to 3 quiet/comfortable slots that are still available as Recommended
  const recommended = slots
    .filter((s) => (s.level === 'quiet' || s.level === 'comfortable') && (bookedSlots[s.time] ?? 0) < capacityPerSlot)
    .slice(0, 3);
  recommended.forEach((s) => {
    s.isRecommended = true;
    s.label_th = 'แนะนำ';
    s.label_en = 'Recommended';
  });

  // Detect peak / quiet windows from historical hourly data
  const hourEntries = Array.from(sourceMap.entries()).sort((a, b) => a[0] - b[0]);
  let peakWindow: { start: number; end: number } | null = null;
  if (hourEntries.length > 0 && p75 > 0) {
    const peakHours = hourEntries.filter(([, n]) => n >= p75 && n > 0).map(([h]) => h);
    if (peakHours.length > 0) {
      peakWindow = { start: Math.min(...peakHours), end: Math.max(...peakHours) + 1 };
    }
  }

  const quietWindows: { start: number; end: number }[] = [];
  if (hourEntries.length > 0) {
    const quietHours = hourEntries.filter(([, n]) => n <= p50).map(([h]) => h);
    if (quietHours.length > 0) {
      // Group contiguous hours
      let start = quietHours[0];
      let prev = quietHours[0];
      for (let i = 1; i < quietHours.length; i++) {
        if (quietHours[i] === prev + 1) {
          prev = quietHours[i];
        } else {
          quietWindows.push({ start, end: prev + 1 });
          start = quietHours[i];
          prev = quietHours[i];
        }
      }
      quietWindows.push({ start, end: prev + 1 });
    }
  }

  // Build guidance copy (friendly, supportive tone — no judgment)
  let bannerHeadline_th = 'ช่วงนี้บรรยากาศสบาย ไม่ค่อยหนาแน่น';
  let bannerHeadline_en = 'Looks comfortable today — most slots are available';
  let bannerSub_th = 'เลือกเวลาที่สะดวกได้เลย';
  let bannerSub_en = 'Pick whichever time works best for you';

  if (holiday) {
    bannerHeadline_th = `วันหยุด: ${holiday.name_th}`;
    bannerHeadline_en = `Holiday: ${holiday.name_en}`;
    bannerSub_th = 'หากคลินิกเปิดให้บริการ คาดว่าผู้ใช้บริการจะน้อยกว่าวันปกติ';
    bannerSub_en = 'If the clinic is open, expect fewer visitors than a regular day';
  } else if (peakWindow) {
    const fmt = (h: number) => `${String(h).padStart(2, '0')}:00`;
    bannerHeadline_th = `ช่วง ${fmt(peakWindow.start)}–${fmt(peakWindow.end)} เป็นช่วงนิยม`;
    bannerHeadline_en = `${fmt(peakWindow.start)}–${fmt(peakWindow.end)} tends to be the busiest window`;
    if (quietWindows.length > 0) {
      const q = quietWindows[0];
      bannerSub_th = `หากต้องการรอไม่นาน แนะนำช่วง ${fmt(q.start)}–${fmt(q.end)}`;
      bannerSub_en = `For a smoother visit, ${fmt(q.start)}–${fmt(q.end)} is usually quieter`;
    } else {
      bannerSub_th = 'หากสะดวก แนะนำให้จองล่วงหน้าเพื่อเลือกเวลาที่สะดวก';
      bannerSub_en = 'Booking ahead helps you grab the time that suits you best';
    }
  }

  return {
    slots,
    guidance: {
      bannerHeadline_th,
      bannerHeadline_en,
      bannerSub_th,
      bannerSub_en,
      peakWindow,
      quietWindows,
      recommendedSlots: recommended.map((s) => s.time),
    },
  };
}

// ---------------- Day hints (for calendar / date picker) ----------------

export function buildDayHints(
  raw: PublicDemandRaw | null,
  dates: Date[],
  capacityPerDay = 0
): Map<string, DayHint> {
  const map = new Map<string, DayHint>();
  if (!raw) {
    dates.forEach((d) => {
      const iso = formatISO(d);
      map.set(iso, {
        date: iso,
        dow: isoDow(d),
        level: 'comfortable',
        futureBooked: 0,
        isHoliday: isHoliday(iso),
        label_th: 'แนะนำ',
        label_en: 'Recommended',
      });
    });
    return map;
  }

  // Weekday baseline ranking
  const weekdayAvg = new Map<number, number>();
  raw.weekday_totals.forEach((r) => weekdayAvg.set(r.dow, r.avg_per_day));
  const allAvgs = Array.from(weekdayAvg.values()).sort((a, b) => a - b);
  const dowP50 = quantile(allAvgs, 0.5);
  const dowP75 = quantile(allAvgs, 0.75);

  // Future load lookup
  const futureMap = new Map<string, number>();
  raw.future_load.forEach((r) => futureMap.set(r.date, r.booked));
  const futureValues = Array.from(futureMap.values()).sort((a, b) => a - b);
  const futureP75 = quantile(futureValues, 0.75);
  const futureP90 = quantile(futureValues, 0.9);

  dates.forEach((d) => {
    const iso = formatISO(d);
    const dow = isoDow(d);
    const holiday = isHoliday(iso);
    const futureBooked = futureMap.get(iso) ?? 0;

    let level: DemandLevel = 'comfortable';
    if (holiday) {
      level = 'quiet';
    } else {
      const dowAvg = weekdayAvg.get(dow) ?? 0;
      const isBusyDow = dowAvg >= dowP75 && dowAvg > 0;
      const isQuietDow = dowAvg <= dowP50 && allAvgs.length > 0;

      // Boost via near-term capacity pressure
      const liveCapPressure =
        capacityPerDay > 0 && futureBooked > 0 ? futureBooked / capacityPerDay : 0;

      if (liveCapPressure >= 0.85 || (futureP90 > 0 && futureBooked >= futureP90)) {
        level = 'peak';
      } else if (isBusyDow || (futureP75 > 0 && futureBooked >= futureP75)) {
        level = 'popular';
      } else if (isQuietDow) {
        level = 'quiet';
      }
    }

    if (isPostHoliday(iso) && level === 'comfortable') level = 'popular';

    const labels = levelToLabel(level);
    map.set(iso, {
      date: iso,
      dow,
      level,
      futureBooked,
      isHoliday: holiday ? { name_th: holiday.name_th, name_en: holiday.name_en } : null,
      label_th: labels.th,
      label_en: labels.en,
    });
  });

  return map;
}

function formatISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ---------------- Tailwind helper for badge colors ----------------
// Returned as semantic-token-friendly classes (no raw colors).
export function levelClasses(level: DemandLevel): {
  badge: string;
  dot: string;
  text: string;
} {
  switch (level) {
    case 'quiet':
      return {
        badge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
        dot: 'bg-emerald-500',
        text: 'text-emerald-700 dark:text-emerald-300',
      };
    case 'comfortable':
      return {
        badge: 'bg-primary/10 text-primary border-primary/20',
        dot: 'bg-primary',
        text: 'text-primary',
      };
    case 'popular':
      return {
        badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
        dot: 'bg-amber-500',
        text: 'text-amber-700 dark:text-amber-300',
      };
    case 'peak':
      return {
        badge: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20',
        dot: 'bg-rose-500',
        text: 'text-rose-700 dark:text-rose-300',
      };
  }
}
