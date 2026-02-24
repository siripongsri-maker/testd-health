import type { FullAppointment } from '@/lib/appointments';

export interface EnrichedAppointment extends FullAppointment {
  is_returning: boolean;
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

export type ViewMode = 'bento' | 'calendar';
export type DateRange = 'today' | 'week' | 'custom';

export const STATUS_OPTIONS = [
  { value: 'booked', labelTh: 'จองแล้ว', labelEn: 'Booked', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'confirmed', labelTh: 'ยืนยันแล้ว', labelEn: 'Confirmed', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  { value: 'waiting', labelTh: 'รอคิว (walk-in)', labelEn: 'Waiting (walk-in)', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  { value: 'in_progress', labelTh: 'กำลังรับบริการ', labelEn: 'In Progress', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  { value: 'completed', labelTh: 'เสร็จสิ้น', labelEn: 'Completed', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  { value: 'no_show', labelTh: 'ไม่มาตามนัด', labelEn: 'No Show', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  { value: 'cancelled', labelTh: 'ยกเลิก', labelEn: 'Cancelled', color: 'bg-muted text-muted-foreground' },
];

export function getStatusInfo(status: string) {
  return STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];
}
