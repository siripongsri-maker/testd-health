/** Queue step definitions – single source of truth */

export interface QueueStepDef {
  code: string;
  labelTh: string;
  labelEn: string;
  icon: string; // lucide icon name
  /** Steps this can route to after completion */
  nextOptions: string[];
  /** Can be cancelled from this step */
  canCancel?: boolean;
}

export const QUEUE_STEPS: QueueStepDef[] = [
  { code: 'register', labelTh: 'ลงทะเบียน', labelEn: 'Register', icon: 'ClipboardCheck', nextOptions: ['counselor'], canCancel: false },
  { code: 'counselor', labelTh: 'ปรึกษา', labelEn: 'Counselor', icon: 'UserRound', nextOptions: ['blood_collecting', 'specimen_collecting', 'cancelled'], canCancel: true },
  { code: 'blood_collecting', labelTh: 'เจาะเลือด', labelEn: 'Blood Collecting', icon: 'Droplets', nextOptions: ['waiting_result', 'notification_later'] },
  { code: 'specimen_collecting', labelTh: 'เก็บตัวอย่าง', labelEn: 'Specimen Collecting', icon: 'TestTube', nextOptions: ['waiting_result', 'notification_later'] },
  { code: 'waiting_result', labelTh: 'รอผลตรวจ', labelEn: 'Waiting for Result', icon: 'Clock', nextOptions: ['medicine', 'treatment', 'payment', 'completed'] },
  { code: 'notification_later', labelTh: 'แจ้งผลภายหลัง', labelEn: 'Notification Later', icon: 'BellRing', nextOptions: ['medicine', 'treatment', 'payment', 'completed'] },
  { code: 'medicine', labelTh: 'รับยา', labelEn: 'Get Medicine', icon: 'Pill', nextOptions: ['payment', 'completed'] },
  { code: 'treatment', labelTh: 'รับการรักษา', labelEn: 'Treatment', icon: 'HeartPulse', nextOptions: ['payment', 'completed'] },
  { code: 'payment', labelTh: 'ชำระเงิน', labelEn: 'Payment', icon: 'CreditCard', nextOptions: ['completed'] },
  { code: 'completed', labelTh: 'เสร็จสิ้น', labelEn: 'Completed', icon: 'CheckCircle', nextOptions: [] },
  { code: 'cancelled', labelTh: 'ยกเลิก', labelEn: 'Cancelled', icon: 'XCircle', nextOptions: [] },
];

export const STEP_MAP = Object.fromEntries(QUEUE_STEPS.map(s => [s.code, s]));

export function getStepLabel(code: string, lang: 'th' | 'en'): string {
  return STEP_MAP[code]?.[lang === 'th' ? 'labelTh' : 'labelEn'] || code;
}

export const ACTIVE_SERVICE_STEPS = ['counselor', 'blood_collecting', 'specimen_collecting', 'waiting_result', 'notification_later', 'medicine', 'treatment', 'payment'];

export type StepStatus = 'waiting' | 'called' | 'in_service' | 'completed' | 'cancelled';

export const STATUS_LABELS: Record<StepStatus, { th: string; en: string }> = {
  waiting: { th: 'รอเรียก', en: 'Waiting' },
  called: { th: 'กำลังเรียก', en: 'Called' },
  in_service: { th: 'กำลังให้บริการ', en: 'In Service' },
  completed: { th: 'เสร็จสิ้น', en: 'Completed' },
  cancelled: { th: 'ยกเลิก', en: 'Cancelled' },
};
