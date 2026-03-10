import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getStepLabel, ACTIVE_SERVICE_STEPS, STEP_MAP } from '@/lib/queueSteps';
import {
  UserRound, Droplets, TestTube, Pill, HeartPulse, CreditCard, Clock, BellRing,
} from 'lucide-react';

const STEP_ICONS: Record<string, React.ElementType> = {
  counselor: UserRound, blood_collecting: Droplets, specimen_collecting: TestTube,
  waiting_result: Clock, notification_later: BellRing, medicine: Pill,
  treatment: HeartPulse, payment: CreditCard,
};

// Steps to show on TV (exclude register)
const TV_STEPS = ['counselor', 'blood_collecting', 'specimen_collecting', 'medicine', 'treatment', 'payment'];

interface TVItem {
  step_id: string;
  visit_id: string;
  branch_id: string;
  step_code: string;
  queue_code: string | null;
  room_number: number | null;
  step_status: string;
  called_at: string | null;
}

export default function QueueTV() {
  const { branchSlug } = useParams<{ branchSlug: string }>();
  const [branchName, setBranchName] = useState('');
  const [items, setItems] = useState<TVItem[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  const fetchBranch = useCallback(async () => {
    if (!branchSlug) return null;
    const { data } = await supabase
      .from('booking_branches')
      .select('id, name_th, name_en')
      .eq('slug', branchSlug)
      .single();
    if (data) {
      setBranchName((data as any).name_th);
      return (data as any).id;
    }
    return null;
  }, [branchSlug]);

  const fetchQueue = useCallback(async (branchId: string) => {
    const today = new Date().toLocaleDateString('en-CA');
    const { data } = await supabase
      .from('client_visit_flow_steps')
      .select('id, visit_id, branch_id, step_code, queue_code, room_number, step_status, called_at')
      .eq('branch_id', branchId)
      .in('step_status', ['called', 'in_service'])
      .order('called_at', { ascending: false });

    // Filter to today's visits only
    const { data: todayVisits } = await supabase
      .from('client_visit_flows')
      .select('id')
      .eq('branch_id', branchId)
      .eq('visit_date', today)
      .eq('is_cancelled', false);

    const visitIds = new Set((todayVisits || []).map((v: any) => v.id));
    setItems(((data || []) as unknown as TVItem[]).filter(i => visitIds.has(i.visit_id)));
  }, []);

  useEffect(() => {
    let branchId: string | null = null;
    fetchBranch().then(id => {
      if (id) {
        branchId = id;
        fetchQueue(id);
      }
    });
  }, [fetchBranch, fetchQueue]);

  // Realtime
  useEffect(() => {
    if (!branchSlug) return;
    // Re-fetch on any change
    let branchId: string | null = null;
    fetchBranch().then(id => {
      branchId = id;
      if (!id) return;

      const channel = supabase
        .channel(`tv-${branchSlug}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'client_visit_flow_steps' }, () => {
          if (branchId) fetchQueue(branchId);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'client_visit_flows' }, () => {
          if (branchId) fetchQueue(branchId);
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    });
  }, [branchSlug, fetchBranch, fetchQueue]);

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (d: Date) =>
    d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Bangkok' });

  const getCalledForStep = (stepCode: string) =>
    items.filter(i => i.step_code === stepCode && i.step_status === 'called');

  const getInServiceForStep = (stepCode: string) =>
    items.filter(i => i.step_code === stepCode && i.step_status === 'in_service');

  return (
    <div className="min-h-screen bg-[hsl(220,20%,8%)] text-white p-6 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">🏥 {branchName || branchSlug}</h1>
          <p className="text-white/60 text-lg">ระบบเรียกคิว — Queue Display</p>
        </div>
        <div className="text-right">
          <div className="text-4xl font-mono font-bold tabular-nums">{formatTime(currentTime)}</div>
          <div className="text-white/50 text-sm">{currentTime.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
        </div>
      </div>

      {/* Queue grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 flex-1">
        {TV_STEPS.map(stepCode => {
          const Icon = STEP_ICONS[stepCode] || Clock;
          const called = getCalledForStep(stepCode);
          const inService = getInServiceForStep(stepCode);
          const hasCalled = called.length > 0;

          return (
            <div
              key={stepCode}
              className={`rounded-2xl p-5 flex flex-col transition-all ${
                hasCalled
                  ? 'bg-amber-500/20 border-2 border-amber-500/60 animate-pulse-slow'
                  : 'bg-white/5 border border-white/10'
              }`}
            >
              <div className="flex items-center gap-2 mb-4">
                <Icon className="h-6 w-6 text-white/70" />
                <h2 className="text-lg font-semibold text-white/90">{getStepLabel(stepCode, 'th')}</h2>
              </div>

              {/* Currently called */}
              {called.map(item => (
                <div key={item.step_id} className="mb-3">
                  <div className="text-5xl font-black font-mono text-amber-400 leading-none">
                    {item.queue_code}
                  </div>
                  {item.room_number && (
                    <div className="text-lg text-amber-300/80 mt-1">ห้อง {item.room_number}</div>
                  )}
                  <div className="text-sm text-amber-300/60 mt-1 animate-pulse">
                    ⏳ กรุณาเข้ารับบริการ
                  </div>
                </div>
              ))}

              {/* In service */}
              {inService.map(item => (
                <div key={item.step_id} className="mb-2 opacity-60">
                  <div className="text-2xl font-bold font-mono text-blue-300">
                    {item.queue_code}
                  </div>
                  {item.room_number && (
                    <span className="text-xs text-blue-300/60">ห้อง {item.room_number}</span>
                  )}
                  <span className="ml-2 text-xs text-blue-300/60">กำลังให้บริการ</span>
                </div>
              ))}

              {called.length === 0 && inService.length === 0 && (
                <div className="text-white/20 text-sm flex-1 flex items-center justify-center">
                  — ไม่มีคิว —
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-4 text-center text-white/30 text-xs">
        testD Queue System • {branchName}
      </div>
    </div>
  );
}
