export const WORLD_W = 750;
export const WORLD_H = 860;
export const AVATAR_SPEED = 120; // px per second
export const SPAWN = { x: 375, y: 460 };

/* ── Booth config ─────────────────────────────────────────────── */

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
}

export const BOOTHS: PixelBoothConfig[] = [
  { id: "welcome",       labelTh: "ต้อนรับ",     labelEn: "Welcome",      targetRoute: "/",                x: 80,  y: 60,  w: 110, h: 76, roofColor: "#8ecda0", wallColor: "#e8f5e9", accentColor: "#b5e6c5" },
  { id: "testing",        labelTh: "ตรวจเลือด",   labelEn: "Testing",      targetRoute: "/hiv-selftest",    x: 550, y: 60,  w: 110, h: 76, roofColor: "#7ecdc4", wallColor: "#e0f2ef", accentColor: "#a8ded8", hasStaff: true },
  { id: "booking",        labelTh: "จองนัด",      labelEn: "Booking",      targetRoute: "/booking",         x: 80,  y: 220, w: 110, h: 76, roofColor: "#89b8e0", wallColor: "#e3eef8", accentColor: "#aed0f0", hasStaff: true },
  { id: "appointments",   labelTh: "นัดหมาย",     labelEn: "Appts",        targetRoute: "/my-appointments", x: 550, y: 220, w: 110, h: 76, roofColor: "#a8a4e0", wallColor: "#eae8f8", accentColor: "#c4c1f0" },
  { id: "learning",       labelTh: "เรียนรู้",      labelEn: "Learn",        targetRoute: "/info",            x: 80,  y: 380, w: 110, h: 76, roofColor: "#e8c87a", wallColor: "#fdf4e0", accentColor: "#f0d89a" },
  { id: "selfcare",       labelTh: "ดูแลตัวเอง",  labelEn: "Self-Care",    targetRoute: "/self-care",       x: 550, y: 380, w: 110, h: 76, roofColor: "#e8a0b8", wallColor: "#fce8f0", accentColor: "#f0b8cc" },
  { id: "community",      labelTh: "ชุมชน",       labelEn: "Community",    targetRoute: "/community",       x: 80,  y: 540, w: 110, h: 76, roofColor: "#b8a0e0", wallColor: "#f0e8fa", accentColor: "#d0c0f0" },
  { id: "harmreduction",  labelTh: "ลดอันตราย",   labelEn: "Harm Red.",    targetRoute: "/harm-reduction",  x: 550, y: 540, w: 110, h: 76, roofColor: "#7ec8a8", wallColor: "#e0f4ea", accentColor: "#a0dcc0" },
  { id: "staffdesk",      labelTh: "คุยกับทีม",    labelEn: "Staff Desk",   targetRoute: "/support-chat",    x: 305, y: 720, w: 130, h: 76, roofColor: "#7ab8d8", wallColor: "#e0f0f8", accentColor: "#a0d0e8", hasStaff: true },
];

/* ── Avatar palettes (softer, pastel tones) ───────────────────── */

export interface AvatarPalette {
  hair: string;
  skin: string;
  shirt: string;
  pants: string;
}

export const PALETTES: AvatarPalette[] = [
  { hair: "#6b4423", skin: "#f5d0b0", shirt: "#e07060", pants: "#506070" },
  { hair: "#2a2a3e", skin: "#ddb090", shirt: "#5aa0d0", pants: "#607080" },
  { hair: "#c06040", skin: "#fce0c0", shirt: "#50b878", pants: "#889098" },
  { hair: "#e0a040", skin: "#f8e0c0", shirt: "#a06cc0", pants: "#506070" },
  { hair: "#405060", skin: "#f0d0b0", shirt: "#e09050", pants: "#384858" },
  { hair: "#d06088", skin: "#f8d8c0", shirt: "#40b8c8", pants: "#586870" },
  { hair: "#6030a0", skin: "#e0c8a8", shirt: "#f0a050", pants: "#504038" },
  { hair: "#207878", skin: "#f8d0b0", shirt: "#f07850", pants: "#485860" },
];

export function getPalette(seed: number): AvatarPalette {
  return PALETTES[Math.abs(seed) % PALETTES.length];
}

/* ── Decorative trees ─────────────────────────────────────────── */

export const TREES = [
  { x: 310, y: 95 },
  { x: 420, y: 85 },
  { x: 250, y: 300 },
  { x: 490, y: 310 },
  { x: 240, y: 470 },
  { x: 510, y: 480 },
  { x: 340, y: 640 },
  { x: 410, y: 650 },
];

/* ── Decorative flowers ───────────────────────────────────────── */
export const FLOWERS = [
  { x: 45, y: 170, color: "#f0a0b0" },
  { x: 680, y: 180, color: "#a0c8f0" },
  { x: 200, y: 350, color: "#f0d080" },
  { x: 650, y: 460, color: "#c0a0e0" },
  { x: 160, y: 650, color: "#90d8b0" },
  { x: 600, y: 670, color: "#f0b090" },
  { x: 370, y: 160, color: "#e0b0c0" },
  { x: 460, y: 550, color: "#b0d0f0" },
];

/* ── Lamp posts ───────────────────────────────────────────────── */
export const LAMPS = [
  { x: 280, y: 150 },
  { x: 460, y: 150 },
  { x: 280, y: 500 },
  { x: 460, y: 500 },
];
