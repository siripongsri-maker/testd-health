export interface Nudge {
  id: string;
  type: string;
  titleTh: string;
  titleEn: string;
  descTh: string;
  descEn: string;
  icon: string;
}

const NUDGES: Nudge[] = [
  {
    id: "hydration",
    type: "hydration",
    titleTh: "อย่าลืมดื่มน้ำคืนนี้",
    titleEn: "Don't forget hydration tonight",
    descTh: "ดื่มน้ำทุก 30-60 นาที เพื่อสุขภาพที่ดี",
    descEn: "Drink water every 30–60 minutes for your health",
    icon: "droplets",
  },
  {
    id: "condom",
    type: "condom",
    titleTh: "พกถุงยางและเจลหล่อลื่น",
    titleEn: "Bring condoms and lube with you",
    descTh: "ความปลอดภัยเริ่มจากการเตรียมตัว",
    descEn: "Safety starts with preparation",
    icon: "shield",
  },
  {
    id: "hiv_test",
    type: "hiv_test",
    titleTh: "ตั้งเตือนตรวจ HIV ครั้งหน้า",
    titleEn: "Set a reminder for your next HIV test",
    descTh: "ตรวจเป็นประจำทุก 3 เดือนหากมีความเสี่ยง",
    descEn: "Test regularly every 3 months if at risk",
    icon: "test-tube",
  },
  {
    id: "prep_reminder",
    type: "prep",
    titleTh: "กิน PrEP ตามกำหนดแล้วหรือยัง?",
    titleEn: "Have you taken your PrEP today?",
    descTh: "PrEP ป้องกัน HIV ได้อย่างมีประสิทธิภาพเมื่อกินสม่ำเสมอ",
    descEn: "PrEP is most effective when taken consistently",
    icon: "pill",
  },
  {
    id: "safe_transport",
    type: "transport",
    titleTh: "จัดเรื่องรถกลับบ้านแล้วหรือยัง?",
    titleEn: "Have you arranged safe transport home?",
    descTh: "วางแผนการเดินทางกลับก่อนออกไป",
    descEn: "Plan your way home before you go out",
    icon: "car",
  },
];

const DISABLED_KEY = "hr_nudges_disabled";
const DISMISSED_KEY = "hr_nudges_dismissed";

export function areNudgesDisabled(): boolean {
  return localStorage.getItem(DISABLED_KEY) === "true";
}

export function setNudgesDisabled(disabled: boolean): void {
  localStorage.setItem(DISABLED_KEY, String(disabled));
}

export function getActiveNudges(riskLevel?: string): Nudge[] {
  if (areNudgesDisabled()) return [];

  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();
  const isWeekendNight = (day === 5 || day === 6) && hour >= 18;
  const isLateNight = hour >= 22 || hour < 5;

  const dismissed: string[] = (() => {
    try {
      const raw = localStorage.getItem(DISMISSED_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      // Clear dismissals older than 24h
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      const valid = parsed.filter((d: { id: string; at: number }) => d.at > cutoff);
      localStorage.setItem(DISMISSED_KEY, JSON.stringify(valid));
      return valid.map((d: { id: string }) => d.id);
    } catch {
      return [];
    }
  })();

  let nudges: Nudge[] = [];

  if (isWeekendNight || isLateNight) {
    nudges.push(...NUDGES.filter((n) => ["hydration", "condom", "transport"].includes(n.type)));
  }

  if (riskLevel === "high" || riskLevel === "moderate") {
    nudges.push(...NUDGES.filter((n) => ["hiv_test", "prep"].includes(n.type)));
  }

  // Default: show at least one nudge during evening hours
  if (nudges.length === 0 && hour >= 17) {
    nudges.push(NUDGES[0]);
  }

  // Deduplicate and filter dismissed
  const seen = new Set<string>();
  return nudges.filter((n) => {
    if (seen.has(n.id) || dismissed.includes(n.id)) return false;
    seen.add(n.id);
    return true;
  });
}

export function dismissNudge(id: string): void {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    const list = raw ? JSON.parse(raw) : [];
    list.push({ id, at: Date.now() });
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(list));
  } catch {}
}
