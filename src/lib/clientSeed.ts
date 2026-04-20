/**
 * First-party client seed tracking for assessment/feedback forms.
 *
 * - Generates a persistent anonymous ID stored in localStorage (cookie-free)
 * - Logs visit/event entries to `client_seed_visits` table
 * - Allows binding the seed to a UIC later when the user provides one
 */
import { supabase } from '@/integrations/supabase/client';
import { isValidUic } from './uic';

const SEED_KEY = 'testd_client_seed_id';
const UIC_KEY = 'testd_uic';

export const getClientSeedId = (): string => {
  let id = localStorage.getItem(SEED_KEY);
  if (!id) {
    id = `cs_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    localStorage.setItem(SEED_KEY, id);
  }
  return id;
};

export const getStoredUic = (): string | null => localStorage.getItem(UIC_KEY);

export const setStoredUic = (uic: string | null) => {
  if (uic && isValidUic(uic)) {
    localStorage.setItem(UIC_KEY, uic);
  } else if (!uic) {
    localStorage.removeItem(UIC_KEY);
  }
};

export type SeedEventType =
  | 'visit_started'
  | 'assessment_viewed'
  | 'assessment_started'
  | 'assessment_submitted'
  | 'assessment_completed';

export const trackSeedEvent = async (
  eventType: SeedEventType,
  meta?: {
    channel?: string;
    branch_id?: string | null;
    language?: string;
    uic?: string | null;
    extra?: Record<string, unknown>;
  }
) => {
  try {
    const seed = getClientSeedId();
    const uic = meta?.uic ?? getStoredUic();
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from('client_seed_visits').insert({
      client_seed_id: seed,
      uic: uic && isValidUic(uic) ? uic : null,
      event_type: eventType,
      page_path: window.location.pathname,
      channel: meta?.channel || null,
      branch_id: meta?.branch_id || null,
      language: meta?.language || null,
      user_id: user?.id || null,
      metadata: meta?.extra || null,
    } as any);
  } catch {
    // Silent fail — tracking should never break UX
  }
};

export interface UicVisitStats {
  visit_count: number;
  assessment_count: number;
  last_assessment_at: string | null;
  is_repeat: boolean;
}

export const fetchUicVisitStats = async (uic: string | null, seed: string): Promise<UicVisitStats> => {
  try {
    const { data, error } = await supabase.rpc('get_uic_visit_stats', {
      _uic: uic && isValidUic(uic) ? uic : null,
      _seed: seed,
    } as any);
    if (error || !data || !Array.isArray(data) || data.length === 0) {
      return { visit_count: 0, assessment_count: 0, last_assessment_at: null, is_repeat: false };
    }
    const row = data[0] as any;
    return {
      visit_count: row.visit_count || 0,
      assessment_count: row.assessment_count || 0,
      last_assessment_at: row.last_assessment_at || null,
      is_repeat: !!row.is_repeat,
    };
  } catch {
    return { visit_count: 0, assessment_count: 0, last_assessment_at: null, is_repeat: false };
  }
};
