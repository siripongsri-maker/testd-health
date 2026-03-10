/**
 * Maps internal queue step_code + step_status into 4 simplified public TV statuses.
 * Used by QueueTV to hide operational detail from the public display.
 */

export type PublicStatus = 'registered' | 'waiting' | 'in_service' | 'finished';

export const PUBLIC_STATUS_CONFIG: Record<PublicStatus, {
  labelTh: string;
  labelEn: string;
  color: string;       // tailwind bg class for the TV card
  borderColor: string;
  textColor: string;
  icon: string;
}> = {
  registered: {
    labelTh: 'ลงทะเบียน',
    labelEn: 'Registered',
    color: 'bg-sky-500/15',
    borderColor: 'border-sky-500/40',
    textColor: 'text-sky-300',
    icon: '📋',
  },
  waiting: {
    labelTh: 'รอรับบริการ',
    labelEn: 'Waiting',
    color: 'bg-amber-500/15',
    borderColor: 'border-amber-500/40',
    textColor: 'text-amber-300',
    icon: '⏳',
  },
  in_service: {
    labelTh: 'กำลังรับบริการ',
    labelEn: 'In Service',
    color: 'bg-green-500/15',
    borderColor: 'border-green-500/40',
    textColor: 'text-green-300',
    icon: '🩺',
  },
  finished: {
    labelTh: 'เสร็จสิ้น',
    labelEn: 'Completed',
    color: 'bg-white/5',
    borderColor: 'border-white/10',
    textColor: 'text-white/40',
    icon: '✅',
  },
};

/**
 * Derive the public-facing status from the internal step_code + step_status.
 *
 * Mapping rules:
 *   register (any non-completed status)             → registered
 *   any step with step_status = 'waiting'           → waiting (รอรับบริการ)
 *   any step with step_status = 'called'            → in_service (กำลังรับบริการ — publicly "please proceed")
 *   any step with step_status = 'in_service'        → in_service
 *   step_status = 'completed'                       → finished
 *   step_status = 'cancelled'                       → finished
 *   step_code = 'completed' or 'cancelled'          → finished
 *   step_code = 'notification_later' completed      → finished (done for today)
 */
export function toPublicStatus(stepCode: string, stepStatus: string): PublicStatus {
  // Terminal step codes
  if (stepCode === 'completed' || stepCode === 'cancelled') return 'finished';

  // Step-level terminal statuses
  if (stepStatus === 'completed' || stepStatus === 'cancelled') return 'finished';

  // Registration
  if (stepCode === 'register') return 'registered';

  // Called = publicly show as "in_service" (กำลังรับบริการ — please proceed now)
  if (stepStatus === 'called') return 'in_service';

  // Currently being served
  if (stepStatus === 'in_service') return 'in_service';

  // Default: waiting
  return 'waiting';
}

/**
 * Get a short public-safe instruction for TV display based on step + status.
 * Returns Thai text only (TV is Thai-first).
 */
export function getTVInstruction(stepCode: string, stepStatus: string, roomNumber?: number | null): string {
  if (stepStatus === 'called') {
    if (roomNumber) return `กรุณาเข้าห้อง ${roomNumber}`;
    const instructionMap: Record<string, string> = {
      counselor: 'กรุณาไปห้องให้คำปรึกษา',
      blood_collecting: 'กรุณาไปจุดเจาะเลือด',
      specimen_collecting: 'กรุณาไปจุดเก็บตัวอย่าง',
      medicine: 'กรุณาไปจุดรับยา',
      treatment: 'กรุณาไปจุดรักษา',
      payment: 'กรุณาไปจุดชำระเงิน',
    };
    return instructionMap[stepCode] || 'กรุณาเข้ารับบริการ';
  }
  if (stepStatus === 'in_service') return 'กำลังรับบริการ';
  if (stepStatus === 'waiting') return 'กรุณารอเรียก';
  return '';
}

/**
 * Detailed step labels for the user mobile page (Thai-first).
 * Maps step_code + step_status → user-friendly Thai instruction.
 */
