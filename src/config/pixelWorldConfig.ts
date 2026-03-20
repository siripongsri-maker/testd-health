/* ── Mobile-first Virtual Clinic Layout (single-column) ───── */

export const WORLD_W = 360;
export const WORLD_H = 1400;
export const AVATAR_SPEED = 90;
export const SPAWN = { x: 180, y: 120 };

/* ── Desk/Zone config ─────────────────────────────────────────── */

export interface PixelBoothConfig {
  id: string;
  labelTh: string;
  labelEn: string;
  targetRoute: string;
  x: number;
  y: number;
  w: number;
  h: number;
  roofColor: string;
  wallColor: string;
  hasStaff?: boolean;
  accentColor?: string;
  icon?: string;
  staffName?: string;
  staffNameTh?: string;
  welcomeEn?: string;
  welcomeTh?: string;
}

/* Single column, stacked vertically with generous spacing */
const DESK_X = 28;
const DESK_W = 304;
const DESK_H = 64;
const ROW_GAP = 120;
const ROW_START = 200;

export const BOOTHS: PixelBoothConfig[] = [
  {
    id: "welcome", labelTh: "ต้อนรับ", labelEn: "Reception",
    targetRoute: "/",
    x: DESK_X, y: 50, w: DESK_W, h: 70,
    roofColor: "#5ba8b5", wallColor: "#f0f8f9", accentColor: "#8ecdd6",
    icon: "🏥", hasStaff: true,
    staffName: "Nong Fah", staffNameTh: "น้องฟ้า",
    welcomeEn: "Welcome!", welcomeTh: "ยินดีต้อนรับค่ะ",
  },
  {
    id: "testing", labelTh: "ตรวจเลือด", labelEn: "HIV / STI Testing",
    targetRoute: "/hiv-selftest",
    x: DESK_X, y: ROW_START, w: DESK_W, h: DESK_H,
    roofColor: "#4da8a0", wallColor: "#edf8f6", accentColor: "#80ccc5",
    icon: "🔬", hasStaff: true,
    staffName: "P' Bee", staffNameTh: "พี่บี",
    welcomeEn: "Free & confidential", welcomeTh: "ฟรี ปลอดภัย",
  },
  {
    id: "booking", labelTh: "จองนัดหมาย", labelEn: "Booking",
    targetRoute: "/booking",
    x: DESK_X, y: ROW_START + ROW_GAP, w: DESK_W, h: DESK_H,
    roofColor: "#6a9fd8", wallColor: "#edf3fa", accentColor: "#96bde6",
    icon: "📋", hasStaff: true,
    staffName: "P' Kai", staffNameTh: "พี่ไก่",
    welcomeEn: "Book anytime", welcomeTh: "นัดได้เลย",
  },
  {
    id: "counseling", labelTh: "คุยกับพี่", labelEn: "Counseling",
    targetRoute: "/support-chat",
    x: DESK_X, y: ROW_START + ROW_GAP * 2, w: DESK_W, h: DESK_H,
    roofColor: "#c88ea8", wallColor: "#f8edf2", accentColor: "#daa8be",
    icon: "💬", hasStaff: true,
    staffName: "P' Mint", staffNameTh: "พี่มิ้นท์",
    welcomeEn: "Talk with us", welcomeTh: "เริ่มคุยได้เลย",
  },
  {
    id: "harmreduction", labelTh: "ลดอันตราย", labelEn: "Harm Reduction",
    targetRoute: "/harm-reduction",
    x: DESK_X, y: ROW_START + ROW_GAP * 3, w: DESK_W, h: DESK_H,
    roofColor: "#5eb89a", wallColor: "#edf8f2", accentColor: "#88d0b8",
    icon: "🛡️", hasStaff: true,
    staffName: "P' Ton", staffNameTh: "พี่ต้น",
    welcomeEn: "No judgment", welcomeTh: "ไม่ตัดสิน",
  },
  {
    id: "learning", labelTh: "เรียนรู้", labelEn: "Resources",
    targetRoute: "/info",
    x: DESK_X, y: ROW_START + ROW_GAP * 4, w: DESK_W, h: DESK_H,
    roofColor: "#d0a860", wallColor: "#faf5ea", accentColor: "#e0c080",
    icon: "📖", hasStaff: true,
    staffName: "P' Sky", staffNameTh: "พี่สกาย",
    welcomeEn: "Learn more", welcomeTh: "เรียนรู้เพิ่ม",
  },
  {
    id: "community", labelTh: "ชุมชน", labelEn: "Community",
    targetRoute: "/community",
    x: DESK_X, y: ROW_START + ROW_GAP * 5, w: DESK_W, h: DESK_H,
    roofColor: "#9a8ec8", wallColor: "#f0edf8", accentColor: "#b8aed8",
    icon: "👥", hasStaff: true,
    staffName: "P' Nat", staffNameTh: "พี่นัท",
    welcomeEn: "Join us", welcomeTh: "มาร่วมกัน",
  },
  {
    id: "helpdesk", labelTh: "Help Desk", labelEn: "Help Desk",
    targetRoute: "/support-chat",
    x: DESK_X, y: ROW_START + ROW_GAP * 6, w: DESK_W, h: 70,
    roofColor: "#5ba8b5", wallColor: "#f0f8f9", accentColor: "#8ecdd6",
    icon: "🙋", hasStaff: true,
    staffName: "P' Max", staffNameTh: "พี่แม็ก",
    welcomeEn: "Need support?", welcomeTh: "ช่วยอะไรได้บ้าง?",
  },
];

