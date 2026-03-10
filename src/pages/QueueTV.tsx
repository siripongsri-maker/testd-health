import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toPublicStatus, PUBLIC_STATUS_CONFIG, type PublicStatus } from '@/lib/queuePublicStatus';

/**
 * Simplified TV display — shows only 4 public statuses:
 *   ลงทะเบียน / รอรับบริการ / กำลังรับบริการ / เสร็จสิ้น
 *
 * Internal step detail is hidden; detailed journey lives on the user mobile page.
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
}

// We only show these public statuses on the TV (exclude "finished" — no point showing completed queues)
const DISPLAY_STATUSES: PublicStatus[] = ['registered', 'waiting', 'in_service'];

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

    // Get today's active visits
    const { data: todayVisits } = await supabase
      .from('client_visit_flows')
      .select('id, visit_code')
      .eq('branch_id', branchId)
      .eq('visit_date', today)
      .eq('is_completed', false)
      .eq('is_cancelled', false);

    if (!todayVisits?.length) {
      setItems([]);
      return;
    }

    const visitMap = Object.fromEntries((todayVisits as any[]).map(v => [v.id, v.visit_code]));
    const visitIds = Object.keys(visitMap);

    // Get active steps for these visits (not completed/cancelled steps)
    const { data: stepData } = await supabase
      .from('client_visit_flow_steps')
      .select('id, visit_id, step_code, step_status, queue_code, room_number, called_at')
      .eq('branch_id', branchId)
      .in('visit_id', visitIds)
      .in('step_status', ['waiting', 'called', 'in_service'])
      .order('called_at', { ascending: false });

    const mapped: TVItem[] = ((stepData || []) as any[]).map(s => ({
      step_id: s.id,
      visit_id: s.visit_id,
      step_code: s.step_code,
      step_status: s.step_status,
      queue_code: s.queue_code,
      room_number: s.room_number,
      called_at: s.called_at,
      visit_code: visitMap[s.visit_id] || s.queue_code || '—',
    }));

    setItems(mapped);
  }, []);

  useEffect(() => {
    fetchBranch().then(id => { if (id) fetchQueue(id); });
  }, [fetchBranch, fetchQueue]);

  // Realtime
  useEffect(() => {
    if (!branchSlug) return;
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

  // Group items by public status
  const grouped: Record<PublicStatus, TVItem[]> = {
    registered: [],
    waiting: [],
    in_service: [],
    finished: [],
  };

  items.forEach(item => {
    const ps = toPublicStatus(item.step_code, item.step_status);
    if (grouped[ps]) grouped[ps].push(item);
  });

  return (
    <div className="min-h-screen bg-[hsl(220,20%,8%)] text-white p-6 md:p-10 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
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

      {/* 3-column layout for the 3 active statuses */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1">
        {DISPLAY_STATUSES.map(status => {
          const config = PUBLIC_STATUS_CONFIG[status];
          const statusItems = grouped[status];
          // For "waiting" status, highlight items that are "called"
          const calledItems = statusItems.filter(i => i.step_status === 'called');
          const otherItems = statusItems.filter(i => i.step_status !== 'called');

          return (
            <div
              key={status}
              className={`rounded-2xl p-6 flex flex-col border-2 ${config.color} ${config.borderColor}`}
            >
              {/* Status header */}
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
                <span className="text-3xl">{config.icon}</span>
                <h2 className={`text-2xl md:text-3xl font-bold ${config.textColor}`}>
                  {config.labelTh}
                </h2>
                {statusItems.length > 0 && (
                  <span className={`ml-auto text-lg font-mono ${config.textColor} opacity-70`}>
                    {statusItems.length}
                  </span>
                )}
              </div>

              {/* Queue items */}
              <div className="flex-1 space-y-3 overflow-y-auto">
                {/* Called items first — with highlight animation */}
                {calledItems.map(item => (
                  <div
                    key={item.step_id}
                    className="bg-amber-500/20 border border-amber-500/40 rounded-xl px-4 py-3 animate-pulse"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-4xl md:text-5xl font-black font-mono text-amber-400 leading-none">
                        {item.queue_code || item.visit_code}
                      </span>
                      {item.room_number && (
                        <span className="text-lg text-amber-300/80 font-medium">
                          ห้อง {item.room_number}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-amber-300/70 mt-1">กรุณาเข้ารับบริการ</p>
                  </div>
                ))}

                {/* Other items (waiting / in_service) */}
                {otherItems.map(item => (
                  <div
                    key={item.step_id}
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-2xl md:text-3xl font-bold font-mono ${
                        status === 'in_service' ? 'text-green-300' : 'text-white/80'
                      }`}>
                        {item.queue_code || item.visit_code}
                      </span>
                      {item.room_number && (
                        <span className="text-sm text-white/50">
                          ห้อง {item.room_number}
                        </span>
                      )}
                    </div>
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
