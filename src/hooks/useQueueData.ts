import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface VisitFlow {
  id: string;
  branch_id: string;
  appointment_id: string | null;
  visit_date: string;
  visit_number: number;
  visit_code: string;
  current_step: string;
  current_status: string;
  is_completed: boolean;
  is_cancelled: boolean;
  created_at: string;
}

export interface VisitStep {
  id: string;
  visit_id: string;
  branch_id: string;
  step_code: string;
  queue_number: number | null;
  queue_code: string | null;
  room_number: number | null;
  assigned_staff_id: string | null;
  step_status: string;
  entered_at: string;
  called_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  routed_to_step_code: string | null;
  route_note: string | null;
}

export function useQueueData(branchId: string | null) {
  const [visits, setVisits] = useState<VisitFlow[]>([]);
  const [steps, setSteps] = useState<VisitStep[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!branchId) return;
    const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD

    const [visitsRes, stepsRes] = await Promise.all([
      supabase
        .from('client_visit_flows')
        .select('*')
        .eq('branch_id', branchId)
        .eq('visit_date', today)
        .order('visit_number'),
      supabase
        .from('client_visit_flow_steps')
        .select('*')
        .eq('branch_id', branchId)
        .order('entered_at'),
    ]);

    setVisits((visitsRes.data || []) as unknown as VisitFlow[]);
    // Filter steps to only today's visits
    const visitIds = new Set((visitsRes.data || []).map((v: any) => v.id));
    setSteps(((stepsRes.data || []) as unknown as VisitStep[]).filter(s => visitIds.has(s.visit_id)));
    setLoading(false);
  }, [branchId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime subscription
  useEffect(() => {
    if (!branchId) return;
    const channel = supabase
      .channel(`queue-${branchId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'client_visit_flows' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'client_visit_flow_steps' }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [branchId, fetchData]);

  const registerVisit = async (appointmentId?: string) => {
    const { data, error } = await supabase.rpc('register_queue_visit', {
      p_branch_id: branchId!,
      p_appointment_id: appointmentId || null,
    });
    if (error) throw error;
    await fetchData();
    return data as { visit_id: string; visit_code: string; visit_number: number };
  };

  const routeStep = async (
    visitId: string,
    stepId: string,
    action: 'call' | 'start' | 'complete' | 'cancel',
    nextStep?: string,
    roomNumber?: number,
    routeNote?: string,
  ) => {
    const { error } = await supabase.rpc('route_visit_step', {
      p_visit_id: visitId,
      p_current_step_id: stepId,
      p_action: action,
      p_next_step: nextStep || null,
      p_room_number: roomNumber || null,
      p_route_note: routeNote || null,
    });
    if (error) throw error;
    await fetchData();
  };

  return { visits, steps, loading, fetchData, registerVisit, routeStep };
}
