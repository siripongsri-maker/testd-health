import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { CalendarPlus, Download, BellRing, PackageCheck } from 'lucide-react';
import { toast } from 'sonner';
import {
  PREP_ITEMS,
  getPrepChecked,
  setPrepChecked,
  buildGoogleCalendarUrl,
  downloadIcs,
  type CalendarEventInput,
} from '@/lib/appointmentPrep';
import { enableAppointmentPush } from '@/lib/pushNotifications';

interface Props {
  appointmentId: string;
  date: string;
  time: string;
  serviceName: string;
  branchName: string;
  referralCode?: string | null;
  language: 'th' | 'en';
}

export function AppointmentPrepCard({
  appointmentId,
  date,
  time,
  serviceName,
  branchName,
  referralCode,
  language,
}: Props) {
  const isTh = language === 'th';
  const [checked, setChecked] = useState<string[]>([]);

  useEffect(() => {
    setChecked(getPrepChecked(appointmentId));
  }, [appointmentId]);

  const calendarInput: CalendarEventInput = useMemo(
    () => ({ date, time: time.slice(0, 5), serviceName, branchName, referralCode, language }),
    [date, time, serviceName, branchName, referralCode, language],
  );

  const toggle = (id: string) => {
    const next = checked.includes(id) ? checked.filter(c => c !== id) : [...checked, id];
    setChecked(next);
    setPrepChecked(appointmentId, next);
  };

  const allDone = PREP_ITEMS.every(i => checked.includes(i.id));

  const enableReminder = async () => {
    if (!('Notification' in window)) {
      toast.error(isTh ? 'อุปกรณ์นี้ไม่รองรับการแจ้งเตือน' : 'Notifications are not supported here');
      return;
    }

    const result = await enableAppointmentPush();

    if (result.ok) {
      localStorage.setItem('aptPrepReminderEnabled', 'true');
      toast.success(isTh ? 'เปิดการเตือนแล้ว' : 'Reminders enabled', {
        description: isTh
          ? 'จะเตือนเย็นวันก่อนนัด (19:00 น.) และ 1 ชั่วโมงก่อนถึงเวลานัด'
          : 'You will be alerted at 19:00 the evening before and 1 hour ahead',
      });
      return;
    }

    if (result.reason === 'ios-install') {
      toast.error(isTh ? 'ต้องเพิ่มเว็บลงหน้าจอโฮมก่อน' : 'Add to Home Screen first', {
        description: isTh
          ? 'บน iPhone กดปุ่มแชร์ แล้วเลือก “เพิ่มไปยังหน้าจอโฮม” จากนั้นกดเตือนอีกครั้ง'
          : 'On iPhone: Share → Add to Home Screen, then tap Remind again',
      });
      return;
    }

    if (result.reason === 'denied') {
      toast.error(isTh ? 'ยังไม่ได้อนุญาตการแจ้งเตือน' : 'Notification permission denied');
      return;
    }

    if (result.reason === 'no-session') {
      toast.error(isTh ? 'กรุณาเข้าสู่ระบบก่อนเปิดการเตือน' : 'Please sign in to enable reminders');
      return;
    }

    // Unsupported browser or unexpected error — fall back to local reminders.
    const permission =
      Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
    if (permission !== 'granted') {
      toast.error(isTh ? 'ยังไม่ได้อนุญาตการแจ้งเตือน' : 'Notification permission denied');
      return;
    }
    localStorage.setItem('aptPrepReminderEnabled', 'true');
    toast.success(isTh ? 'เปิดการเตือนในเว็บแล้ว' : 'In-app reminders enabled', {
      description: isTh
        ? 'อุปกรณ์นี้เตือนได้เฉพาะตอนเปิดเว็บไว้'
        : 'This device can only remind you while the site is open',
    });
  };

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-3">
      <div className="flex items-center gap-2">
        <PackageCheck className="h-4 w-4 text-primary shrink-0" />
        <p className="text-sm font-bold text-foreground">
          {isTh ? 'สิ่งที่ต้องเอามาด้วย' : 'What to bring'}
        </p>
        {allDone && (
          <span className="ml-auto text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
            {isTh ? 'เตรียมครบแล้ว ✓' : 'All packed ✓'}
          </span>
        )}
      </div>

      <ul className="space-y-2">
        {PREP_ITEMS.map(item => {
          const isChecked = checked.includes(item.id);
          return (
            <li key={item.id} className="flex items-start gap-2.5">
              <Checkbox
                id={`${appointmentId}-${item.id}`}
                checked={isChecked}
                onCheckedChange={() => toggle(item.id)}
                className="mt-0.5"
              />
              <label
                htmlFor={`${appointmentId}-${item.id}`}
                className="cursor-pointer leading-tight"
              >
                <span className={`text-xs font-medium ${isChecked ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                  {item.emoji} {isTh ? item.labelTh : item.labelEn}
                </span>
                {(isTh ? item.hintTh : item.hintEn) && (
                  <span className="block text-[10px] text-muted-foreground">
                    {isTh ? item.hintTh : item.hintEn}
                  </span>
                )}
              </label>
            </li>
          );
        })}
      </ul>

      <div className="grid grid-cols-3 gap-1.5">
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-[11px] px-1"
          onClick={() => window.open(buildGoogleCalendarUrl(calendarInput), '_blank', 'noopener')}
        >
          <CalendarPlus className="h-3.5 w-3.5 mr-1" />
          Google
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-[11px] px-1"
          onClick={() => downloadIcs(calendarInput)}
        >
          <Download className="h-3.5 w-3.5 mr-1" />
          {isTh ? 'ปฏิทินอื่น' : 'Other'}
        </Button>
        <Button size="sm" variant="outline" className="h-8 text-[11px] px-1" onClick={enableReminder}>
          <BellRing className="h-3.5 w-3.5 mr-1" />
          {isTh ? 'เตือน' : 'Remind'}
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground">
        {isTh
          ? 'บันทึกลงปฏิทินแล้วจะเตือนเย็นวันก่อนนัด และ 1 ชั่วโมงก่อนถึงคิว'
          : 'Calendar entries alert you the evening before and 1 hour ahead.'}
      </p>
    </div>
  );
}
