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

/** Pre-service survey signal (PHQ-4 / ASSIST / C-SSRS style scoring) */
export interface PreServiceSurveySignal {
  booking_id: string;
  confidence: number | null;
  safety: number | null;
  mental_health_interest: string | null;
  help_topics: string[] | null;
  knowledge: unknown;
  behavior: unknown;
  suggestions: string | null;
}

export interface UrgentSupportSignal {
  kind: 'chemsex' | 'harm_reduction' | 'mental_health';
  labelTh: string;
  labelEn: string;
  /** Where the signal came from — helps staff trust the flag */
  sourceTh?: string;
  sourceEn?: string;
}

export interface EnrichedAppointment extends FullAppointment {
  is_returning: boolean;
  serviceEvents?: AppointmentServiceEvent[];
  preServiceSurvey?: PreServiceSurveySignal | null;
}

const SIGNAL_META: Record<UrgentSupportSignal['kind'], { labelTh: string; labelEn: string }> = {
  chemsex: { labelTh: 'Chemsex', labelEn: 'Chemsex' },
  harm_reduction: { labelTh: 'ลดอันตราย', labelEn: 'Harm reduction' },
  mental_health: { labelTh: 'สุขภาพจิต', labelEn: 'Mental health' },
};

const KEYWORDS: Record<UrgentSupportSignal['kind'], string[]> = {
  chemsex: ['chemsex', 'chem sex', 'ชมเซ็กส์', 'เคมเซ็กส์', 'ใช้สารระหว่างมีเพศสัมพันธ์', 'meth', 'ยาไอซ์', 'ไอซ์'],
  harm_reduction: [
    'harm_reduction', 'harm reduction', 'ลดอันตราย', 'ลดอันตรายจากการใช้สาร',
    'substance', 'สารเสพติด', 'ใช้สาร', 'assist', 'audit', 'ดื่มสุรา', 'แอลกอฮอล์',
  ],
  mental_health: [
    'mental_health', 'mental health', 'สุขภาพจิต', 'ซึมเศร้า', 'เครียด', 'วิตกกังวล',
    'depress', 'anxiet', 'suicid', 'ฆ่าตัวตาย', 'phq', 'c-ssrs', 'cssrs', 'psycho', 'จิตเวช',
  ],
};

function matchKinds(text: string): UrgentSupportSignal['kind'][] {
  const lower = text.toLowerCase();
  return (Object.keys(KEYWORDS) as UrgentSupportSignal['kind'][]).filter(kind =>
    KEYWORDS[kind].some(kw => lower.includes(kw))
  );
}

/**
 * Detect urgent support needs from multiple sources:
 * 1. service_events (urgency_level urgent/crisis, or explicit referral flags)
 * 2. booked service type (chemsex / mental health / harm reduction services)
 * 3. pre-service survey scores (PHQ-4 / ASSIST / C-SSRS style low safety/confidence,
 *    mental-health interest, and selected help topics)
 * 4. free-text notes written by clients or staff
 */
export function getUrgentSupportSignals(apt: EnrichedAppointment): UrgentSupportSignal[] {
  const signals = new Map<UrgentSupportSignal['kind'], UrgentSupportSignal>();

  const add = (kind: UrgentSupportSignal['kind'], sourceTh: string, sourceEn: string) => {
    if (signals.has(kind)) return;
    signals.set(kind, { kind, ...SIGNAL_META[kind], sourceTh, sourceEn });
  };

  // --- 1. Service events ---
  for (const event of apt.serviceEvents || []) {
    const urgency = (event.urgency_level || '').toLowerCase();
    const isUrgent = ['urgent', 'crisis', 'high'].includes(urgency);
    const eventText = [
      event.service_category,
      event.service_subtype,
      event.event_type,
      typeof event.meta === 'string' ? event.meta : JSON.stringify(event.meta || {}),
    ].join(' ');

    if (isUrgent) {
      for (const kind of matchKinds(eventText)) {
        add(kind, 'ระดับความเร่งด่วนในบันทึกบริการ', 'Service event urgency');
      }
    }
    if (event.counseling_needed) {
      add('harm_reduction', 'ต้องการคำปรึกษา (บันทึกบริการ)', 'Counseling needed flag');
    }
    if (event.mental_health_referral_needed) {
      add('mental_health', 'ขอส่งต่อสุขภาพจิต', 'Mental health referral flag');
    }
  }

  // --- 2. Booked service type ---
  const serviceText = [
    apt.booking_services?.name_th,
    apt.booking_services?.name_en,
    ...(apt.services || []).flatMap(s => [s.name_th, s.name_en]),
  ].filter(Boolean).join(' ');
  for (const kind of matchKinds(serviceText)) {
    add(kind, 'ประเภทบริการที่จอง', 'Booked service type');
  }

  // --- 3. Pre-service survey scoring ---
  const survey = apt.preServiceSurvey;
  if (survey) {
    // 1-5 scale: <= 2 signals distress / low perceived safety
    if (typeof survey.safety === 'number' && survey.safety <= 2) {
      add('mental_health', 'คะแนนความรู้สึกปลอดภัยต่ำ (แบบสอบถามก่อนรับบริการ)', 'Low safety score (pre-service survey)');
    }
    if (typeof survey.confidence === 'number' && survey.confidence <= 2) {
      add('harm_reduction', 'คะแนนความมั่นใจในการดูแลตนเองต่ำ', 'Low self-care confidence score');
    }
    const interest = (survey.mental_health_interest || '').toLowerCase();
    if (['yes', 'true', 'สนใจ', 'ต้องการ', 'high'].some(v => interest.includes(v))) {
      add('mental_health', 'แจ้งความสนใจบริการสุขภาพจิต', 'Requested mental health support');
    }
    const surveyText = [
      (survey.help_topics || []).join(' '),
      survey.suggestions,
      typeof survey.knowledge === 'string' ? survey.knowledge : JSON.stringify(survey.knowledge || {}),
      typeof survey.behavior === 'string' ? survey.behavior : JSON.stringify(survey.behavior || {}),
    ].filter(Boolean).join(' ');
    for (const kind of matchKinds(surveyText)) {
      add(kind, 'หัวข้อที่เลือกในแบบสอบถามก่อนรับบริการ', 'Pre-service survey topics');
    }
  }

  // --- 4. Notes ---
  for (const kind of matchKinds([apt.notes, apt.staff_notes].filter(Boolean).join(' '))) {
    add(kind, 'บันทึกจากผู้รับบริการ/เจ้าหน้าที่', 'Appointment notes');
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

