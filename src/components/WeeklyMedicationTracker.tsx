import { useState, useEffect } from 'react';
import { Clock, Check, AlertTriangle, Minus } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { getUserData, getTodayKey, recordCheckIn } from '@/lib/store';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const DAY_LABELS_TH = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'];
const DAY_LABELS_EN = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

type DayStatus = 'taken' | 'taken-late' | 'skipped' | 'future' | 'today-pending' | 'today-taken';

interface DayInfo {
  label: string;
  dateKey: string;
  status: DayStatus;
}

export function WeeklyMedicationTracker({ onStatusChange }: { onStatusChange?: () => void }) {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [userData, setLocalUserData] = useState(getUserData());
  const [days, setDays] = useState<DayInfo[]>([]);
  const [countdown, setCountdown] = useState('');
  const [isLate, setIsLate] = useState(false);
  const todayKey = getTodayKey();
  const reminderTime = localStorage.getItem('medReminderTime') || '20:00';
  const isActive = userData.mode && userData.mode !== 'exploring';

  // Build the 7-day week view (Mon-Sun of current week)
  useEffect(() => {
    if (!isActive) return;
    const data = getUserData();
    setLocalUserData(data);
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sun
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);

    const labels = language === 'th' ? DAY_LABELS_TH : DAY_LABELS_EN;
    const weekDays: DayInfo[] = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const key = d.toISOString().split('T')[0];
      let status: DayStatus = 'future';

      if (key === todayKey) {
        status = data.checkIns[key] === 'taken' ? 'today-taken' : 'today-pending';
      } else if (key < todayKey) {
        if (data.checkIns[key] === 'taken') {
          // Check if taken late using checkInDetails
          const detail = data.checkInDetails?.[key];
          if (detail?.time && detail?.scheduledTime) {
            const [sh, sm] = detail.scheduledTime.split(':').map(Number);
            const takenAt = new Date(detail.time);
            const scheduledMs = sh * 60 + sm;
            const takenMs = takenAt.getHours() * 60 + takenAt.getMinutes();
            status = takenMs > scheduledMs + 30 ? 'taken-late' : 'taken';
          } else {
            status = 'taken';
          }
        } else if (data.checkIns[key] === 'skipped') {
          status = 'skipped';
        } else {
          status = 'skipped'; // missed = skipped
        }
      }

      weekDays.push({ label: labels[i], dateKey: key, status });
    }
    setDays(weekDays);
  }, [language, todayKey]);

  // Countdown timer
  useEffect(() => {
    if (!isActive) return;
    const todayStatus = userData.checkIns[todayKey];
    if (todayStatus === 'taken') {
      setCountdown('');
      setIsLate(false);
      return;
    }

    const update = () => {
      const now = new Date();
      const [h, m] = reminderTime.split(':').map(Number);
      const target = new Date();
      target.setHours(h, m, 0, 0);
      const diff = target.getTime() - now.getTime();
      const abs = Math.abs(diff);
      const mins = Math.floor(abs / 60000);
      const hrs = Math.floor(mins / 60);
      const rm = mins % 60;

      if (diff > 0) {
        setIsLate(false);
        setCountdown(hrs > 0
          ? (language === 'th' ? `อีก ${hrs} ชม. ${rm} น.` : `${hrs}h ${rm}m`)
          : (language === 'th' ? `อีก ${rm} น.` : `${rm}m`));
      } else {
        setIsLate(true);
        setCountdown(mins === 0
          ? (language === 'th' ? 'ได้เวลาแล้ว!' : 'Time now!')
          : hrs > 0
            ? (language === 'th' ? `สายไป ${hrs} ชม. ${rm} น.` : `${hrs}h ${rm}m late`)
            : (language === 'th' ? `สายไป ${rm} น.` : `${rm}m late`));
      }
    };

    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, [userData, todayKey, reminderTime, language]);
  // Don't render if user isn't on any medication mode
  if (!isActive) return null;

  const handleMarkTaken = () => {
    recordCheckIn(todayKey, 'taken');
    const data = getUserData();
    setLocalUserData(data);
    // Update days
    setDays(prev => prev.map(d =>
      d.dateKey === todayKey ? { ...d, status: 'today-taken' } : d
    ));
    toast.success(
      language === 'th' ? 'ดีมาก! ทำได้ดี 💪' : 'Great job! Keep it up 💪',
      { description: `Streak: ${data.streak} 🔥` }
    );
    onStatusChange?.();
  };

  const todayTaken = userData.checkIns[todayKey] === 'taken';

  const getDayIcon = (status: DayStatus) => {
    switch (status) {
      case 'taken':
      case 'today-taken':
        return <Check className="h-4 w-4 text-emerald-500" />;
      case 'taken-late':
        return <Clock className="h-4 w-4 text-amber-500" />;
      case 'skipped':
        return <Minus className="h-4 w-4 text-destructive/60" />;
      case 'today-pending':
        return <Clock className="h-4 w-4 text-primary animate-pulse" />;
      case 'future':
        return <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/20" />;
    }
  };

  const getDayBg = (status: DayStatus) => {
    switch (status) {
      case 'taken':
      case 'today-taken':
        return 'bg-emerald-100 dark:bg-emerald-900/30 ring-1 ring-emerald-300 dark:ring-emerald-700';
      case 'taken-late':
        return 'bg-amber-100 dark:bg-amber-900/30 ring-1 ring-amber-300 dark:ring-amber-700';
      case 'skipped':
        return 'bg-destructive/10 ring-1 ring-destructive/20';
      case 'today-pending':
        return 'bg-primary/10 ring-2 ring-primary/40';
      case 'future':
        return 'bg-muted/30';
    }
  };

  return (
    <div className="glass rounded-2xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <Clock className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-foreground">
              {language === 'th' ? 'ติดตามการกินยา' : 'Medication Tracker'}
            </h3>
            {countdown && !todayTaken && (
              <p className={`text-[11px] font-semibold ${isLate ? 'text-amber-600 dark:text-amber-400' : 'text-primary'}`}>
                {countdown}
              </p>
            )}
          </div>
        </div>
        {userData.streak > 0 && (
          <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
            🔥 {userData.streak}
          </span>
        )}
      </div>

      {/* 7-day grid */}
      <div className="grid grid-cols-7 gap-1.5 mb-3">
        {days.map((day) => (
          <div key={day.dateKey} className="flex flex-col items-center gap-1">
            <span className={`text-[10px] font-medium ${
              day.dateKey === todayKey ? 'text-primary font-bold' : 'text-muted-foreground'
            }`}>
              {day.label}
            </span>
            <div className={`h-9 w-9 rounded-xl flex items-center justify-center transition-all ${getDayBg(day.status)}`}>
              {getDayIcon(day.status)}
            </div>
          </div>
        ))}
      </div>

      {/* Action row */}
      <div className="flex items-center gap-2">
        {!todayTaken ? (
          <Button
            size="sm"
            className="flex-1 h-9 rounded-xl bg-gradient-to-r from-primary to-primary/90"
            onClick={handleMarkTaken}
          >
            <Check className="h-4 w-4 mr-1" />
            {language === 'th' ? 'กินแล้ว' : 'Mark as Taken'}
          </Button>
        ) : (
          <div className="flex-1 text-center text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            ✓ {language === 'th' ? 'กินยาแล้ววันนี้' : 'Taken today'}
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="glass-sm rounded-xl text-xs"
          onClick={() => navigate('/medication-tracker')}
        >
          {language === 'th' ? 'ดูทั้งหมด' : 'Details'}
        </Button>
      </div>
    </div>
  );
}
