import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getVisitorId } from '@/lib/visitorId';
import { getSessionAttribution } from '@/lib/attribution';
import { recordPageSignal } from '@/lib/ctaPriority';

// Generate or get session ID
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('analytics_session_id');
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('analytics_session_id', sessionId);
    // Store session start time
    sessionStorage.setItem('analytics_session_start', Date.now().toString());
  }
  return sessionId;
};

// Get session start time
const getSessionStartTime = (): number => {
  const startTime = sessionStorage.getItem('analytics_session_start');
  if (!startTime) {
    const now = Date.now();
    sessionStorage.setItem('analytics_session_start', now.toString());
    return now;
  }
  return parseInt(startTime, 10);
};

// Calculate session duration in seconds
const getSessionDuration = (): number => {
  const startTime = getSessionStartTime();
  return Math.floor((Date.now() - startTime) / 1000);
};

// Detect device type
const getDeviceType = (): string => {
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
};

// Track session end when user leaves
const trackSessionEnd = async () => {
  try {
    const sessionId = sessionStorage.getItem('analytics_session_id');
    if (!sessionId) return;

    const duration = getSessionDuration();
    const { data: { user } } = await supabase.auth.getUser();

    await supabase
      .from('analytics_events')
      .insert({
        event_type: 'session_end',
        page_path: window.location.pathname,
        user_id: user?.id || null,
        session_id: sessionId,
        device_type: getDeviceType(),
        session_duration_seconds: duration,
        session_ended_at: new Date().toISOString(),
      });
  } catch (err) {
    // Silently fail
  }
};

// Set up session end tracking
if (typeof window !== 'undefined') {
  // Track on page unload using the Supabase client (authenticated)
  window.addEventListener('beforeunload', () => {
    // Use visibilitychange handler instead — sendBeacon without auth headers
    // is unreliable and bypasses RLS. The visibilitychange event below handles this.
  });

  // Track on visibility change (tab switch/minimize/close)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      trackSessionEnd();
    }
  });
}

export const useAnalytics = () => {
  const location = useLocation();
  const lastTrackedPath = useRef<string>('');

  useEffect(() => {
    // Avoid tracking the same path multiple times in quick succession
    if (lastTrackedPath.current === location.pathname) {
      return;
    }
    lastTrackedPath.current = location.pathname;
    recordPageSignal(location.pathname);

    const trackPageView = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const sessionId = getSessionId();
        const sessionStartTime = new Date(getSessionStartTime()).toISOString();

        const anonymousId = getVisitorId();
        const attribution = getSessionAttribution();

        const eventData = {
          event_type: 'pageview',
          page_path: location.pathname,
          user_id: user?.id || null,
          session_id: sessionId,
          referrer: document.referrer || null,
          user_agent: navigator.userAgent,
          device_type: getDeviceType(),
          session_started_at: sessionStartTime,
          anonymous_id: anonymousId,
          event_category: 'acquisition',
          campaign: attribution?.campaign || null,
          channel: attribution?.channel || null,
          source: attribution?.source || null,
          medium: attribution?.medium || null,
          link_id: attribution?.link_id || null,
        };

        // Insert into analytics_events table
        const { error } = await supabase
          .from('analytics_events')
          .insert(eventData);

        if (error) {
          console.error('Failed to track page view:', error);
        }
      } catch (err) {
        // Silently fail - analytics shouldn't break the app
        console.error('Analytics error:', err);
      }
    };

    trackPageView();
  }, [location.pathname]);
};

// Function to track custom events
export const trackEvent = async (eventType: string, metadata?: Record<string, unknown>) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    const anonymousId = getVisitorId();
    const attribution = getSessionAttribution();

    const eventData = {
      event_type: eventType,
      page_path: window.location.pathname,
      user_id: user?.id || null,
      session_id: getSessionId(),
      device_type: getDeviceType(),
      metadata: metadata && Object.keys(metadata).length > 0 ? (metadata as any) : null,
      anonymous_id: anonymousId,
      campaign: attribution?.campaign || null,
      channel: attribution?.channel || null,
      source: attribution?.source || null,
      medium: attribution?.medium || null,
      link_id: attribution?.link_id || null,
    };

    const { error } = await supabase
      .from('analytics_events')
      .insert(eventData as any);

    if (error) {
      console.error('Failed to track event:', error);
    }
  } catch (err) {
    console.error('Analytics error:', err);
  }
};