/* ── Avatar palettes (clinic-soft tones) ──────────────────────── */

export interface AvatarPalette {
  hair: string;
  skin: string;
  shirt: string;
  pants: string;
}

export const PALETTES: AvatarPalette[] = [
  { hair: "#5a4030", skin: "#f0d0b8", shirt: "#5ba8b5", pants: "#607888" },
  { hair: "#303840", skin: "#e8c0a0", shirt: "#6a9fd8", pants: "#586878" },
  { hair: "#8a5040", skin: "#f8dcc8", shirt: "#5eb89a", pants: "#708088" },
  { hair: "#c8a060", skin: "#f4dcc0", shirt: "#9a8ec8", pants: "#586878" },
  { hair: "#404850", skin: "#ecd0b0", shirt: "#c88ea8", pants: "#485060" },
  { hair: "#b06878", skin: "#f8d8c0", shirt: "#4da8a0", pants: "#607078" },
  { hair: "#504060", skin: "#e8c8a8", shirt: "#d0a860", pants: "#504848" },
  { hair: "#306060", skin: "#f0d0b8", shirt: "#e08870", pants: "#506068" },
];

export function getPalette(seed: number): AvatarPalette {
  return PALETTES[Math.abs(seed) % PALETTES.length];
}

/* ── Decorative elements ──────────────────────────────────────── */

export const TREES: { x: number; y: number }[] = [];
export const FLOWERS: { x: number; y: number; color: string }[] = [];
export const LAMPS: { x: number; y: number }[] = [];

/* ── Clinic furniture / decorations ───────────────────────────── */
export interface ClinicDecor {
  type: "plant" | "sign" | "bench" | "divider" | "water";
  x: number;
  y: number;
  label?: string;
}

export const CLINIC_DECOR: ClinicDecor[] = [
  { type: "plant", x: 14, y: 50 },
  { type: "plant", x: 340, y: 50 },
  { type: "sign", x: 145, y: 150, label: "SWING" },
  { type: "bench", x: 150, y: 170 },
  { type: "plant", x: 14, y: 500 },
  { type: "plant", x: 340, y: 500 },
  { type: "plant", x: 14, y: 900 },
  { type: "plant", x: 340, y: 900 },
  { type: "bench", x: 150, y: 1100 },
  { type: "plant", x: 14, y: 1300 },
  { type: "plant", x: 340, y: 1300 },
];
