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
}

export const BOOTHS: PixelBoothConfig[] = [
  { id: "welcome",       labelTh: "ต้อนรับ",     labelEn: "Welcome",      targetRoute: "/",                x: 80,  y: 60,  w: 110, h: 76, roofColor: "#4ade80", wallColor: "#dcfce7" },
  { id: "testing",        labelTh: "ตรวจเลือด",   labelEn: "Testing",      targetRoute: "/hiv-selftest",    x: 550, y: 60,  w: 110, h: 76, roofColor: "#2dd4bf", wallColor: "#ccfbf1", hasStaff: true },
  { id: "booking",        labelTh: "จองนัด",      labelEn: "Booking",      targetRoute: "/booking",         x: 80,  y: 220, w: 110, h: 76, roofColor: "#60a5fa", wallColor: "#dbeafe", hasStaff: true },
  { id: "appointments",   labelTh: "นัดหมาย",     labelEn: "Appts",        targetRoute: "/my-appointments", x: 550, y: 220, w: 110, h: 76, roofColor: "#818cf8", wallColor: "#e0e7ff" },
  { id: "learning",       labelTh: "เรียนรู้",      labelEn: "Learn",        targetRoute: "/info",            x: 80,  y: 380, w: 110, h: 76, roofColor: "#fbbf24", wallColor: "#fef3c7" },
  { id: "selfcare",       labelTh: "ดูแลตัวเอง",  labelEn: "Self-Care",    targetRoute: "/self-care",       x: 550, y: 380, w: 110, h: 76, roofColor: "#f472b6", wallColor: "#fce7f3" },
  { id: "community",      labelTh: "ชุมชน",       labelEn: "Community",    targetRoute: "/community",       x: 80,  y: 540, w: 110, h: 76, roofColor: "#a78bfa", wallColor: "#ede9fe" },
  { id: "harmreduction",  labelTh: "ลดอันตราย",   labelEn: "Harm Red.",    targetRoute: "/harm-reduction",  x: 550, y: 540, w: 110, h: 76, roofColor: "#34d399", wallColor: "#d1fae5" },
  { id: "staffdesk",      labelTh: "คุยกับทีม",    labelEn: "Staff Desk",   targetRoute: "/support-chat",    x: 305, y: 720, w: 130, h: 76, roofColor: "#38bdf8", wallColor: "#e0f2fe", hasStaff: true },
];

/* ── Avatar palettes ──────────────────────────────────────────── */

export interface AvatarPalette {
  hair: string;
  skin: string;
  shirt: string;
  pants: string;
}

export const PALETTES: AvatarPalette[] = [
  { hair: "#5c3317", skin: "#f5c8a0", shirt: "#e74c3c", pants: "#2c3e50" },
  { hair: "#1a1a2e", skin: "#d4a574", shirt: "#3498db", pants: "#34495e" },
  { hair: "#c0392b", skin: "#fad7a0", shirt: "#27ae60", pants: "#7f8c8d" },
  { hair: "#f39c12", skin: "#f0d5a8", shirt: "#8e44ad", pants: "#2c3e50" },
  { hair: "#2c3e50", skin: "#e8c39e", shirt: "#e67e22", pants: "#1a252f" },
  { hair: "#e91e63", skin: "#f5cba7", shirt: "#00bcd4", pants: "#37474f" },
  { hair: "#4a148c", skin: "#d7b899", shirt: "#ff9800", pants: "#3e2723" },
  { hair: "#006064", skin: "#f0c8a0", shirt: "#ff5722", pants: "#263238" },
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
