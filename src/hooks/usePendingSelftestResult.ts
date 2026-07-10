import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  getSelfTestSubmittedTime,
  isActiveUnsubmittedSelfTestRequest,
  isSupersededBySelfTestSubmission,
} from "@/lib/selftestStatus";

const TIMER_STORAGE_KEY = "hiv-selftest-timer";


export interface PendingSelftestDetails {
  source: "db" | "timer";
  status?: string;
  createdAt?: string;
  startedAt?: string;
}

export interface PendingSelftestState {
  hasPending: boolean;
  dbCount: number;
  hasLocalTimer: boolean;
  loading: boolean;
  details: PendingSelftestDetails | null;
  refresh: () => void;
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

/**
 * Detects whether the current visitor has an outstanding HIV self-test result
 * to submit, combining:
 *   - DB rows for the logged-in user (kit shipped/delivered but no result_submitted_at)
 *   - localStorage timer key set by the on-page timer (covers anonymous visitors)
 *
 * Used to render a non-error "submit result" reminder on Home and HIVSelfTest.
 */
export function usePendingSelftestResult(): PendingSelftestState {
  const { user, loading: authLoading } = useAuth();
  const [dbCount, setDbCount] = useState(0);
  const [dbDetails, setDbDetails] = useState<PendingSelftestDetails | null>(null);
  const [hasLocalTimer, setHasLocalTimer] = useState(false);
  const [timerDetails, setTimerDetails] = useState<PendingSelftestDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  // Refresh when other parts of the app signal that a result was submitted,
  // when the tab regains focus, or when localStorage changes in another tab.
  useEffect(() => {
    const onRefresh = () => setTick((t) => t + 1);
    const onVisibility = () => {
      if (document.visibilityState === "visible") setTick((t) => t + 1);
    };
    window.addEventListener("selftest:pending-refresh", onRefresh);
    window.addEventListener("storage", onRefresh);
    window.addEventListener("focus", onRefresh);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("selftest:pending-refresh", onRefresh);
      window.removeEventListener("storage", onRefresh);
      window.removeEventListener("focus", onRefresh);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // Check localStorage timer. It is only authoritative for anonymous visitors.
  // Logged-in users must be driven by fresh DB state; otherwise a stale timer
  // can keep showing "awaiting result" after the result was submitted.
  useEffect(() => {
    if (authLoading) return;
    if (user) {
      setHasLocalTimer(false);
      setTimerDetails(null);
      return;
    }

    try {
      const stored = localStorage.getItem(TIMER_STORAGE_KEY);
      if (!stored) {
        setHasLocalTimer(false);
        setTimerDetails(null);
        return;
      }
      const parsed = JSON.parse(stored);
      const startedAt = parsed?.startedAt;
      // Consider "pending" once the timer has been started — finished or not.
      setHasLocalTimer(!!startedAt);
      setTimerDetails(
        startedAt
          ? { source: "timer", startedAt: String(startedAt) }
          : null
      );
    } catch {
      setHasLocalTimer(false);
      setTimerDetails(null);
    }
  }, [authLoading, user, tick]);

  // Check DB rows for logged-in users
  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setDbCount(0);
      setLoading(authLoading);
      return;
    }
    setLoading(true);
    (async () => {
      const [requestRes, checksRes] = await Promise.all([
        supabase
          .from("hiv_selftest_requests")
          .select("id, status, created_at, updated_at, result_submitted_at, result_photo_url, test_result, self_reported_result")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("hiv_self_test_checks")
          .select("created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(25),
      ]);
      if (cancelled) return;
      const { data, error } = requestRes;
      if (error) {
        setDbCount(0);
        setDbDetails(null);
      } else {
        // Defense in depth — post-filter to guarantee no submitted row leaks.
        const checks = checksRes.data ?? [];
        const submittedTimes = [
          ...(data ?? [])
            .map((row) => getSelfTestSubmittedTime(row))
            .filter((time): time is number => time !== null),
          ...checks
            .map((check) => {
              const time = check.created_at ? new Date(check.created_at).getTime() : NaN;
              return Number.isFinite(time) ? time : null;
            })
            .filter((time): time is number => time !== null),
        ];
        const rows = (data ?? []).filter(
          (r) =>
            isActiveUnsubmittedSelfTestRequest(r) &&
            !isSupersededBySelfTestSubmission(r, submittedTimes) &&
            !hasSeparateSubmittedCheckForRequest(r, checks)
        );
        if (rows.length === 0) {
          try {
            localStorage.removeItem(TIMER_STORAGE_KEY);
          } catch {
            /* noop */
          }
          setHasLocalTimer(false);
          setTimerDetails(null);
        }
        setDbCount(rows.length);
        setDbDetails(
          rows[0]
            ? {
                source: "db",
                status: rows[0].status ?? undefined,
                createdAt: rows[0].created_at ?? undefined,
              }
            : null
        );
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading, tick]);

  return {
    hasPending: dbCount > 0 || (!user && !authLoading && hasLocalTimer),
    dbCount,
    hasLocalTimer,
    loading,
    details: dbDetails ?? timerDetails,
    refresh,
  };
}
