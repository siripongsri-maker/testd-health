import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

// Generate or get session ID
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('analytics_session_id');
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('analytics_session_id', sessionId);
  }
  return sessionId;
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

export const useAnalytics = () => {
  const location = useLocation();
  const lastTrackedPath = useRef<string>('');

  useEffect(() => {
    // Avoid tracking the same path multiple times in quick succession
    if (lastTrackedPath.current === location.pathname) {
      return;
    }
    lastTrackedPath.current = location.pathname;

    const trackPageView = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        const eventData = {
          event_type: 'pageview',
          page_path: location.pathname,
          user_id: user?.id || null,
          session_id: getSessionId(),
          referrer: document.referrer || null,
          user_agent: navigator.userAgent,
          device_type: getDeviceType(),
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
    
    const eventData = {
      event_type: eventType,
      page_path: window.location.pathname,
      user_id: user?.id || null,
      session_id: getSessionId(),
      device_type: getDeviceType(),
    };

    const { error } = await supabase
      .from('analytics_events')
      .insert(eventData);

    if (error) {
      console.error('Failed to track event:', error);
    }
  } catch (err) {
    console.error('Analytics error:', err);
  }
};
