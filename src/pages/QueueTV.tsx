import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toPublicStatus, getTVInstruction, PUBLIC_STATUS_CONFIG, type PublicStatus } from '@/lib/queuePublicStatus';

/**
 * Branch TV display — shows 4 public statuses with a hero "Now Serving" section.
 * Privacy-safe: queue code + room only.
 * Realtime: subscribes to visit flow tables filtered by branch.
 */

interface TVItem {
  step_id: string;
  visit_id: string;
  step_code: string;
  step_status: string;
  queue_code: string | null;
  room_number: number | null;
  called_at: string | null;
  visit_code: string;
  public_status: PublicStatus;
  instruction: string;
}

const COLUMN_STATUSES: PublicStatus[] = ['registered', 'waiting', 'in_service'];

export default function QueueTV() {
  const { branchSlug } = useParams<{ branchSlug: string }>();
  const [branchName, setBranchName] = useState('');
  const [branchId, setBranchId] = useState<string | null>(null);
  const [items, setItems] = useState<TVItem[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Fetch branch info once
  useEffect(() => {
    if (!branchSlug) return;
    supabase
      .from('booking_branches')
      .select('id, name_th, name_en')
      .eq('slug', branchSlug)
      .single()
      .then(({ data }) => {
        if (data) {
          setBranchName((data as any).name_th);
          setBranchId((data as any).id);
        }
      });
  }, [branchSlug]);

  // Fetch queue data
  const fetchQueue = useCallback(async (bid: string) => {
    const today = new Date().toLocaleDateString('en-CA');

    // Get today's active visits (not completed/cancelled)
    const { data: todayVisits } = await supabase
      .from('client_visit_flows')
      .select('id, visit_code, is_completed, is_cancelled')
      .eq('branch_id', bid)
      .eq('visit_date', today);

    if (!todayVisits?.length) {
      setItems([]);
      return;
    }

    const visitMap = Object.fromEntries(
      (todayVisits as any[]).map(v => [v.id, { code: v.visit_code, done: v.is_completed || v.is_cancelled }])
    );
    const visitIds = Object.keys(visitMap);

    // Get ALL steps for today's visits (including completed for finished display)
    const { data: stepData } = await supabase
      .from('client_visit_flow_steps')
      .select('id, visit_id, step_code, step_status, queue_code, room_number, called_at')
      .eq('branch_id', bid)
      .in('visit_id', visitIds)
      .order('entered_at', { ascending: false });

    if (!stepData?.length) {
      setItems([]);
      return;
    }

    // For each visit, pick the most recent (latest) step as the representative
    const latestStepByVisit = new Map<string, any>();
    for (const s of stepData as any[]) {
      if (!latestStepByVisit.has(s.visit_id)) {
        latestStepByVisit.set(s.visit_id, s);
      }
    }

    const mapped: TVItem[] = [];
    for (const [visitId, step] of latestStepByVisit) {
      const visitInfo = visitMap[visitId];
      if (!visitInfo) continue;

      // For completed/cancelled visits, override
      const effectiveStepCode = visitInfo.done
        ? (step.step_status === 'cancelled' ? 'cancelled' : 'completed')
        : step.step_code;
      const effectiveStatus = visitInfo.done
        ? (step.step_status === 'cancelled' ? 'cancelled' : 'completed')
        : step.step_status;

      const ps = toPublicStatus(effectiveStepCode, effectiveStatus);
      const instruction = getTVInstruction(step.step_code, step.step_status, step.room_number);

      mapped.push({
        step_id: step.id,
        visit_id: visitId,
        step_code: step.step_code,
        step_status: step.step_status,
        queue_code: step.queue_code,
        room_number: step.room_number,
        called_at: step.called_at,
        visit_code: visitInfo.code || step.queue_code || '—',
        public_status: ps,
        instruction,
      });
    }

    setItems(mapped);
  }, []);

  // Fetch data when branchId is ready
  useEffect(() => {
    if (branchId) fetchQueue(branchId);
  }, [branchId, fetchQueue]);

  // Realtime subscription — properly managed
  useEffect(() => {
    if (!branchId) return;

    // Clean up any previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`tv-realtime-${branchId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'client_visit_flows',
        filter: `branch_id=eq.${branchId}`,
      }, () => fetchQueue(branchId))
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'client_visit_flow_steps',
        filter: `branch_id=eq.${branchId}`,
      }, () => fetchQueue(branchId))
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [branchId, fetchQueue]);

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (d: Date) =>
    d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Bangkok' });

  // Group items by public status
  const grouped: Record<PublicStatus, TVItem[]> = {
    registered: [],
    waiting: [],
    in_service: [],
    finished: [],
  };
  items.forEach(item => {
    grouped[item.public_status].push(item);
  });

  // Hero items: currently called (step_status = 'called')
  const calledNow = items.filter(i => i.step_status === 'called');

  return (
    <div className="min-h-screen bg-[hsl(220,20%,8%)] text-white p-6 md:p-10 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">🏥 {branchName || branchSlug}</h1>
          <p className="text-white/50 text-lg mt-1">ระบบเรียกคิว — Queue Display</p>
        </div>
        <div className="text-right">
          <div className="text-4xl md:text-5xl font-mono font-bold tabular-nums">{formatTime(currentTime)}</div>
          <div className="text-white/40 text-sm mt-1">
            {currentTime.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Hero: Now Serving */}
      {calledNow.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-bold text-amber-400 mb-3 flex items-center gap-2">
            <span className="text-2xl">📢</span> เรียกคิว — Now Serving
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {calledNow.map(item => (
              <div
                key={item.step_id}
                className="bg-amber-500/20 border-2 border-amber-500/60 rounded-2xl px-6 py-5 animate-pulse"
              >
                <div className="text-5xl md:text-6xl font-black font-mono text-amber-400 leading-none text-center">
                  {item.queue_code || item.visit_code}
                </div>
                {item.room_number && (
                  <p className="text-center text-2xl text-amber-300 font-bold mt-2">
                    🚪 ห้อง {item.room_number}
                  </p>
                )}
                <p className="text-center text-amber-300/80 text-sm mt-2">
                  {item.instruction}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3-column status groups */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1">
        {COLUMN_STATUSES.map(status => {
          const config = PUBLIC_STATUS_CONFIG[status];
          const statusItems = grouped[status];

          return (
            <div
              key={status}
              className={`rounded-2xl p-5 flex flex-col border-2 ${config.color} ${config.borderColor}`}
            >
              {/* Status header */}
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/10">
                <span className="text-2xl">{config.icon}</span>
                <h2 className={`text-xl md:text-2xl font-bold ${config.textColor}`}>
                  {config.labelTh}
                </h2>
                {statusItems.length > 0 && (
                  <span className={`ml-auto text-lg font-mono ${config.textColor} opacity-70`}>
                    {statusItems.length}
                  </span>
                )}
              </div>

              {/* Queue items */}
              <div className="flex-1 space-y-2 overflow-y-auto max-h-[60vh]">
                {statusItems.map(item => (
                  <div
                    key={item.step_id}
                    className={`rounded-xl px-4 py-3 ${
                      item.step_status === 'called'
                        ? 'bg-amber-500/20 border border-amber-500/40'
                        : item.step_status === 'in_service'
                        ? 'bg-green-500/15 border border-green-500/30'
                        : 'bg-white/5 border border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-2xl md:text-3xl font-bold font-mono ${
                        status === 'in_service' ? 'text-green-300' :
                        status === 'registered' ? 'text-sky-300' :
                        'text-white/80'
                      }`}>
                        {item.queue_code || item.visit_code}
                      </span>
                      {item.room_number && (
                        <span className="text-sm text-white/60 font-medium">
                          🚪 ห้อง {item.room_number}
                        </span>
                      )}
                    </div>
                    {item.instruction && (
                      <p className="text-xs text-white/40 mt-1">{item.instruction}</p>
                    )}
                  </div>
                ))}

                {statusItems.length === 0 && (
                  <div className="text-white/15 text-center py-8 text-lg">
                    — ไม่มีคิว —
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-6 text-center text-white/20 text-xs">
        testD Queue System • {branchName}
      </div>
    </div>
  );
}
