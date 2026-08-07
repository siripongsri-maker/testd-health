import type { FullAppointment } from '@/lib/appointments';

export interface AppointmentServiceEvent {
  appointment_id: string;
  service_category: string | null;
  service_subtype: string | null;
  event_type: string;
  urgency_level: string | null;
  counseling_needed: boolean | null;
  mental_health_referral_needed: boolean | null;
  meta: unknown;
}

export interface UrgentSupportSignal {
  kind: 'chemsex' | 'harm_reduction' | 'mental_health';
  labelTh: string;
  labelEn: string;
}

export interface EnrichedAppointment extends FullAppointment {
  is_returning: boolean;
  serviceEvents?: AppointmentServiceEvent[];
}

export function getUrgentSupportSignals(apt: EnrichedAppointment): UrgentSupportSignal[] {
  const signals = new Map<UrgentSupportSignal['kind'], UrgentSupportSignal>();

  for (const event of apt.serviceEvents || []) {
    const urgency = (event.urgency_level || '').toLowerCase();
    if (!['urgent', 'crisis'].includes(urgency)) continue;

    const eventText = [
      event.service_category,
      event.service_subtype,
      event.event_type,
      typeof event.meta === 'string' ? event.meta : JSON.stringify(event.meta || {}),
    ].join(' ').toLowerCase();

    if (eventText.includes('chemsex')) {
      signals.set('chemsex', { kind: 'chemsex', labelTh: 'Chemsex', labelEn: 'Chemsex' });
    }
    if (
      eventText.includes('harm_reduction') ||
      eventText.includes('harm reduction') ||
      event.counseling_needed
    ) {
      signals.set('harm_reduction', { kind: 'harm_reduction', labelTh: 'ลดอันตราย', labelEn: 'Harm reduction' });
    }
    if (
      eventText.includes('mental_health') ||
      eventText.includes('mental health') ||
      event.mental_health_referral_needed
    ) {
      signals.set('mental_health', { kind: 'mental_health', labelTh: 'สุขภาพจิต', labelEn: 'Mental health' });
    }
  }

  return Array.from(signals.values());
}

export interface DensityDay {
  appointment_date: string;
  total_count: number;
  new_count: number;
  returning_count: number;
  cancelled_count: number;
  completed_count: number;
}

export interface BranchOption {
  id: string;
  slug: string;
  name_th: string;
  name_en: string;
  counselor_count: number;
  hero_image_url?: string | null;
  google_place_id?: string | null;
  google_maps_url?: string | null;
  google_rating?: number | null;
  google_review_count?: number | null;
  google_photo_url?: string | null;
}

export type ViewMode = 'bento' | 'calendar' | 'analytics' | 'forecast';
export type DateRange = 'today' | 'week' | 'custom';

export const STATUS_OPTIONS = [
  { value: 'booked', labelTh: 'จองแล้ว', labelEn: 'Booked', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'arrived', labelTh: 'มาเข้ารับบริการ', labelEn: 'Checked in', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  { value: 'checked_out', labelTh: 'เช็คเอาท์แล้ว', labelEn: 'Checked out', color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
  { value: 'no_show', labelTh: 'ไม่มาตามนัด', labelEn: 'No Show', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  { value: 'cancelled', labelTh: 'ยกเลิก', labelEn: 'Cancelled', color: 'bg-muted text-muted-foreground' },
];

const LEGACY_STATUS_MAP: Record<string, string> = {
  confirmed: 'booked',
  pending: 'booked',
  waiting: 'arrived',
  checked_in: 'arrived',
  in_progress: 'arrived',
  completed: 'arrived',
  cancelled_replaced: 'cancelled',
};

export function getStatusInfo(status: string) {
  const v = LEGACY_STATUS_MAP[status] || status;
  return STATUS_OPTIONS.find(s => s.value === v) || STATUS_OPTIONS[0];
}

