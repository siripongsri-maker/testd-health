// Invite attribution context - persists through booking flow
const ATTRIBUTION_KEY = 'invite_attribution';

export interface InviteAttribution {
  invite_code: string;
  invite_id?: string;
  session_code?: string;
  session_id?: string;
  attribution_type: 'invite_link' | 'invite_qr' | 'pair_session';
  visitor_session_id: string;
  set_at: number;
}

export function setInviteAttribution(attr: InviteAttribution) {
  sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attr));
}

export function getInviteAttribution(): InviteAttribution | null {
  try {
    const raw = sessionStorage.getItem(ATTRIBUTION_KEY);
    if (!raw) return null;
    const attr = JSON.parse(raw) as InviteAttribution;
    // Expire after 2 hours
    if (Date.now() - attr.set_at > 2 * 60 * 60 * 1000) {
      sessionStorage.removeItem(ATTRIBUTION_KEY);
      return null;
    }
    return attr;
  } catch {
    return null;
  }
}

export function clearInviteAttribution() {
  sessionStorage.removeItem(ATTRIBUTION_KEY);
}
