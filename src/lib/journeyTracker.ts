import { supabase } from '@/integrations/supabase/client';
import { getVisitorId } from './visitorId';
import { getSessionAttribution } from './attribution';

export type EventCategory =
  | 'acquisition'
  | 'engagement'
  | 'account'
  | 'booking'
  | 'communication'
  | 'virtual'
  | 'harm_reduction';

export const trackJourneyEvent = async (
  category: EventCategory,
  eventType: string,
  meta?: Record<string, unknown>
) => {
  try {
    const anonymousId = getVisitorId();
    const attribution = getSessionAttribution();
    const sessionId = sessionStorage.getItem('analytics_session_id') || anonymousId;

    const { data: { user } } = await supabase.auth.getUser();

    const deviceType = /Mobile|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' :
      /Tablet|iPad/i.test(navigator.userAgent) ? 'tablet' : 'desktop';

    await supabase.from('analytics_events').insert({
      event_type: eventType,
      event_category: category,
      page_path: window.location.pathname,
      user_id: user?.id || null,
      session_id: sessionId,
      anonymous_id: anonymousId,
      device_type: deviceType,
      campaign: attribution?.campaign || null,
      channel: attribution?.channel || null,
      source: attribution?.source || null,
      medium: attribution?.medium || null,
      link_id: attribution?.link_id || null,
      service_id: (meta?.service_id as string) || null,
      branch_id: (meta?.branch_id as string) || null,
      booking_id: (meta?.booking_id as string) || null,
      metadata: meta && Object.keys(meta).length > 0
        ? Object.fromEntries(Object.entries(meta).filter(([k]) => !['service_id', 'branch_id', 'booking_id'].includes(k)))
        : null,
    } as any);
  } catch (err) {
    // Silent fail — analytics should not break UX
  }
};
