import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePdpaAudit } from './usePdpaAudit';

interface SuspiciousPattern {
  type: string;
  threshold: number;
  windowMinutes: number;
}

const PATTERNS: SuspiciousPattern[] = [
  { type: 'excessive_profile_views', threshold: 30, windowMinutes: 10 },
  { type: 'excessive_exports', threshold: 5, windowMinutes: 30 },
  { type: 'excessive_pii_reveals', threshold: 15, windowMinutes: 10 },
  { type: 'rapid_record_access', threshold: 50, windowMinutes: 5 },
];

/**
 * Client-side suspicious activity detector.
 * Tracks action counts in-memory and fires alerts when thresholds exceeded.
 */
export function useSuspiciousActivityDetector() {
  const { log } = usePdpaAudit();
  const [actionCounts, setActionCounts] = useState<Map<string, { count: number; firstAt: number }>>(new Map());

  const recordAction = useCallback(async (actionType: string) => {
    setActionCounts(prev => {
      const next = new Map(prev);
      const now = Date.now();
      const existing = next.get(actionType);

      if (existing) {
        next.set(actionType, { count: existing.count + 1, firstAt: existing.firstAt });
      } else {
        next.set(actionType, { count: 1, firstAt: now });
      }

      // Check patterns
      for (const pattern of PATTERNS) {
        if (!actionType.includes(pattern.type.replace('excessive_', '').replace('rapid_', ''))) continue;
        const entry = next.get(actionType);
        if (!entry) continue;

        const windowMs = pattern.windowMinutes * 60 * 1000;
        const elapsed = now - entry.firstAt;

        if (elapsed <= windowMs && entry.count >= pattern.threshold) {
          // Fire alert
          log({
            action_type: 'suspicious_bulk_access',
            target_type: pattern.type,
            result: 'denied',
            metadata: {
              action_type: actionType,
              count: entry.count,
              window_minutes: pattern.windowMinutes,
              threshold: pattern.threshold,
            },
          });

          // Create security alert
          supabase.from('security_alerts').insert({
            alert_type: pattern.type,
            severity: 'high',
            description: `${pattern.type}: ${entry.count} actions in ${pattern.windowMinutes}min (threshold: ${pattern.threshold})`,
            details: { actionType, count: entry.count },
          } as any).then(() => {});

          // Reset counter
          next.set(actionType, { count: 0, firstAt: now });
        }

        // Reset if window expired
        if (elapsed > windowMs) {
          next.set(actionType, { count: 1, firstAt: now });
        }
      }

      return next;
    });
  }, [log]);

  // Periodically clean old counters
  useEffect(() => {
    const interval = setInterval(() => {
      setActionCounts(prev => {
        const next = new Map(prev);
        const now = Date.now();
        for (const [key, val] of next) {
          if (now - val.firstAt > 30 * 60 * 1000) next.delete(key);
        }
        return next;
      });
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return { recordAction };
}
