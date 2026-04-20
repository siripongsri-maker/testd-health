// Thai public holidays 2026 (subset relevant for clinic operations).
// Source: Thai Bank of Thailand holiday calendar 2026.
// Format: YYYY-MM-DD in Asia/Bangkok local date.
export interface Holiday {
  date: string;
  name_th: string;
  name_en: string;
  is_long_weekend?: boolean;
}

export const TH_HOLIDAYS_2026: Holiday[] = [
  { date: '2026-01-01', name_th: 'วันขึ้นปีใหม่', name_en: "New Year's Day" },
  { date: '2026-01-02', name_th: 'วันหยุดชดเชยปีใหม่', name_en: 'New Year substitute', is_long_weekend: true },
  { date: '2026-03-03', name_th: 'วันมาฆบูชา', name_en: 'Makha Bucha' },
  { date: '2026-04-06', name_th: 'วันจักรี', name_en: 'Chakri Day' },
  { date: '2026-04-13', name_th: 'วันสงกรานต์', name_en: 'Songkran', is_long_weekend: true },
  { date: '2026-04-14', name_th: 'วันสงกรานต์', name_en: 'Songkran', is_long_weekend: true },
  { date: '2026-04-15', name_th: 'วันสงกรานต์', name_en: 'Songkran', is_long_weekend: true },
  { date: '2026-05-01', name_th: 'วันแรงงาน', name_en: 'Labour Day' },
  { date: '2026-05-04', name_th: 'วันฉัตรมงคล', name_en: 'Coronation Day' },
  { date: '2026-06-01', name_th: 'วันวิสาขบูชา', name_en: 'Visakha Bucha' },
  { date: '2026-06-03', name_th: 'วันเฉลิมพระชนมพรรษา ราชินี', name_en: "Queen Suthida's Birthday" },
  { date: '2026-07-29', name_th: 'วันอาสาฬหบูชา', name_en: 'Asanha Bucha' },
  { date: '2026-07-30', name_th: 'วันเข้าพรรษา', name_en: 'Khao Phansa' },
  { date: '2026-07-28', name_th: 'วันเฉลิมพระชนมพรรษา ร.10', name_en: "King's Birthday" },
  { date: '2026-08-12', name_th: 'วันแม่แห่งชาติ', name_en: "Mother's Day" },
  { date: '2026-10-13', name_th: 'วันคล้ายวันสวรรคต ร.9', name_en: "King Bhumibol Memorial Day" },
  { date: '2026-10-23', name_th: 'วันปิยมหาราช', name_en: 'Chulalongkorn Day' },
  { date: '2026-12-05', name_th: 'วันพ่อแห่งชาติ', name_en: "Father's Day" },
  { date: '2026-12-10', name_th: 'วันรัฐธรรมนูญ', name_en: 'Constitution Day' },
  { date: '2026-12-31', name_th: 'วันสิ้นปี', name_en: "New Year's Eve" },
];

export function isHoliday(dateISO: string): Holiday | null {
  return TH_HOLIDAYS_2026.find(h => h.date === dateISO) ?? null;
}

/** Was the previous calendar day (or any of last 3) a holiday? */
export function isPostHoliday(dateISO: string): Holiday | null {
  const d = new Date(dateISO + 'T00:00:00');
  for (let back = 1; back <= 3; back++) {
    const prev = new Date(d);
    prev.setDate(d.getDate() - back);
    const iso = prev.toISOString().slice(0, 10);
    const h = isHoliday(iso);
    if (h) return h;
  }
  return null;
}

/** Is the date itself or near a long weekend? */
export function isNearLongWeekend(dateISO: string): boolean {
  const d = new Date(dateISO + 'T00:00:00');
  for (let off = -2; off <= 2; off++) {
    const probe = new Date(d);
    probe.setDate(d.getDate() + off);
    const iso = probe.toISOString().slice(0, 10);
    const h = isHoliday(iso);
    if (h?.is_long_weekend) return true;
  }
  return false;
}
