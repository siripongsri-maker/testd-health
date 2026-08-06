/**
 * Canonical appointment status model (single source of truth).
 *
 * Only five statuses exist:
 *  - booked       จองแล้ว
 *  - arrived      มาเข้ารับบริการ (เจ้าหน้าที่เช็คอินให้)
 *  - checked_out  เช็คเอาท์แล้ว (ระบบเช็คเอาท์อัตโนมัติหลังเช็คอิน 1 ชม.)
 *  - no_show      ไม่มาตามนัด (เก็บเป็นสถิติ)
 *  - cancelled    ยกเลิก (เก็บเป็นสถิติ)
 *
 * Legacy values coming from older rows/integrations are folded into these.
 */

export type AppointmentStatus =
  | 'booked'
  | 'arrived'
  | 'checked_out'
  | 'no_show'
  | 'cancelled';

const LEGACY_MAP: Record<string, AppointmentStatus> = {
  confirmed: 'booked',
  pending: 'booked',
  waiting: 'arrived',
  checked_in: 'arrived',
  in_progress: 'arrived',
  completed: 'arrived',
  cancelled_replaced: 'cancelled',
};

export function normalizeStatus(status?: string | null): AppointmentStatus {
  const s = (status || 'booked').toLowerCase();
  return (LEGACY_MAP[s] || (s as AppointmentStatus)) ?? 'booked';
}

export interface StatusMeta {
  value: AppointmentStatus;
  labelTh: string;
  labelEn: string;
  /** tailwind classes for badges */
  color: string;
  /** counted as an active/open appointment */
  active: boolean;
}

export const APPOINTMENT_STATUSES: StatusMeta[] = [
  {
    value: 'booked',
    labelTh: 'จองแล้ว',
    labelEn: 'Booked',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    active: true,
  },
  {
    value: 'arrived',
    labelTh: 'มาเข้ารับบริการ',
    labelEn: 'Checked in',
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    active: true,
  },
  {
    value: 'checked_out',
    labelTh: 'เช็คเอาท์แล้ว',
    labelEn: 'Checked out',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    active: false,
  },
  {
    value: 'no_show',
    labelTh: 'ไม่มาตามนัด',
    labelEn: 'No show',
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    active: false,
  },
  {
    value: 'cancelled',
    labelTh: 'ยกเลิก',
    labelEn: 'Cancelled',
    color: 'bg-muted text-muted-foreground',
    active: false,
  },
];

export function getStatusMeta(status?: string | null): StatusMeta {
  const v = normalizeStatus(status);
  return APPOINTMENT_STATUSES.find((s) => s.value === v) || APPOINTMENT_STATUSES[0];
}

export function statusLabel(status: string | null | undefined, language: string) {
  const meta = getStatusMeta(status);
  return language === 'th' ? meta.labelTh : meta.labelEn;
}

export const ACTIVE_APPOINTMENT_STATUSES: AppointmentStatus[] = ['booked', 'arrived'];

/** Auto checkout happens this many hours after check-in. */
export const AUTO_CHECKOUT_HOURS = 1;
