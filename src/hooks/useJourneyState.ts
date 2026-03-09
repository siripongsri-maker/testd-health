import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Shared journey state derived from existing tables.
 * Used by SmartPriorityCard and MyPreventionJourneyCard.
 */
export interface JourneyState {
  hasPendingResultSubmission: boolean;
  hasUpcomingAppointment: boolean;
  hasEverBooked: boolean;
  hasRequestedSelfTest: boolean;
  hasCompletedPreventionMatch: boolean;
  hasBookedAfterMatch: boolean;
  // Extended for journey timeline
  hasConfirmedAppointment: boolean;
  hasCompletedAppointment: boolean;
  hasSubmittedResult: boolean;
  hasSelfTestDelivered: boolean;
  hasChatThread: boolean;
}

export async function evaluateJourney(userId: string): Promise<JourneyState> {
  const today = new Date().toISOString().split('T')[0];
  const in48h = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [
    pendingResultRes,
    upcomingRes,
    totalBookingsRes,
    totalSelftestsRes,
    matchRes,
    confirmedRes,
    completedRes,
    resultSubmittedRes,
    deliveredRes,
    chatRes,
  ] = await Promise.all([
    // P1: selftest delivered/received but no result submitted
    supabase
      .from('hiv_selftest_requests')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('status', ['approved', 'shipped', 'delivered', 'received'])
      .is('test_result', null),

    // P2: upcoming appointment within 48h
    supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('status', ['booked', 'confirmed'])
      .gte('appointment_date', today)
      .lte('appointment_date', in48h),

    // Ever booked
    supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),

    // Ever requested selftest
    supabase
      .from('hiv_selftest_requests')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),

    // Prevention match completed
    supabase
      .from('prevention_match_results' as any)
      .select('id, created_at', { count: 'exact', head: false })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1),

    // Has confirmed/arrived appointment
    supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('status', ['confirmed', 'arrived', 'in_progress', 'completed', 'checked_out']),

    // Has completed appointment
    supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('status', ['completed', 'checked_out']),

    // Has submitted selftest result
    supabase
      .from('hiv_selftest_requests')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('test_result', 'is', null),

    // Has selftest delivered/received
    supabase
      .from('hiv_selftest_requests')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('status', ['delivered', 'received', 'result_submitted']),

    // Has chat thread
    supabase
      .from('direct_chat_threads')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
  ]);

  const hasMatch = (matchRes.data?.length ?? 0) > 0;
  let hasBookedAfterMatch = false;
  if (hasMatch && matchRes.data?.[0]) {
    const matchDate = (matchRes.data[0] as any).created_at;
    if (matchDate) {
      const { count } = await supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gt('created_at', matchDate);
      hasBookedAfterMatch = (count ?? 0) > 0;
    }
  }

  return {
    hasPendingResultSubmission: (pendingResultRes.count ?? 0) > 0,
    hasUpcomingAppointment: (upcomingRes.count ?? 0) > 0,
    hasEverBooked: (totalBookingsRes.count ?? 0) > 0,
    hasRequestedSelfTest: (totalSelftestsRes.count ?? 0) > 0,
    hasCompletedPreventionMatch: hasMatch,
    hasBookedAfterMatch,
    hasConfirmedAppointment: (confirmedRes.count ?? 0) > 0,
    hasCompletedAppointment: (completedRes.count ?? 0) > 0,
    hasSubmittedResult: (resultSubmittedRes.count ?? 0) > 0,
    hasSelfTestDelivered: (deliveredRes.count ?? 0) > 0,
    hasChatThread: (chatRes.count ?? 0) > 0,
  };
}

export function useJourneyState(userId: string | undefined) {
  const [state, setState] = useState<JourneyState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    evaluateJourney(userId)
      .then((s) => { if (!cancelled) setState(s); })
      .catch((err) => console.error('Journey state error:', err))
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [userId]);

  return { state, loading };
}
