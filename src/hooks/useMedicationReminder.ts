import { useEffect, useRef } from 'react';

/**
 * In-app medication reminder using browser Notification API.
 * Checks every 30 seconds if the current time matches the set reminder time.
 * Only fires once per day (tracked via localStorage).
 */
export function useMedicationReminder() {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const enabled = localStorage.getItem('medReminderEnabled') === 'true';
    if (!enabled) return;

    const check = () => {
      const reminderTime = localStorage.getItem('medReminderTime');
      if (!reminderTime) return;

      const now = new Date();
      const [h, m] = reminderTime.split(':').map(Number);
      const currentH = now.getHours();
      const currentM = now.getMinutes();

      // Check if within the reminder minute
      if (currentH === h && currentM === m) {
        const todayKey = `medReminded_${now.toISOString().slice(0, 10)}`;
        if (localStorage.getItem(todayKey)) return; // Already reminded today
        localStorage.setItem(todayKey, '1');

        // Send browser notification if permitted
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('💊 เวลากินยา', {
            body: 'อย่าลืมกินยาตรงเวลานะ — testD',
            icon: '/pwa-192x192.png',
            tag: 'med-reminder',
          });
        }
      }
    };

    // Check immediately and then every 30 seconds
    check();
    timerRef.current = setInterval(check, 30_000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);
}
