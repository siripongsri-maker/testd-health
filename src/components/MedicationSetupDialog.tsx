import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/lib/i18n';
import { getUserData, setUserData } from '@/lib/store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pill, Clock, Bell, BellRing, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceSlug?: string; // e.g. 'prep-consultation', 'pep'
  serviceName?: string;
}

const MEDICATION_SERVICES = ['prep-consultation', 'pep', 'hiv-testing', 'followup-consultation'];

export function isMedicationService(slug: string | undefined): boolean {
  if (!slug) return false;
  return MEDICATION_SERVICES.includes(slug);
}

type MedMode = 'prep-daily' | 'prep-ondemand' | 'pep';

export function MedicationSetupDialog({ open, onOpenChange, serviceSlug, serviceName }: Props) {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isEn = language === 'en';
  
  const [step, setStep] = useState<'choose' | 'time'>('choose');
  const [selectedMode, setSelectedMode] = useState<MedMode | null>(null);
  const [reminderTime, setReminderTime] = useState('09:00');

  const modeOptions: { mode: MedMode; labelTh: string; labelEn: string; desc: string }[] = [
    { mode: 'prep-daily', labelTh: 'PrEP รายวัน', labelEn: 'Daily PrEP', desc: isEn ? 'Take every day at the same time' : 'กินทุกวัน เวลาเดิม' },
    { mode: 'prep-ondemand', labelTh: 'PrEP ตามเหตุการณ์', labelEn: 'On-Demand PrEP', desc: isEn ? 'Take before and after exposure' : 'กินก่อนและหลังมีความเสี่ยง' },
    { mode: 'pep', labelTh: 'PEP', labelEn: 'PEP (28 วัน)', desc: isEn ? '28-day emergency course' : 'กินต่อเนื่อง 28 วันหลังสัมผัสเชื้อ' },
  ];

  // Auto-suggest mode based on service
  const suggestedMode: MedMode | null = serviceSlug === 'pep' ? 'pep' : serviceSlug === 'prep-consultation' ? 'prep-daily' : null;

  const handleSelectMode = (mode: MedMode) => {
    setSelectedMode(mode);
    setStep('time');
  };

  const handleSave = () => {
    if (!selectedMode) return;
    
    const data = getUserData();
    setUserData({
      ...data,
      mode: selectedMode,
      prepReminderTime: reminderTime,
      prepStartDate: new Date().toISOString().slice(0, 10),
    });
    
    localStorage.setItem('medReminderTime', reminderTime);
    localStorage.setItem('medReminderEnabled', 'true');

    // Request browser notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    toast.success(
      isEn ? 'Medication reminder set! 💊' : 'ตั้งเวลากินยาเรียบร้อย! 💊',
      { description: isEn ? `Daily reminder at ${reminderTime}` : `แจ้งเตือนทุกวัน เวลา ${reminderTime}` }
    );

    onOpenChange(false);
    setStep('choose');
    setSelectedMode(null);
  };

  const handleSkip = () => {
    onOpenChange(false);
    setStep('choose');
    setSelectedMode(null);
  };

  const handleGoToTracker = () => {
    handleSave();
    navigate('/medication-tracker');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <div className="flex justify-center mb-2">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
              <Pill className="h-7 w-7 text-primary-foreground" />
            </div>
          </div>
          <DialogTitle className="text-center text-lg">
            {isEn ? 'Set Up Medication Reminder' : 'ตั้งเวลากินยา'}
          </DialogTitle>
          <DialogDescription className="text-center text-sm">
            {isEn
              ? 'Track your medication and get reminders to stay on schedule'
              : 'ติดตามการกินยาและรับแจ้งเตือนตรงเวลา'}
          </DialogDescription>
        </DialogHeader>

        {step === 'choose' && (
          <div className="space-y-2 mt-2">
            {serviceName && (
              <p className="text-xs text-muted-foreground text-center mb-3">
                {isEn ? `Based on your visit: ${serviceName}` : `จากบริการที่รับ: ${serviceName}`}
              </p>
            )}
            {modeOptions.map(opt => (
              <button
                key={opt.mode}
                onClick={() => handleSelectMode(opt.mode)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left
                  ${suggestedMode === opt.mode 
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/30' 
                    : 'border-border hover:border-primary/30 hover:bg-accent/50'
                  }`}
              >
                <Pill className="h-5 w-5 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {isEn ? opt.labelEn : opt.labelTh}
                  </p>
                  <p className="text-xs text-muted-foreground">{opt.desc}</p>
                </div>
                {suggestedMode === opt.mode && (
                  <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full flex-shrink-0">
                    {isEn ? 'Suggested' : 'แนะนำ'}
                  </span>
                )}
                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </button>
            ))}
            <Button variant="ghost" className="w-full mt-2 text-muted-foreground" onClick={handleSkip}>
              {isEn ? 'Skip for now' : 'ข้ามไปก่อน'}
            </Button>
          </div>
        )}

        {step === 'time' && (
          <div className="space-y-4 mt-2">
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                {selectedMode === 'pep' 
                  ? (isEn ? 'Set PEP reminder time' : 'ตั้งเวลากิน PEP')
                  : (isEn ? 'Set daily reminder time' : 'ตั้งเวลาแจ้งเตือนประจำวัน')
                }
              </p>
            </div>

            <div className="flex justify-center">
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="time"
                  value={reminderTime}
                  onChange={e => setReminderTime(e.target.value)}
                  className="pl-10 text-center text-2xl font-bold h-14 w-48 rounded-xl"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 text-xs text-muted-foreground">
              <BellRing className="h-4 w-4 flex-shrink-0 text-primary" />
              <span>
                {isEn
                  ? 'You\'ll get a notification reminder at this time each day'
                  : 'ระบบจะแจ้งเตือนคุณทุกวันตามเวลาที่ตั้งไว้'}
              </span>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep('choose')}>
                {isEn ? 'Back' : 'กลับ'}
              </Button>
              <Button className="flex-1 gap-2" onClick={handleGoToTracker}>
                <Bell className="h-4 w-4" />
                {isEn ? 'Save & Track' : 'บันทึก & ติดตาม'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
