import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  hasSubmittedSelfTestResult,
  isActiveUnsubmittedSelfTestRequest,
} from '@/lib/selftestStatus';

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

function hasSeparateSubmittedCheckForRequest(
  request: { created_at?: string | null },
  checks: Array<{ created_at?: string | null }>
) {
  const requestTime = request.created_at ? new Date(request.created_at).getTime() : 0;
  if (!requestTime || Number.isNaN(requestTime)) return false;
  return checks.some((check) => {
    const checkTime = check.created_at ? new Date(check.created_at).getTime() : 0;
    return !!checkTime && !Number.isNaN(checkTime) && checkTime >= requestTime;
  });
}

export async function evaluateJourney(userId: string): Promise<JourneyState> {
  const today = new Date().toISOString().split('T')[0];
  const in48h = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [
    upcomingRes,
    totalBookingsRes,
    selftestsRes,
    matchRes,
    confirmedRes,
    completedRes,
    selftestChecksRes,
    chatRes,
  ] = await Promise.all([
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

    // Self-test rows used for all self-test journey decisions. Do not rely on
    // status/test_result alone: submitted rows can remain delivered/received.
    supabase
      .from('hiv_selftest_requests')
      .select('id, status, created_at, result_submitted_at, result_photo_url, test_result, self_reported_result')
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

    // Separate result/check table. If a check exists after a request was
    // created, that request must not be treated as awaiting submission.
    supabase
      .from('hiv_self_test_checks')
      .select('created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50),

    // Has chat thread
    supabase
      .from('direct_chat_threads')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
  ]);

  const hasMatch = (matchRes.data?.length ?? 0) > 0;
  const selftestRows = selftestsRes.data ?? [];
  const selftestChecks = selftestChecksRes.data ?? [];
  const activeSelftestRows = selftestRows.filter(
    (row) =>
      isActiveUnsubmittedSelfTestRequest(row) &&
      !hasSeparateSubmittedCheckForRequest(row, selftestChecks)
  );
  const submittedSelftestRows = selftestRows.filter(
    (row) => hasSubmittedSelfTestResult(row) || hasSeparateSubmittedCheckForRequest(row, selftestChecks)
  );
  const deliveredSelftestRows = selftestRows.filter((row) => {
    const status = String(row.status ?? '').toLowerCase();
    return (
      status === 'delivered' ||
      status === 'received' ||
      hasSubmittedSelfTestResult(row) ||
      hasSeparateSubmittedCheckForRequest(row, selftestChecks)
    );
  });
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
    hasPendingResultSubmission: activeSelftestRows.length > 0,
    hasUpcomingAppointment: (upcomingRes.count ?? 0) > 0,
    hasEverBooked: (totalBookingsRes.count ?? 0) > 0,
    hasRequestedSelfTest: selftestRows.length > 0,
    hasCompletedPreventionMatch: hasMatch,
    hasBookedAfterMatch,
    hasConfirmedAppointment: (confirmedRes.count ?? 0) > 0,
    hasCompletedAppointment: (completedRes.count ?? 0) > 0,
    hasSubmittedResult: submittedSelftestRows.length > 0,
    hasSelfTestDelivered: deliveredSelftestRows.length > 0,
    hasChatThread: (chatRes.count ?? 0) > 0,
  };
}

export function useJourneyState(userId: string | undefined) {
  const [state, setState] = useState<JourneyState | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const refresh = () => setTick((value) => value + 1);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    window.addEventListener('selftest:pending-refresh', refresh);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('selftest:pending-refresh', refresh);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  useEffect(() => {
    if (!userId) {
      setState(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    evaluateJourney(userId)
      .then((s) => { if (!cancelled) setState(s); })
      .catch((err) => console.error('Journey state error:', err))
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [userId, tick]);

  return { state, loading };
}
