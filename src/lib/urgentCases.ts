import { supabase } from '@/integrations/supabase/client';
import { OPEN_REFERRAL_STATUSES, APPT_TAG } from '@/lib/urgentReferral';

/**
 * Shared "urgent case" source of truth across the admin console.
 *
 * Urgent appointments detected on the booking page are pushed into
 * `hr_referrals` tagged with `[APPT:<appointment_id>]`. Every other admin
 * screen (counseling queue, daily branch brief, travel allowance payouts)
 * reads back from here so the same case is highlighted everywhere.
 */
export interface UrgentCaseRef {
  referral_id: string;
  appointment_id: string;
  branch_id: string | null;
  referral_type: string;
  priority: string | null;
  risk_level: string | null;
  status: string | null;
  notes: string | null;
  created_at: string;
}

const APPT_RE = /\[APPT:([0-9a-fA-F-]{36})\]/;

export function extractAppointmentId(notes: string | null | undefined): string | null {
  const m = APPT_RE.exec(notes || '');
  return m ? m[1] : null;
}

export function isUrgentReferral(row: { priority?: string | null; risk_level?: string | null }) {
  return row.priority === 'urgent' || row.priority === 'high' || row.risk_level === 'high';
}

/** All open urgent referrals that originate from an appointment, keyed by appointment id. */
export async function fetchUrgentCaseMap(): Promise<Map<string, UrgentCaseRef>> {
  const map = new Map<string, UrgentCaseRef>();
  const { data, error } = await supabase
    .from('hr_referrals')
    .select('id, branch_id, referral_type, priority, risk_level, status, notes, created_at')
    .in('status', OPEN_REFERRAL_STATUSES)
    .order('created_at', { ascending: false })
    .limit(1000);

  if (error) {
    console.error('URGENT_CASE_MAP_FAILED', error);
    return map;
  }

  ((data as any[]) || []).forEach((row) => {
    const apptId = extractAppointmentId(row.notes);
    if (!apptId || map.has(apptId)) return;
    map.set(apptId, {
      referral_id: row.id,
      appointment_id: apptId,
      branch_id: row.branch_id ?? null,
      referral_type: row.referral_type,
      priority: row.priority ?? null,
      risk_level: row.risk_level ?? null,
      status: row.status ?? null,
      notes: row.notes ?? null,
      created_at: row.created_at,
    });
  });

  return map;
}

/** Map pre-service survey ids -> appointment ids (used by the daily branch brief). */
export async function fetchSurveyAppointmentMap(surveyIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (surveyIds.length === 0) return map;
  const { data } = await supabase
    .from('appointment_pre_service_surveys')
    .select('id, booking_id')
    .in('id', surveyIds);
  ((data as any[]) || []).forEach((r) => {
    if (r.booking_id) map.set(r.id, r.booking_id);
  });
  return map;
}

export { APPT_TAG };
