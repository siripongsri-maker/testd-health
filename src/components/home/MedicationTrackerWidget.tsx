import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { getUserData } from '@/lib/store';
import { useNavigate } from 'react-router-dom';

export function MedicationTrackerWidget() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [nextTime, setNextTime] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const data = getUserData();
    const active = data.mode && data.mode !== 'exploring';
    setIsActive(!!active);

    if (active) {
      const reminderTime = localStorage.getItem('medReminderTime') || '20:00';
      setNextTime(reminderTime);
    }
  }, []);

  return (
    <button
      onClick={() => navigate('/medication-tracker')}
      className="group w-full glass glass-shine hover:shadow-soft rounded-2xl sm:rounded-3xl
                 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 active:scale-[0.98]
                 flex items-center gap-3 p-3 sm:p-4 text-left"
    >
      <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
        <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs sm:text-sm font-bold text-foreground leading-tight">
          {language === 'th' ? 'แจ้งเตือนกินยา' : 'Medication Reminder'}
        </p>
        {isActive && nextTime ? (
          <p className="text-xs text-muted-foreground mt-0.5">
            {language === 'th' ? 'แจ้งเตือนถัดไป' : 'Next reminder'}{' '}
            <span className="font-bold text-primary">{nextTime}</span>
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {language === 'th' ? 'ไม่มียาวันนี้' : 'No medication scheduled'}
          </p>
        )}
      </div>
    </button>
  );
}
