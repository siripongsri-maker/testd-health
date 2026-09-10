/**
 * Appointment preparation helpers — "what to bring" checklist + calendar export.
 * Nothing here touches the server: checklist ticks live in localStorage only.
 */

export interface PrepItem {
  id: string;
  emoji: string;
  labelTh: string;
  labelEn: string;
  hintTh?: string;
  hintEn?: string;
}

/** Items everyone must bring. */
export const PREP_ITEMS: PrepItem[] = [
  {
    id: 'id_card',
    emoji: '🪪',
    labelTh: 'บัตรประชาชน (หรือบัตรที่มีรูป)',
    labelEn: 'ID card (or any photo ID)',
    hintTh: 'ใช้ลงทะเบียนและรับค่าเดินทาง',
    hintEn: 'Needed for registration and travel allowance',
  },
  {
    id: 'med_bag',
    emoji: '💊',
    labelTh: 'ถุงยาเดิม — เอามาทั้งถุง',
    labelEn: 'Your medicine bag — bring the whole bag',
    hintTh: 'รวมยาที่เหลือและซองยาทุกใบ',
    hintEn: 'Include leftover pills and all packets',
  },
  {
    id: 'booking_code',
    emoji: '🔖',
    labelTh: 'รหัสนัดหมาย (อยู่ในหน้านี้)',
    labelEn: 'Booking code (shown on this page)',
  },
  {
    id: 'phone',
    emoji: '📱',
    labelTh: 'มือถือที่ใช้จอง',
    labelEn: 'The phone you booked with',
  },
];

export function prepStorageKey(appointmentId: string) {
  return `apt_prep_${appointmentId}`;
}

export function getPrepChecked(appointmentId: string): string[] {
  try {
    const raw = localStorage.getItem(prepStorageKey(appointmentId));
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function setPrepChecked(appointmentId: string, ids: string[]) {
  try {
    localStorage.setItem(prepStorageKey(appointmentId), JSON.stringify(ids));
  } catch {
    /* storage unavailable — ticks simply won't persist */
  }
}

export interface CalendarEventInput {
  /** YYYY-MM-DD */
  date: string;
  /** HH:mm or HH:mm:ss */
  time: string;
  serviceName: string;
  branchName: string;
  referralCode?: string | null;
  language: 'th' | 'en';
  durationMinutes?: number;
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

/** Appointments are stored in Asia/Bangkok wall time (UTC+7). */
function toUtcStamps(date: string, time: string, durationMinutes: number) {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const startUtc = Date.UTC(y, m - 1, d, hh - 7, mm);
  const endUtc = startUtc + durationMinutes * 60_000;
  const fmt = (ms: number) => {
    const dt = new Date(ms);
    return (
      `${dt.getUTCFullYear()}${pad(dt.getUTCMonth() + 1)}${pad(dt.getUTCDate())}` +
      `T${pad(dt.getUTCHours())}${pad(dt.getUTCMinutes())}00Z`
    );
  };
  return { start: fmt(startUtc), end: fmt(endUtc), startMs: startUtc };
}

export function buildCalendarText(input: CalendarEventInput) {
  const isTh = input.language === 'th';
  const title = isTh
    ? `นัดหมาย ${input.serviceName} — ${input.branchName}`
    : `Appointment: ${input.serviceName} — ${input.branchName}`;
  const bring = PREP_ITEMS.map(i => `${i.emoji} ${isTh ? i.labelTh : i.labelEn}`).join('\n');
  const description =
    (isTh ? 'สิ่งที่ต้องเอามาด้วย:\n' : 'What to bring:\n') +
    bring +
    (input.referralCode
      ? `\n\n${isTh ? 'รหัสนัดหมาย' : 'Booking code'}: ${input.referralCode}`
      : '');
  return { title, description };
}

export function buildGoogleCalendarUrl(input: CalendarEventInput) {
  const duration = input.durationMinutes ?? 60;
  const { start, end } = toUtcStamps(input.date, input.time, duration);
  const { title, description } = buildCalendarText(input);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${start}/${end}`,
    details: description,
    location: input.branchName,
    ctz: 'Asia/Bangkok',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function escapeIcs(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

/** ICS with two alarms: the evening before and one hour before. */
export function buildIcsContent(input: CalendarEventInput) {
  const duration = input.durationMinutes ?? 60;
  const { start, end } = toUtcStamps(input.date, input.time, duration);
  const { title, description } = buildCalendarText(input);
  const isTh = input.language === 'th';
  const alarmText = isTh
    ? 'อย่าลืม: ถุงยาทั้งถุง + บัตรประชาชน'
    : 'Remember: your whole medicine bag + ID card';
  const uid = `${input.referralCode || start}@testd.website`;
  const stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//testD//Appointment//TH',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeIcs(title)}`,
    `DESCRIPTION:${escapeIcs(description)}`,
    `LOCATION:${escapeIcs(input.branchName)}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT15H',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeIcs(alarmText)}`,
    'END:VALARM',
    'BEGIN:VALARM',
    'TRIGGER:-PT1H',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeIcs(alarmText)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export function downloadIcs(input: CalendarEventInput) {
  const blob = new Blob([buildIcsContent(input)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `testd-appointment-${input.date}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
