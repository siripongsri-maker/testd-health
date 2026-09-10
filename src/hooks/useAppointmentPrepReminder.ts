import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getPrepChecked, PREP_ITEMS } from '@/lib/appointmentPrep';

/**
 * In-app reminder: when the user opens the app and has an appointment today or
 * tomorrow with an incomplete "what to bring" checklist, show a browser
 * notification. Fires at most once per appointment per day.
 */
export function useAppointmentPrepReminder() {
  useEffect(() => {
    if (localStorage.getItem('aptPrepReminderEnabled') !== 'true') return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    let cancelled = false;

    const bangkokDate = (offsetDays: number) => {
      const now = new Date(Date.now() + 7 * 3600_000 + offsetDays * 86400_000);
      return now.toISOString().slice(0, 10);
    };

    const run = async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user || cancelled) return;

      const today = bangkokDate(0);
      const tomorrow = bangkokDate(1);

      const { data } = await supabase
        .from('appointments')
        .select('id, appointment_date, start_time, status')
        .eq('user_id', auth.user.id)
        .in('appointment_date', [today, tomorrow])
        .in('status', ['booked', 'confirmed']);

      if (cancelled || !data?.length) return;

      for (const apt of data) {
        const flag = `aptPrepNotified_${apt.id}_${today}`;
        if (localStorage.getItem(flag)) continue;

        const done = getPrepChecked(apt.id);
        if (PREP_ITEMS.every(i => done.includes(i.id))) continue;

        localStorage.setItem(flag, '1');
        const isTomorrow = apt.appointment_date === tomorrow;
        new Notification(isTomorrow ? '📋 พรุ่งนี้มีนัดที่คลินิก' : '📋 วันนี้มีนัดที่คลินิก', {
          body: 'บัตรประชาชน (ตัวจริง) • ถุงสำหรับใส่ยากลับบ้าน — testD',
          icon: '/pwa-192x192.png',
          tag: `apt-prep-${apt.id}`,
        });
        break;
      }
    };

    const timer = setTimeout(run, 4000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);
}
