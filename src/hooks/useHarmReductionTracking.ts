import { useEffect, useRef, useCallback } from 'react';
import { trackEvent } from '@/hooks/useAnalytics';
import { useLanguage } from '@/lib/i18n';

const HR_SOURCE_KEY = 'hr_source_page';
const HR_SCROLL_KEY = 'hr_scroll_tracked';

/**
 * Persist /harm-reduction as source_page so downstream service events
 * (booking_started, selftest_started, etc.) can attribute back.
 */
export function setHarmReductionSource() {
  sessionStorage.setItem(HR_SOURCE_KEY, '/harm-reduction');
}

/**
 * Read and optionally clear the harm-reduction source attribution.
 */
export function getHarmReductionSource(clear = false): string | null {
  const val = sessionStorage.getItem(HR_SOURCE_KEY);
  if (clear && val) sessionStorage.removeItem(HR_SOURCE_KEY);
  return val;
}

/**
 * Get source_page metadata for downstream events.
 */
export function getSourcePageMeta(): Record<string, string> | undefined {
  const src = sessionStorage.getItem(HR_SOURCE_KEY);
  return src ? { source_page: src } : undefined;
}

/**
 * Hook: scroll tracking, engaged read, and page view for /harm-reduction.
 * Call once at the landing section level.
 */
export function useHarmReductionPageTracking() {
  const { language } = useLanguage();
  const scrollFired = useRef<Set<number>>(new Set());
  const engagedFired = useRef(false);
  const pageViewFired = useRef(false);
  const startTime = useRef(Date.now());

  // Page view — once
  useEffect(() => {
    if (pageViewFired.current) return;
    pageViewFired.current = true;
    trackEvent('page_view_harm_reduction', { language });

    // Reset scroll tracking for this page view
    const stored = sessionStorage.getItem(HR_SCROLL_KEY);
    if (stored) {
      try { scrollFired.current = new Set(JSON.parse(stored)); } catch { /* ignore */ }
    }
    startTime.current = Date.now();
  }, [language]);

  // Scroll + engaged read tracking
  useEffect(() => {
    const thresholds = [25, 50, 75, 100];

    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;
      const pct = Math.round((scrollTop / docHeight) * 100);

      for (const t of thresholds) {
        if (pct >= t && !scrollFired.current.has(t)) {
          scrollFired.current.add(t);
          trackEvent(`harm_reduction_${t}_scroll`, { language, scroll_percent: t });
          // Persist so we don't re-fire on re-renders
          sessionStorage.setItem(HR_SCROLL_KEY, JSON.stringify([...scrollFired.current]));
        }
      }

      // Engaged read: 50% scroll OR 15s on page
      if (!engagedFired.current && (pct >= 50 || Date.now() - startTime.current >= 15000)) {
        engagedFired.current = true;
        trackEvent('harm_reduction_engaged_read', {
          language,
          trigger: pct >= 50 ? 'scroll_50' : 'time_15s',
          time_on_page_ms: Date.now() - startTime.current,
        });
      }
    };

    // Also check engaged read via timer
    const timer = setTimeout(() => {
      if (!engagedFired.current) {
        engagedFired.current = true;
        trackEvent('harm_reduction_engaged_read', {
          language,
          trigger: 'time_15s',
          time_on_page_ms: Date.now() - startTime.current,
        });
      }
    }, 15000);

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timer);
    };
  }, [language]);
}

/**
 * Track a CTA click on the harm-reduction page.
 * Automatically sets source attribution for downstream funnels.
 */
export function trackHrCta(
  ctaType: string,
  opts: {
    cta_label?: string;
    cta_position?: string;
    target_path?: string;
    content_section?: string;
  } = {}
) {
  setHarmReductionSource();
  trackEvent(`harm_reduction_cta_${ctaType}_click`, {
    source_page: '/harm-reduction',
    cta_label: opts.cta_label,
    cta_position: opts.cta_position,
    target_path: opts.target_path,
    content_section: opts.content_section,
  });
}

/**
 * Track content expand/interaction.
 */
export function trackHrContentExpand(section: string, detail?: string) {
  trackEvent('harm_reduction_content_expand', {
    source_page: '/harm-reduction',
    content_section: section,
    detail,
  });
}

/**
 * Track outbound link clicks.
 */
export function trackHrOutbound(url: string, label?: string, position?: string) {
  trackEvent('harm_reduction_outbound_click', {
    source_page: '/harm-reduction',
    target_path: url,
    cta_label: label,
    cta_position: position,
  });
}
