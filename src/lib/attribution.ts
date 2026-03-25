import { supabase } from '@/integrations/supabase/client';
import { getVisitorId } from './visitorId';

const ATTR_SESSION_KEY = 'testd_attribution';

export interface AttributionData {
  campaign?: string;
  channel?: string;
  source?: string;
  medium?: string;
  content?: string;
  term?: string;
  partner_name?: string;
  link_id?: string;
  landing_page?: string;
  referrer?: string;
}

/** Parse UTM / custom params from current URL */
export const parseAttributionParams = (): AttributionData | null => {
  const params = new URLSearchParams(window.location.search);
  const data: AttributionData = {};
  let hasAny = false;

  const map: Record<string, keyof AttributionData> = {
    utm_campaign: 'campaign',
    utm_source: 'source',
    utm_medium: 'medium',
    utm_content: 'content',
    utm_term: 'term',
    campaign: 'campaign',
    channel: 'channel',
    source: 'source',
    medium: 'medium',
    partner: 'partner_name',
    link_id: 'link_id',
  };

  for (const [param, key] of Object.entries(map)) {
    const val = params.get(param);
    if (val) {
      data[key] = val;
      hasAny = true;
    }
  }

  if (!hasAny && document.referrer) {
    try {
      const ref = new URL(document.referrer);
      if (ref.hostname !== window.location.hostname) {
        data.referrer = document.referrer;
        // Auto-detect channel from referrer
        const host = ref.hostname.toLowerCase();
        if (host.includes('facebook') || host.includes('fb.')) data.channel = 'facebook';
        else if (host.includes('instagram')) data.channel = 'instagram';
        else if (host.includes('line.me')) data.channel = 'line';
        else if (host.includes('tiktok')) data.channel = 'tiktok';
        else if (host.includes('twitter') || host.includes('x.com')) data.channel = 'x';
        else if (host.includes('google')) { data.channel = 'organic'; data.source = 'google'; }
        else data.channel = 'referral';
        hasAny = true;
      }
    } catch { /* ignore */ }
  }

  if (!hasAny) return null;

  data.landing_page = window.location.pathname;
  data.referrer = data.referrer || document.referrer || undefined;
  return data;
};

/** Store attribution in session for current visit */
export const getSessionAttribution = (): AttributionData | null => {
  try {
    const raw = sessionStorage.getItem(ATTR_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

export const setSessionAttribution = (data: AttributionData) => {
  sessionStorage.setItem(ATTR_SESSION_KEY, JSON.stringify(data));
};

/** Upsert visitor_attribution in DB */
export const captureAttribution = async (data: AttributionData) => {
  const anonymousId = getVisitorId();
  setSessionAttribution(data);

  const deviceType = /Mobile|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' :
    /Tablet|iPad/i.test(navigator.userAgent) ? 'tablet' : 'desktop';

  try {
    // Check if exists
    const { data: existing } = await supabase
      .from('visitor_attribution')
      .select('id')
      .eq('anonymous_id', anonymousId)
      .maybeSingle();

    if (existing) {
      // Update last-touch + increment sessions
      await supabase.from('visitor_attribution').update({
        last_touch_campaign: data.campaign || null,
        last_touch_channel: data.channel || null,
        last_touch_source: data.source || null,
        last_touch_medium: data.medium || null,
        last_touch_content: data.content || null,
        last_touch_term: data.term || null,
        last_touch_partner: data.partner_name || null,
        last_touch_link_id: data.link_id || null,
        last_touch_landing_page: data.landing_page || null,
        last_touch_referrer: data.referrer || null,
        last_touch_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
        total_sessions: (existing as any).total_sessions ? (existing as any).total_sessions + 1 : 1,
      } as any).eq('id', existing.id);
    } else {
      // First-touch insert
      const now = new Date().toISOString();
      await supabase.from('visitor_attribution').insert({
        anonymous_id: anonymousId,
        first_touch_campaign: data.campaign || null,
        first_touch_channel: data.channel || null,
        first_touch_source: data.source || null,
        first_touch_medium: data.medium || null,
        first_touch_content: data.content || null,
        first_touch_term: data.term || null,
        first_touch_partner: data.partner_name || null,
        first_touch_link_id: data.link_id || null,
        first_touch_landing_page: data.landing_page || null,
        first_touch_referrer: data.referrer || null,
        first_touch_at: now,
        last_touch_campaign: data.campaign || null,
        last_touch_channel: data.channel || null,
        last_touch_source: data.source || null,
        last_touch_medium: data.medium || null,
        last_touch_content: data.content || null,
        last_touch_term: data.term || null,
        last_touch_partner: data.partner_name || null,
        last_touch_link_id: data.link_id || null,
        last_touch_landing_page: data.landing_page || null,
        last_touch_referrer: data.referrer || null,
        last_touch_at: now,
        device_type: deviceType,
        user_agent: navigator.userAgent,
      } as any);
    }
  } catch (err) {
    console.error('Attribution capture error:', err);
  }
};

/** Link anonymous visitor to authenticated user */
export const linkVisitorToUser = async (userId: string) => {
  const anonymousId = getVisitorId();
  try {
    await supabase.from('visitor_attribution')
      .update({ user_id: userId } as any)
      .eq('anonymous_id', anonymousId);
  } catch { /* silent */ }
};

/** Init attribution on app load */
export const initAttribution = () => {
  const data = parseAttributionParams();
  if (data) {
    captureAttribution(data);
  }
};
