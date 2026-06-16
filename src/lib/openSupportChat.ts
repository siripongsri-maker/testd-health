// Centralized helper: "ขอคำปรึกษา" CTAs open LINE @swingthailand in a new tab.
// Keep using this everywhere so we have a single source of truth.
export const SUPPORT_CHAT_URL = 'https://line.me/R/ti/p/@swingthailand';

export function openSupportChat() {
  try {
    window.open(SUPPORT_CHAT_URL, '_blank', 'noopener,noreferrer');
  } catch {
    window.location.href = SUPPORT_CHAT_URL;
  }
}
