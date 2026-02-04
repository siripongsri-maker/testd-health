import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Clock, Bell, BellOff } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { getUserData, getTodayKey, recordCheckIn, setUserData } from '@/lib/store';
import { toast } from 'sonner';

interface MedicationWidgetProps {
  onStatusChange?: () => void;
}

export function MedicationWidget({ onStatusChange }: MedicationWidgetProps) {
  const { language } = useLanguage();
  const [userData, setLocalUserData] = useState(getUserData());
  const [todayStatus, setTodayStatus] = useState<'pending' | 'taken' | 'skipped'>('pending');
  const [reminderEnabled, setReminderEnabled] = useState(() => {
    return localStorage.getItem('medReminderEnabled') === 'true';
  });
  const [reminderTime, setReminderTime] = useState(() => {
    return localStorage.getItem('medReminderTime') || '20:00';
  });
  const reminderTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  // Check notification permission
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Load today's status
  useEffect(() => {
    const data = getUserData();
    setLocalUserData(data);
    const today = getTodayKey();
    if (data.checkIns[today]) {
      setTodayStatus(data.checkIns[today]);
    }
  }, []);

  // Set up reminder timer
  useEffect(() => {
    if (!reminderEnabled || todayStatus === 'taken') {
      if (reminderTimeoutRef.current) {
        clearTimeout(reminderTimeoutRef.current);
      }
      return;
    }

    const scheduleReminder = () => {
      const now = new Date();
      const [hours, minutes] = reminderTime.split(':').map(Number);
      const reminderDate = new Date();
      reminderDate.setHours(hours, minutes, 0, 0);

      // If reminder time passed today, don't schedule
      if (reminderDate <= now) {
        return;
      }

      const msUntilReminder = reminderDate.getTime() - now.getTime();

      reminderTimeoutRef.current = setTimeout(() => {
        triggerReminder();
      }, msUntilReminder);
    };

    scheduleReminder();

    return () => {
      if (reminderTimeoutRef.current) {
        clearTimeout(reminderTimeoutRef.current);
      }
    };
  }, [reminderEnabled, reminderTime, todayStatus]);

  const triggerReminder = async () => {
    const title = language === 'th' ? '⏰ ได้เวลากินยาแล้ว' : '⏰ Time to take your medication';
    const body = language === 'th' ? 'อย่าลืมกินยาวันนี้นะ' : "Don't forget to take your medication today";

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/pwa-192x192.png' });
    } else {
      // Fallback to toast
      toast(title, { description: body, duration: 10000 });
    }
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      toast.error(language === 'th' ? 'เบราว์เซอร์ไม่รองรับการแจ้งเตือน' : 'Browser does not support notifications');
      return false;
    }

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    return permission === 'granted';
  };

  const toggleReminder = async () => {
    if (!reminderEnabled) {
      // Enabling - request permission first
      const granted = await requestNotificationPermission();
      if (!granted && notificationPermission !== 'granted') {
        toast.info(
          language === 'th' 
            ? 'จะแจ้งเตือนผ่านแอปแทน' 
            : 'Will use in-app reminders instead'
        );
      }
    }
    
    const newValue = !reminderEnabled;
    setReminderEnabled(newValue);
    localStorage.setItem('medReminderEnabled', String(newValue));
    
    toast.success(
      newValue 
        ? (language === 'th' ? 'เปิดการแจ้งเตือนแล้ว' : 'Reminder enabled')
        : (language === 'th' ? 'ปิดการแจ้งเตือนแล้ว' : 'Reminder disabled')
    );
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value;
    setReminderTime(newTime);
    localStorage.setItem('medReminderTime', newTime);
    
    // Also save to user data for consistency
    setUserData({ prepReminderTime: newTime });
  };

  const handleMarkTaken = () => {
    const today = getTodayKey();
    recordCheckIn(today, 'taken');
    setTodayStatus('taken');
    
    const data = getUserData();
    setLocalUserData(data);
    
    toast.success(
      language === 'th' ? 'ดีมาก! ทำได้ดี 💪' : 'Great job! Keep it up 💪',
      { description: `Streak: ${data.streak} 🔥` }
    );
    
    onStatusChange?.();
  };

  // Calculate progress for the ring (time-based until reminder)
  const getProgress = () => {
    if (todayStatus === 'taken') return 100;
    
    const now = new Date();
    const [hours, minutes] = reminderTime.split(':').map(Number);
    const reminderDate = new Date();
    reminderDate.setHours(hours, minutes, 0, 0);
    
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    const totalMs = reminderDate.getTime() - startOfDay.getTime();
    const elapsedMs = now.getTime() - startOfDay.getTime();
    
    if (now >= reminderDate) return 100;
    return Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100));
  };

  const progress = getProgress();
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  // Don't show if user isn't on any medication mode
  if (!userData.mode || userData.mode === 'exploring') {
    return null;
  }

  return (
    <div className="rounded-2xl bg-card border-2 border-primary/20 shadow-card p-4">
      <div className="flex items-center gap-4">
        {/* Circular Progress Ring */}
        <div className="relative flex-shrink-0">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className="text-muted/30"
            />
            {/* Progress circle */}
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              className={todayStatus === 'taken' ? 'text-emerald-500' : 'text-primary'}
              style={{
                strokeDasharray: circumference,
                strokeDashoffset,
                transition: 'stroke-dashoffset 0.5s ease-in-out',
              }}
            />
          </svg>
          {/* Center icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            {todayStatus === 'taken' ? (
              <Check className="h-8 w-8 text-emerald-500" />
            ) : (
              <Clock className="h-7 w-7 text-primary" />
            )}
          </div>
        </div>

        {/* Status & Actions */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-sm font-bold ${todayStatus === 'taken' ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>
              {todayStatus === 'taken' 
                ? (language === 'th' ? '✓ กินยาแล้ววันนี้' : '✓ Taken today')
                : (language === 'th' ? 'ยังไม่ได้กินยา' : 'Not taken yet')
              }
            </span>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Clock className="h-3 w-3" />
            <span>{language === 'th' ? 'เวลาแจ้งเตือน:' : 'Reminder:'}</span>
            <input
              type="time"
              value={reminderTime}
              onChange={handleTimeChange}
              className="bg-transparent border-b border-muted-foreground/30 focus:border-primary outline-none text-foreground w-20"
            />
            <button
              onClick={toggleReminder}
              className={`p-1 rounded-full transition-colors ${
                reminderEnabled 
                  ? 'bg-primary/20 text-primary' 
                  : 'bg-muted text-muted-foreground'
              }`}
              title={reminderEnabled ? 'Disable reminder' : 'Enable reminder'}
            >
              {reminderEnabled ? <Bell className="h-3 w-3" /> : <BellOff className="h-3 w-3" />}
            </button>
          </div>

          {todayStatus !== 'taken' && (
            <Button
              size="sm"
              className="w-full h-9 rounded-xl bg-gradient-to-r from-primary to-primary/90"
              onClick={handleMarkTaken}
            >
              <Check className="h-4 w-4 mr-1" />
              {language === 'th' ? 'กินแล้ว' : 'Mark as Taken'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
