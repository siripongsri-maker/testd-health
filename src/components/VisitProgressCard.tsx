import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/lib/i18n';
import { getDetailedStepLabel, toPublicStatus, PUBLIC_STATUS_CONFIG } from '@/lib/queuePublicStatus';
import { getStepLabel, QUEUE_STEPS, STEP_MAP } from '@/lib/queueSteps';
import { Card } from '@/components/ui/card';
import { CheckCircle2, Clock, Loader2, ArrowRight, Bell, MapPin } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface VisitStep {
  id: string;
  step_code: string;
  step_status: string;
  queue_code: string | null;
  room_number: number | null;
  entered_at: string;
  called_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  routed_to_step_code: string | null;
}

interface Visit {
  id: string;
  visit_code: string;
  current_step: string;
  current_status: string;
  is_completed: boolean;
  is_cancelled: boolean;
  branch_id: string;
}

interface Props {
  userId: string;
  appointmentId?: string;
  branchId?: string;
}

/**
 * Shows the detailed visit journey on the user's mobile appointment page.
 * Fetches the user's active visit for today at the given branch and
 * renders a step-by-step progress view.
 */
export function VisitProgressCard({ userId, appointmentId, branchId }: Props) {
  const { language } = useLanguage();
  const [visit, setVisit] = useState<Visit | null>(null);
  const [steps, setSteps] = useState<VisitStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [branchName, setBranchName] = useState('');

  const fetchVisit = useCallback(async () => {
    const today = new Date().toLocaleDateString('en-CA');

    // Try to find visit by appointment_id first, fallback to branch_id + today
    let query = supabase
      .from('client_visit_flows')
      .select('id, visit_code, current_step, current_status, is_completed, is_cancelled, branch_id')
      .eq('visit_date', today)
      .order('created_at', { ascending: false })
      .limit(1);

    if (appointmentId) {
      query = query.eq('appointment_id', appointmentId);
    } else if (branchId) {
      query = query.eq('branch_id', branchId);
    } else {
      setLoading(false);
      return;
    }

    const { data: visits } = await query;
    const v = (visits as any)?.[0];
    if (!v) { setLoading(false); return; }

    setVisit(v as Visit);

    // Fetch branch name
    const { data: branch } = await supabase
      .from('booking_branches')
      .select('name_th, name_en')
      .eq('id', v.branch_id)
      .single();
    if (branch) setBranchName(language === 'th' ? (branch as any).name_th : (branch as any).name_en);

    // Fetch steps
    const { data: stepData } = await supabase
      .from('client_visit_flow_steps')
      .select('id, step_code, step_status, queue_code, room_number, entered_at, called_at, started_at, completed_at, routed_to_step_code')
      .eq('visit_id', v.id)
      .order('entered_at', { ascending: true });

    setSteps((stepData || []) as unknown as VisitStep[]);
    setLoading(false);
  }, [appointmentId, branchId, language]);

  useEffect(() => { fetchVisit(); }, [fetchVisit]);

  // Realtime updates
  useEffect(() => {
    if (!visit) return;
    const channel = supabase
      .channel(`visit-progress-${visit.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'client_visit_flow_steps', filter: `visit_id=eq.${visit.id}` }, () => fetchVisit())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'client_visit_flows', filter: `id=eq.${visit.id}` }, () => fetchVisit())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [visit?.id, fetchVisit]);

  if (loading) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-center gap-2 py-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {language === 'th' ? 'กำลังโหลดสถานะ...' : 'Loading status...'}
          </span>
        </div>
      </Card>
    );
  }

  if (!visit) return null;

  const publicStatus = toPublicStatus(visit.current_step, visit.current_status);
  const publicConfig = PUBLIC_STATUS_CONFIG[publicStatus];
  const currentDetail = getDetailedStepLabel(visit.current_step, visit.current_status);
  const isNotificationLater = visit.current_step === 'notification_later';
  const isFinished = visit.is_completed || visit.is_cancelled;

  // Find the active step (most recent non-completed step)
  const activeStep = [...steps].reverse().find(s => s.step_status !== 'completed' && s.step_status !== 'cancelled');

  return (
    <Card className="overflow-hidden border-primary/20">
      {/* Header with public status */}
      <div className={`px-4 py-3 ${isFinished ? 'bg-muted/50' : 'bg-primary/5'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{publicConfig.icon}</span>
            <span className="font-bold text-foreground">
              {language === 'th' ? publicConfig.labelTh : publicConfig.labelEn}
            </span>
          </div>
          <span className="text-sm font-mono font-bold text-primary">{visit.visit_code}</span>
        </div>
        {branchName && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            <MapPin className="h-3 w-3" />
            {branchName}
          </div>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Current status - prominent */}
        {!isFinished && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-center">
            <p className="text-lg font-bold text-foreground">
              {language === 'th' ? currentDetail.th : currentDetail.en}
            </p>
            {activeStep?.room_number && (
              <p className="text-primary font-medium mt-1">
                🚪 {language === 'th' ? `ห้อง ${activeStep.room_number}` : `Room ${activeStep.room_number}`}
              </p>
            )}
            {activeStep?.queue_code && (
              <p className="text-2xl font-black font-mono text-primary mt-2">{activeStep.queue_code}</p>
            )}
          </div>
        )}

        {/* Notification later banner */}
        {isNotificationLater && !isFinished && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 flex items-start gap-3">
            <Bell className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                {language === 'th' ? 'ไม่ต้องรอที่คลินิก' : 'No need to wait at the clinic'}
              </p>
              <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-0.5">
                {language === 'th'
                  ? 'เจ้าหน้าที่จะติดต่อแจ้งผลภายหลัง กรุณาตรวจสอบนัดหมายถัดไปด้านล่าง'
                  : 'Staff will notify you of results later. Check your next appointment below.'}
              </p>
            </div>
          </div>
        )}

        {/* Step timeline */}
        <div className="space-y-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            {language === 'th' ? 'ขั้นตอนบริการ' : 'Service Steps'}
          </p>
          {steps.map((step, idx) => {
            const isActive = step.step_status !== 'completed' && step.step_status !== 'cancelled';
            const isCompleted = step.step_status === 'completed';
            const isCancelled = step.step_status === 'cancelled';
            const detail = getDetailedStepLabel(step.step_code, step.step_status, step.room_number);
            const isLast = idx === steps.length - 1;

            return (
              <div key={step.id} className="flex gap-3">
                {/* Timeline connector */}
                <div className="flex flex-col items-center">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                    isCompleted ? 'bg-green-100 dark:bg-green-900/30' :
                    isCancelled ? 'bg-red-100 dark:bg-red-900/30' :
                    isActive ? 'bg-primary/10 ring-2 ring-primary' :
                    'bg-muted'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                    ) : isCancelled ? (
                      <span className="text-red-500 text-xs">✕</span>
                    ) : isActive ? (
                      <Clock className="h-3.5 w-3.5 text-primary animate-pulse" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                    )}
                  </div>
                  {!isLast && (
                    <div className={`w-0.5 h-6 ${isCompleted ? 'bg-green-300 dark:bg-green-700' : 'bg-border'}`} />
                  )}
                </div>

                {/* Step content */}
                <div className="pb-4 min-w-0">
                  <p className={`text-sm font-medium ${
                    isActive ? 'text-foreground' : 'text-muted-foreground'
                  }`}>
                    {language === 'th' ? detail.th : detail.en}
                  </p>
                  {step.completed_at && (
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                      {format(parseISO(step.completed_at), 'HH:mm')}
                    </p>
                  )}
                  {/* Show routing arrow for completed steps */}
                  {step.routed_to_step_code && isCompleted && (
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground/50 mt-0.5">
                      <ArrowRight className="h-2.5 w-2.5" />
                      {getStepLabel(step.routed_to_step_code, language === 'th' ? 'th' : 'en')}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Finished state */}
        {isFinished && (
          <div className={`rounded-xl p-3 text-center ${
            visit.is_cancelled
              ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
              : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
          }`}>
            <p className={`text-sm font-medium ${
              visit.is_cancelled ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'
            }`}>
              {visit.is_cancelled
                ? (language === 'th' ? '❌ การเข้ารับบริการถูกยกเลิก' : '❌ Visit cancelled')
                : (language === 'th' ? '✅ เสร็จสิ้นแล้ว ขอบคุณที่ใช้บริการ' : '✅ Visit completed. Thank you!')}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
