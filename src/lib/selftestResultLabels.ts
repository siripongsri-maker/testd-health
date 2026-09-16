/**
 * Single source of truth for how a self-test result is worded to staff and users.
 *
 * Agreed clinical wording (Thai):
 *   1 ขีด = ไม่เกิดปฏิกิริยา (Non-reactive)
 *   2 ขีด = เกิดปฏิกิริยา (Reactive)
 *   ไม่มีขีด / อ่านไม่ออก = อ่านผลไม่ได้ (Invalid)
 *
 * Never use "ผลลบ / ผลบวก / ติดเชื้อ" for a screening result.
 */

export type SelfTestResultKey = 'negative' | 'reactive' | 'positive' | 'invalid' | 'unknown';

export function normalizeSelfTestResult(value?: string | null): SelfTestResultKey {
  const v = String(value ?? '').toLowerCase();
  if (v === 'negative' || v === 'non_reactive' || v === 'nonreactive') return 'negative';
  if (v === 'reactive') return 'reactive';
  if (v === 'positive') return 'positive';
  if (v === 'invalid') return 'invalid';
  return 'unknown';
}

/** Full label, e.g. "ไม่เกิดปฏิกิริยา (1 ขีด)". */
export function selfTestResultLabel(value: string | null | undefined, lang: 'th' | 'en' = 'th'): string {
  const key = normalizeSelfTestResult(value);
  const th: Record<SelfTestResultKey, string> = {
    negative: 'ไม่เกิดปฏิกิริยา (1 ขีด)',
    reactive: 'เกิดปฏิกิริยา (2 ขีด)',
    positive: 'เกิดปฏิกิริยา (2 ขีด)',
    invalid: 'อ่านผลไม่ได้',
    unknown: 'ยังไม่ส่งผล',
  };
  const en: Record<SelfTestResultKey, string> = {
    negative: 'Non-reactive (1 line)',
    reactive: 'Reactive (2 lines)',
    positive: 'Reactive (2 lines)',
    invalid: 'Invalid',
    unknown: 'No result yet',
  };
  return lang === 'th' ? th[key] : en[key];
}

/** Short label for chips, charts and table headers. */
export function selfTestResultShortLabel(value: string | null | undefined, lang: 'th' | 'en' = 'th'): string {
  const key = normalizeSelfTestResult(value);
  const th: Record<SelfTestResultKey, string> = {
    negative: 'ไม่เกิดปฏิกิริยา',
    reactive: 'เกิดปฏิกิริยา',
    positive: 'เกิดปฏิกิริยา',
    invalid: 'อ่านผลไม่ได้',
    unknown: 'ยังไม่ส่งผล',
  };
  const en: Record<SelfTestResultKey, string> = {
    negative: 'Non-reactive',
    reactive: 'Reactive',
    positive: 'Reactive',
    invalid: 'Invalid',
    unknown: 'No result',
  };
  return lang === 'th' ? th[key] : en[key];
}

export const SELFTEST_RESULT_CLASS: Record<SelfTestResultKey, string> = {
  negative: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  reactive: 'bg-rose-500/15 text-rose-600 border-rose-500/30',
  positive: 'bg-rose-500/15 text-rose-600 border-rose-500/30',
  invalid: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  unknown: 'bg-muted text-muted-foreground border-border',
};
