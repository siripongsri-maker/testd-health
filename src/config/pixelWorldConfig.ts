/* ── Mobile-first Virtual Clinic Layout ─────────────────────── */

export const WORLD_W = 390;
export const WORLD_H = 1100;
export const AVATAR_SPEED = 90;
export const SPAWN = { x: 195, y: 160 };

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

/* Desks arranged in a vertical mobile-friendly grid:
   2 columns, 4 rows, centered with clear spacing.
   Reception spans full width at top. Help desk at bottom. */

const COL_L = 24;
const COL_R = 202;
const DESK_W = 164;
const DESK_H = 72;
const ROW_GAP = 148;
const ROW_START = 240;

export const BOOTHS: PixelBoothConfig[] = [
  // ── Reception (full-width center top) ──
  {
    id: "welcome", labelTh: "ต้อนรับ", labelEn: "Reception",
    targetRoute: "/",
    x: 55, y: 60, w: 280, h: 78,
    roofColor: "#5ba8b5", wallColor: "#f0f8f9", accentColor: "#8ecdd6",
    icon: "🏥", hasStaff: true,
    staffName: "Nong Fah", staffNameTh: "น้องฟ้า",
    welcomeEn: "Welcome!", welcomeTh: "ยินดีต้อนรับค่ะ",
  },
  // ── Row 1 ──
  {
    id: "testing", labelTh: "ตรวจเลือด", labelEn: "HIV / STI Testing",
    targetRoute: "/hiv-selftest",
    x: COL_L, y: ROW_START, w: DESK_W, h: DESK_H,
    roofColor: "#4da8a0", wallColor: "#edf8f6", accentColor: "#80ccc5",
    icon: "🔬", hasStaff: true,
    staffName: "P' Bee", staffNameTh: "พี่บี",
    welcomeEn: "Free & confidential", welcomeTh: "ฟรี ปลอดภัย",
  },
  {
    id: "booking", labelTh: "จองนัดหมาย", labelEn: "Booking",
    targetRoute: "/booking",
    x: COL_R, y: ROW_START, w: DESK_W, h: DESK_H,
    roofColor: "#6a9fd8", wallColor: "#edf3fa", accentColor: "#96bde6",
    icon: "📋", hasStaff: true,
    staffName: "P' Kai", staffNameTh: "พี่ไก่",
    welcomeEn: "Book anytime", welcomeTh: "นัดได้เลย",
  },
  // ── Row 2 ──
  {
    id: "counseling", labelTh: "คุยกับพี่", labelEn: "Counseling",
    targetRoute: "/support-chat",
    x: COL_L, y: ROW_START + ROW_GAP, w: DESK_W, h: DESK_H,
    roofColor: "#c88ea8", wallColor: "#f8edf2", accentColor: "#daa8be",
    icon: "💬", hasStaff: true,
    staffName: "P' Mint", staffNameTh: "พี่มิ้นท์",
    welcomeEn: "Talk with us", welcomeTh: "เริ่มคุยได้เลย",
  },
  {
    id: "harmreduction", labelTh: "ลดอันตราย", labelEn: "Harm Reduction",
    targetRoute: "/harm-reduction",
    x: COL_R, y: ROW_START + ROW_GAP, w: DESK_W, h: DESK_H,
    roofColor: "#5eb89a", wallColor: "#edf8f2", accentColor: "#88d0b8",
    icon: "🛡️", hasStaff: true,
    staffName: "P' Ton", staffNameTh: "พี่ต้น",
    welcomeEn: "No judgment", welcomeTh: "ไม่ตัดสิน",
  },
  // ── Row 3 ──
  {
    id: "learning", labelTh: "เรียนรู้", labelEn: "Resources",
    targetRoute: "/info",
    x: COL_L, y: ROW_START + ROW_GAP * 2, w: DESK_W, h: DESK_H,
    roofColor: "#d0a860", wallColor: "#faf5ea", accentColor: "#e0c080",
    icon: "📖", hasStaff: true,
    staffName: "P' Sky", staffNameTh: "พี่สกาย",
    welcomeEn: "Learn more", welcomeTh: "เรียนรู้เพิ่ม",
  },
  {
    id: "community", labelTh: "ชุมชน", labelEn: "Community",
    targetRoute: "/community",
    x: COL_R, y: ROW_START + ROW_GAP * 2, w: DESK_W, h: DESK_H,
    roofColor: "#9a8ec8", wallColor: "#f0edf8", accentColor: "#b8aed8",
    icon: "👥", hasStaff: true,
    staffName: "P' Nat", staffNameTh: "พี่นัท",
    welcomeEn: "Join us", welcomeTh: "มาร่วมกัน",
  },
  // ── Help Desk (full-width bottom) ──
  {
    id: "helpdesk", labelTh: "Help Desk", labelEn: "Help Desk",
    targetRoute: "/support-chat",
    x: 55, y: ROW_START + ROW_GAP * 3, w: 280, h: 78,
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
  // Entrance plants
  { type: "plant", x: 30, y: 55 },
  { type: "plant", x: 348, y: 55 },
  // SWING sign
  { type: "sign", x: 160, y: 172, label: "SWING" },
  // Waiting area
  { type: "bench", x: 140, y: 200 },
  { type: "bench", x: 220, y: 200 },
  { type: "water", x: 360, y: 200 },
  // Corridor plants
  { type: "plant", x: 14, y: 460 },
  { type: "plant", x: 370, y: 460 },
  { type: "plant", x: 14, y: 680 },
  { type: "plant", x: 370, y: 680 },
  // Bottom area
  { type: "bench", x: 140, y: 880 },
  { type: "plant", x: 30, y: 910 },
  { type: "plant", x: 348, y: 910 },
];
