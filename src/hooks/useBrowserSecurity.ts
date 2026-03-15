import { useEffect } from 'react';
import { useAuth } from './useAuth';
import { usePdpaAudit } from './usePdpaAudit';
import { usePdpaFeatureFlag } from './usePdpaFeatureFlag';
import {
  injectPrintWatermark,
  removePrintWatermark,
  detectDevTools,
  onPrintAttempt,
} from '@/lib/browserSecurity';

/**
 * Hook to enable browser security hardening on admin/sensitive pages.
 * Activates print watermarking, dev tools detection logging, and print audit.
 */
export function useBrowserSecurity(options?: { enabled?: boolean }) {
  const { user } = useAuth();
  const { log } = usePdpaAudit();
  const pdpaEnabled = usePdpaFeatureFlag();
  const active = (options?.enabled ?? true) && pdpaEnabled;

  useEffect(() => {
    if (!active) return;

    const email = user?.email || 'unknown';
    injectPrintWatermark(email);

    const cleanupDevTools = detectDevTools(() => {
      log({
        action_type: 'suspicious_bulk_access',
        target_type: 'dev_tools',
        target_classification: 'internal',
        result: 'allowed',
        metadata: { trigger: 'dev_tools_detected', email },
      });
    });

    const cleanupPrint = onPrintAttempt(log);

    return () => {
      removePrintWatermark();
      cleanupDevTools();
      cleanupPrint();
    };
  }, [active, user?.email]);
}
