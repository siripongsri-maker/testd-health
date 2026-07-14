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

/** Upsert visitor_attribution in DB via SECURITY DEFINER RPC.
 *  Direct anon UPDATE on the table is no longer permitted — all writes flow
 *  through this narrow, ownership-scoped surface. */
export const captureAttribution = async (data: AttributionData) => {
  const anonymousId = getVisitorId();
  setSessionAttribution(data);

  const deviceType = /Mobile|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' :
    /Tablet|iPad/i.test(navigator.userAgent) ? 'tablet' : 'desktop';

  try {
    await supabase.rpc('upsert_visitor_attribution_touch', {
      p_anonymous_id: anonymousId,
      p_campaign: data.campaign || null,
      p_channel: data.channel || null,
      p_source: data.source || null,
      p_medium: data.medium || null,
      p_content: data.content || null,
      p_term: data.term || null,
      p_partner: data.partner_name || null,
      p_link_id: data.link_id || null,
      p_landing_page: data.landing_page || null,
      p_referrer: data.referrer || null,
      p_device_type: deviceType,
    } as any);
  } catch (err) {
    console.warn('captureAttribution error:', err);
  }
};

/** Initialise attribution capture on app boot */
export const initAttribution = () => {
  const data = parseAttributionParams();
  if (data) {
    captureAttribution(data);
  } else {
    // Still touch last_seen / session count via anonymous_id only
    captureAttribution({});
  }
};

/** Link the current anonymous visitor row to a signed-in user (auth-required). */
export const linkVisitorToUser = async (userId: string) => {
  const anonymousId = getVisitorId();
  try {
    await supabase
      .from('visitor_attribution')
      .update({ user_id: userId, identified_at: new Date().toISOString() } as any)
      .eq('anonymous_id', anonymousId)
      .is('user_id', null);
  } catch (err) {
    console.warn('linkVisitorToUser error:', err);
  }
};
