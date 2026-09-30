// Centralized helper: "ขอคำปรึกษา" / "ติดต่อเจ้าหน้าที่" CTAs open the SWING LINE office in a new tab.
// Keep using this everywhere so we have a single source of truth.
export const SUPPORT_CHAT_URL = 'https://lin.ee/5flow4L';

export function openSupportChat() {
  try {
    window.open(SUPPORT_CHAT_URL, '_blank', 'noopener,noreferrer');
  } catch {
    window.location.href = SUPPORT_CHAT_URL;
  }
}
