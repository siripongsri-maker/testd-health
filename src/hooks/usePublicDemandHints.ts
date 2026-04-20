import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { PublicDemandRaw } from '@/lib/forecast/publicDemand';

interface State {
  data: PublicDemandRaw | null;
  loading: boolean;
  error: string | null;
}

const cache = new Map<string, { data: PublicDemandRaw; ts: number }>();
const TTL_MS = 5 * 60 * 1000; // 5 min

export function usePublicDemandHints(branchId: string | null, horizonDays = 30): State {
  const [state, setState] = useState<State>({ data: null, loading: false, error: null });

  useEffect(() => {
    if (!branchId) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    const key = `${branchId}:${horizonDays}`;
    const cached = cache.get(key);
    if (cached && Date.now() - cached.ts < TTL_MS) {
      setState({ data: cached.data, loading: false, error: null });
      return;
    }

    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));

    (async () => {
      try {
        const { data, error } = await supabase.rpc('get_public_demand_hints', {
          p_branch_id: branchId,
          p_horizon_days: horizonDays,
        });
        if (cancelled) return;
        if (error) {
          setState({ data: null, loading: false, error: error.message });
          return;
        }
        const payload = data as unknown as PublicDemandRaw;
        cache.set(key, { data: payload, ts: Date.now() });
        setState({ data: payload, loading: false, error: null });
      } catch (e) {
        if (cancelled) return;
        setState({ data: null, loading: false, error: (e as Error).message });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [branchId, horizonDays]);

  return state;
}
