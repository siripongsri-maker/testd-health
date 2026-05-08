/**
 * Lightweight client-side debug mode for virtual share analytics.
 *
 * Enable by either:
 *   - URL param:    ?debug_share=1   (persists to localStorage)
 *   - localStorage: virtual_share_debug = "1"
 * Disable with     ?debug_share=0   or clearing the localStorage key.
 *
 * When enabled, every share-related event payload is:
 *   - logged to the console (grouped) BEFORE the network call
 *   - surfaced as a short toast so it is visible in the preview UI
 */
import { toast } from '@/hooks/use-toast';

const STORAGE_KEY = 'virtual_share_debug';

export function isShareDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const params = new URLSearchParams(window.location.search);
    const flag = params.get('debug_share');
    if (flag === '1' || flag === 'true') {
      localStorage.setItem(STORAGE_KEY, '1');
      return true;
    }
    if (flag === '0' || flag === 'false') {
      localStorage.removeItem(STORAGE_KEY);
      return false;
    }
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function debugSharePayload(event: string, payload: Record<string, unknown>) {
  if (!isShareDebugEnabled()) return;
  // eslint-disable-next-line no-console
  console.groupCollapsed(`%c[virtual-share:debug] ${event}`, 'color:#c0275e;font-weight:600');
  // eslint-disable-next-line no-console
  console.log('payload', payload);
  // eslint-disable-next-line no-console
  console.trace('fired from');
  // eslint-disable-next-line no-console
  console.groupEnd();
  try {
    toast({
      title: `🐞 ${event}`,
      description: JSON.stringify(payload, null, 0).slice(0, 240),
    });
  } catch {
    // ignore toast failures in non-UI contexts
  }
}
