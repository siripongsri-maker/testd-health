import { supabase } from '@/integrations/supabase/client';

/** Public VAPID key — safe to ship to the browser. */
export const VAPID_PUBLIC_KEY =
  'BMiL0x2GGHRc791oPo6grOHpMxvKnFUy70mOwwPdwvzbZ3qyXJ4iLFmkNdtciurRxUgY5CZGiG6ul-1YK9MzvJc';

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/** iOS only allows push when the site is installed to the home screen. */
export function isIosNeedsInstall(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && 'ontouchend' in document);
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    // @ts-expect-error iOS Safari only
    window.navigator.standalone === true;
  return isIos && !standalone;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

export type PushFailReason = 'unsupported' | 'ios-install' | 'denied' | 'no-session' | 'error';

export interface PushEnableResult {
  ok: boolean;
  reason?: PushFailReason;
  message?: string;
}

/** Ask permission, subscribe with the push service and store the subscription. */
export async function enableAppointmentPush(): Promise<PushEnableResult> {
  if (!isPushSupported()) {
    return { ok: false, reason: isIosNeedsInstall() ? 'ios-install' : 'unsupported' };
  }

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, reason: 'no-session' };

  const permission =
    Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  if (permission !== 'granted') return { ok: false, reason: 'denied' };

  try {
    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
      }));

    const json = subscription.toJSON() as {
      endpoint?: string;
      keys?: { p256dh?: string; auth?: string };
    };
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      return { ok: false, reason: 'error', message: 'invalid subscription' };
    }

    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: auth.user.id,
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
      },
      { onConflict: 'user_id,endpoint' },
    );
    if (error) return { ok: false, reason: 'error', message: error.message };

    localStorage.setItem('aptPushEnabled', 'true');
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: 'error', message: e instanceof Error ? e.message : String(e) };
  }
}

export async function isAppointmentPushEnabled(): Promise<boolean> {
  if (!isPushSupported() || Notification.permission !== 'granted') return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    return !!(await registration.pushManager.getSubscription());
  } catch {
    return false;
  }
}