export function getDetailedStepLabel(stepCode: string, stepStatus: string, roomNumber?: number | null): {
  th: string;
  en: string;
} {
  const room = roomNumber ? ` (ห้อง ${roomNumber})` : '';
  const roomEn = roomNumber ? ` (Room ${roomNumber})` : '';

  const map: Record<string, Record<string, { th: string; en: string }>> = {
    register: {
      waiting: { th: 'ลงทะเบียนแล้ว', en: 'Registered' },
      completed: { th: 'ลงทะเบียนเรียบร้อย', en: 'Registration complete' },
    },
    counselor: {
      waiting: { th: 'รอเข้าห้องให้คำปรึกษา', en: 'Waiting for counselor' },
      called: { th: `กรุณาไปห้องให้คำปรึกษา${room}`, en: `Please go to counselor${roomEn}` },
      in_service: { th: `อยู่ระหว่างให้คำปรึกษา${room}`, en: `In counseling session${roomEn}` },
      completed: { th: 'ให้คำปรึกษาเรียบร้อย', en: 'Counseling completed' },
    },
    blood_collecting: {
      waiting: { th: 'รอเจาะเลือด', en: 'Waiting for blood collection' },
      called: { th: `กรุณาไปจุดเจาะเลือด${room}`, en: `Please go to blood collection${roomEn}` },
      in_service: { th: 'กำลังเจาะเลือด', en: 'Blood collection in progress' },
      completed: { th: 'เจาะเลือดเรียบร้อย', en: 'Blood collection done' },
    },
    specimen_collecting: {
      waiting: { th: 'รอเก็บตัวอย่าง', en: 'Waiting for specimen collection' },
      called: { th: `กรุณาไปจุดเก็บตัวอย่าง${room}`, en: `Please go to specimen collection${roomEn}` },
      in_service: { th: 'กำลังเก็บตัวอย่าง', en: 'Specimen collection in progress' },
      completed: { th: 'เก็บตัวอย่างเรียบร้อย', en: 'Specimen collection done' },
    },
    waiting_result: {
      waiting: { th: 'อยู่ระหว่างรอผลตรวจ', en: 'Waiting for test results' },
      in_service: { th: 'กำลังรอผลตรวจ', en: 'Awaiting results' },
      completed: { th: 'ได้รับผลตรวจแล้ว', en: 'Results received' },
    },
    notification_later: {
      waiting: { th: 'ไม่ต้องรอ — เจ้าหน้าที่จะแจ้งผลภายหลัง', en: 'No need to wait — staff will notify you later' },
      in_service: { th: 'เจ้าหน้าที่จะติดต่อกลับ', en: 'Staff will contact you' },
      completed: { th: 'แจ้งผลเรียบร้อย', en: 'Results notified' },
    },
    medicine: {
      waiting: { th: 'รอรับยา', en: 'Waiting to receive medicine' },
      called: { th: `กรุณาไปจุดรับยา${room}`, en: `Please go to medicine counter${roomEn}` },
      in_service: { th: 'กำลังรับยา', en: 'Receiving medicine' },
      completed: { th: 'รับยาเรียบร้อย', en: 'Medicine received' },
    },
    treatment: {
      waiting: { th: 'รอรับการรักษา', en: 'Waiting for treatment' },
      called: { th: `กรุณาไปจุดรักษา${room}`, en: `Please go to treatment${roomEn}` },
      in_service: { th: 'กำลังรับการรักษา', en: 'Receiving treatment' },
      completed: { th: 'รับการรักษาเรียบร้อย', en: 'Treatment completed' },
    },
    payment: {
      waiting: { th: 'รอชำระเงิน', en: 'Waiting for payment' },
      called: { th: `กรุณาไปจุดชำระเงิน${room}`, en: `Please go to payment counter${roomEn}` },
      in_service: { th: 'กำลังชำระเงิน', en: 'Processing payment' },
      completed: { th: 'ชำระเงินเรียบร้อย', en: 'Payment completed' },
    },
    completed: {
      _default: { th: 'เสร็จสิ้นแล้ว — สามารถกลับบ้านได้', en: 'Visit completed — you may go home' },
    },
    cancelled: {
      _default: { th: 'ยกเลิกแล้ว', en: 'Visit cancelled' },
    },
  };

  const stepMap = map[stepCode];
  if (!stepMap) return { th: stepCode, en: stepCode };
  return stepMap[stepStatus] || stepMap['_default'] || { th: stepCode, en: stepCode };
}

/**
 * Derive user-facing "next route" instruction based on the active step and routed_to.
 */
export function getNextRouteInstruction(
  currentStepCode: string,
  currentStepStatus: string,
  routedToStepCode: string | null,
  roomNumber?: number | null,
): { th: string; en: string } | null {
  // If step is completed and has a routed_to, show where to go next
  if (currentStepStatus === 'completed' && routedToStepCode) {
    return getNextStepInstruction(routedToStepCode);
  }

  // If called, tell user to proceed
  if (currentStepStatus === 'called') {
    if (roomNumber) {
      return { th: `กรุณาเข้าห้อง ${roomNumber}`, en: `Please proceed to Room ${roomNumber}` };
    }
    return getNextStepInstruction(currentStepCode);
  }

  // If waiting, tell them to wait
  if (currentStepStatus === 'waiting') {
    return { th: 'กรุณารอเรียกคิว', en: 'Please wait for your queue to be called' };
  }

  // If in_service, tell them to stay
  if (currentStepStatus === 'in_service') {
    return { th: 'กรุณาอยู่ ณ จุดบริการ', en: 'Please remain at the service point' };
  }

  // notification_later
  if (currentStepCode === 'notification_later') {
    return { th: 'ไม่ต้องรอที่สาขา เจ้าหน้าที่จะแจ้งผลภายหลัง', en: 'No need to wait. Staff will notify you later.' };
  }

  // completed
  if (currentStepCode === 'completed') {
    return { th: 'เสร็จสิ้น สามารถกลับบ้านได้', en: 'Completed. You may go home.' };
  }

  return null;
}

function getNextStepInstruction(stepCode: string): { th: string; en: string } {
  const map: Record<string, { th: string; en: string }> = {
    counselor: { th: 'กรุณาไปห้องให้คำปรึกษา', en: 'Please go to counselor room' },
    blood_collecting: { th: 'กรุณาไปจุดเจาะเลือด', en: 'Please go to blood collection' },
    specimen_collecting: { th: 'กรุณาไปจุดเก็บตัวอย่าง', en: 'Please go to specimen collection' },
    waiting_result: { th: 'กรุณารอผลตรวจ', en: 'Please wait for test results' },
    notification_later: { th: 'ไม่ต้องรอที่สาขา เจ้าหน้าที่จะแจ้งผลภายหลัง', en: 'No need to wait. Staff will notify you later.' },
    medicine: { th: 'กรุณาไปจุดรับยา', en: 'Please go to medicine counter' },
    treatment: { th: 'กรุณาไปจุดรักษา', en: 'Please go to treatment area' },
    payment: { th: 'กรุณาไปจุดชำระเงิน', en: 'Please go to payment counter' },
    completed: { th: 'เสร็จสิ้น สามารถกลับบ้านได้', en: 'Completed. You may go home.' },
    cancelled: { th: 'ยกเลิกแล้ว', en: 'Visit cancelled' },
  };
  return map[stepCode] || { th: 'กรุณารอเรียก', en: 'Please wait' };
}
