import { useState, useEffect, useCallback, useRef } from 'react';
import { APP_VERSION, BUILD_TIME } from '@/config/appVersion';
import { supabase } from '@/integrations/supabase/client';

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const BROADCAST_CHANNEL = 'testd-update';

export interface VersionInfo {
  latestVersion: string;
  isHardUpdate: boolean;
  hardUpdateMinVersion: string | null;
  messageTh: string;
  messageEn: string;
}

export interface VersionCheckState {
  currentVersion: string;
  buildTime: string;
  latestVersion: string | null;
  updateAvailable: boolean;
  isHardUpdate: boolean;
  messageTh: string;
  messageEn: string;
  lastCheckTime: string | null;
  checking: boolean;
  swStatus: string;
}

// Routes where we should NOT auto-reload
const PROTECTED_ROUTES = [
  '/booking',
  '/surveys/',
  '/hiv-selftest',
  '/consultation',
  '/personal-info',
  '/health-profile',
];

export function detectUnsavedWork(): boolean {
  const path = window.location.pathname;
  return PROTECTED_ROUTES.some(r => path.startsWith(r));
}

function compareVersions(current: string, latest: string): boolean {
  return current !== latest;
}

export function useVersionCheck() {
  const [state, setState] = useState<VersionCheckState>({
    currentVersion: APP_VERSION,
    buildTime: BUILD_TIME,
    latestVersion: null,
    updateAvailable: false,
    isHardUpdate: false,
    messageTh: '',
    messageEn: '',
    lastCheckTime: null,
    checking: false,
    swStatus: 'unknown',
  });

  const [dismissed, setDismissed] = useState(false);
  const [hardDeferred, setHardDeferred] = useState(false);
  const hardDeferTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bcRef = useRef<BroadcastChannel | null>(null);

  const checkVersion = useCallback(async () => {
    setState(s => ({ ...s, checking: true }));
    try {
      const { data, error } = await supabase
        .from('app_release_controls')
        .select('latest_version, is_hard_update, hard_update_min_version, message_th, message_en')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        setState(s => ({ ...s, checking: false, lastCheckTime: new Date().toISOString() }));
        console.log('[version] Check failed or no config:', error?.message);
        return;
      }

      const updateAvailable = compareVersions(APP_VERSION, data.latest_version);

      setState(s => ({
        ...s,
        latestVersion: data.latest_version,
        updateAvailable,
        isHardUpdate: data.is_hard_update ?? false,
        messageTh: data.message_th || 'มีเวอร์ชันใหม่พร้อมใช้งาน',
        messageEn: data.message_en || 'A new version is available',
        lastCheckTime: new Date().toISOString(),
        checking: false,
      }));

      if (updateAvailable) {
        console.log(`[version] Update available: ${APP_VERSION} → ${data.latest_version} (hard: ${data.is_hard_update})`);
        // Notify other tabs
        bcRef.current?.postMessage({
          type: 'UPDATE_AVAILABLE',
          version: data.latest_version,
          isHard: data.is_hard_update,
        });
      }
    } catch (err) {
      setState(s => ({ ...s, checking: false }));
      console.warn('[version] Check error:', err);
    }
  }, []);

  const performUpdate = useCallback(async () => {
    console.log('[version] Performing update...');

    // Notify other tabs to reload too
    bcRef.current?.postMessage({ type: 'DO_UPDATE' });

    // Clear SW caches
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }

    // Unregister service workers
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
    }

    // Hard reload
    window.location.reload();
  }, []);

  const dismissUpdate = useCallback(() => {
    setDismissed(true);
  }, []);

  const deferHardUpdate = useCallback(() => {
    setHardDeferred(true);
    // Auto-force after 60 seconds
    hardDeferTimeout.current = setTimeout(() => {
      setHardDeferred(false);
    }, 60_000);
  }, []);

  // Check SW status
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(reg => {
        let status = 'active';
        if (reg.waiting) status = 'waiting';
        if (reg.installing) status = 'installing';
        setState(s => ({ ...s, swStatus: status }));
      }).catch(() => {
        setState(s => ({ ...s, swStatus: 'unsupported' }));
      });
    } else {
      setState(s => ({ ...s, swStatus: 'unsupported' }));
    }
  }, []);

  // BroadcastChannel for multi-tab sync
  useEffect(() => {
    try {
      const bc = new BroadcastChannel(BROADCAST_CHANNEL);
      bcRef.current = bc;

      bc.onmessage = (event) => {
        if (event.data?.type === 'DO_UPDATE') {
          performUpdate();
        } else if (event.data?.type === 'UPDATE_AVAILABLE') {
          setState(s => ({
            ...s,
            updateAvailable: true,
            latestVersion: event.data.version,
            isHardUpdate: event.data.isHard,
          }));
        }
      };

      return () => {
        bc.close();
        bcRef.current = null;
      };
    } catch {
      // BroadcastChannel not supported
    }
  }, [performUpdate]);

  // Periodic check
  useEffect(() => {
    checkVersion();
    const interval = setInterval(checkVersion, CHECK_INTERVAL_MS);
    return () => {
      clearInterval(interval);
      if (hardDeferTimeout.current) clearTimeout(hardDeferTimeout.current);
    };
  }, [checkVersion]);

  const hasUnsavedWork = detectUnsavedWork();

  // Determine what to show
  const showSoftBanner = state.updateAvailable && !state.isHardUpdate && !dismissed;
  const showHardModal = state.updateAvailable && state.isHardUpdate && !hardDeferred;

  return {
    ...state,
    showSoftBanner,
    showHardModal,
    hasUnsavedWork,
    dismissed,
    hardDeferred,
    performUpdate,
    dismissUpdate,
    deferHardUpdate,
    checkVersion,
  };
}
