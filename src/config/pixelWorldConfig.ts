export const WORLD_W = 800;
export const WORLD_H = 700;
export const AVATAR_SPEED = 110;
export const SPAWN = { x: 400, y: 420 };

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
  icon?: string; // emoji for desk type
}

export const BOOTHS: PixelBoothConfig[] = [
  // ── Reception (center top) ──
  { id: "welcome",      labelTh: "ต้อนรับ",     labelEn: "Reception",    targetRoute: "/",                x: 320, y: 40,  w: 160, h: 64, roofColor: "#5ba8b5", wallColor: "#eef7f8", accentColor: "#8ecdd6", icon: "🏥", hasStaff: true },
  // ── Left column ──
  { id: "testing",       labelTh: "ตรวจเลือด",   labelEn: "Testing",      targetRoute: "/hiv-selftest",    x: 40,  y: 160, w: 140, h: 58, roofColor: "#4da8a0", wallColor: "#edf8f6", accentColor: "#80ccc5", icon: "🔬", hasStaff: true },
  { id: "booking",       labelTh: "จองนัด",      labelEn: "Booking",      targetRoute: "/booking",         x: 40,  y: 290, w: 140, h: 58, roofColor: "#6a9fd8", wallColor: "#edf3fa", accentColor: "#96bde6", icon: "📋", hasStaff: true },
  { id: "community",     labelTh: "ชุมชน",       labelEn: "Community",    targetRoute: "/community",       x: 40,  y: 420, w: 140, h: 58, roofColor: "#9a8ec8", wallColor: "#f0edf8", accentColor: "#b8aed8", icon: "👥" },
  // ── Right column ──
  { id: "appointments",  labelTh: "นัดหมาย",     labelEn: "Appointments", targetRoute: "/my-appointments", x: 620, y: 160, w: 140, h: 58, roofColor: "#7a9ad0", wallColor: "#eef2fa", accentColor: "#a0b8e0", icon: "📅" },
  { id: "selfcare",      labelTh: "ดูแลตัวเอง",  labelEn: "Self-Care",    targetRoute: "/self-care",       x: 620, y: 290, w: 140, h: 58, roofColor: "#c88ea8", wallColor: "#f8edf2", accentColor: "#daa8be", icon: "💚" },
  { id: "harmreduction", labelTh: "ลดอันตราย",   labelEn: "Harm Red.",    targetRoute: "/harm-reduction",  x: 620, y: 420, w: 140, h: 58, roofColor: "#5eb89a", wallColor: "#edf8f2", accentColor: "#88d0b8", icon: "🛡️" },
  // ── Center row ──
  { id: "learning",      labelTh: "เรียนรู้",      labelEn: "Info Board",   targetRoute: "/info",            x: 280, y: 260, w: 120, h: 54, roofColor: "#d0a860", wallColor: "#faf5ea", accentColor: "#e0c080", icon: "📖" },
  { id: "staffdesk",     labelTh: "คุยกับทีม",    labelEn: "Help Desk",    targetRoute: "/support-chat",    x: 300, y: 560, w: 200, h: 64, roofColor: "#5ba8b5", wallColor: "#eef7f8", accentColor: "#8ecdd6", icon: "💬", hasStaff: true },
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
  { type: "plant", x: 250, y: 50 },
  { type: "plant", x: 540, y: 50 },
  { type: "plant", x: 30, y: 140 },
  { type: "plant", x: 770, y: 140 },
  { type: "sign", x: 370, y: 140, label: "SWING" },
  { type: "bench", x: 320, y: 380 },
  { type: "bench", x: 430, y: 380 },
  { type: "water", x: 220, y: 560 },
  { type: "divider", x: 200, y: 190 },
  { type: "divider", x: 580, y: 190 },
  { type: "plant", x: 30, y: 540 },
  { type: "plant", x: 770, y: 540 },
];
