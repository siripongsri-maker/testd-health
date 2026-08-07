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

export interface UrgentAppointmentRef {
  appointment_id: string;
  branch_id: string | null;
  appointment_date: string;
  start_time: string | null;
  referral_code: string | null;
  status: string;
  case: UrgentCaseRef;
}

/**
 * Urgent appointments for a given day (optionally one branch).
 *
 * This is the SAME source the appointments page and the counseling queue use
 * (open referrals in `hr_referrals` tagged with `[APPT:<id>]`), so the counts on
 * the daily branch brief line up instead of only counting cases that happen to
 * have a pre-service survey row.
 */
export async function fetchUrgentAppointmentsForDay(
  day: string,
  branchId?: string | null,
): Promise<UrgentAppointmentRef[]> {
  const urgentMap = await fetchUrgentCaseMap();
  const ids = Array.from(urgentMap.keys());
  if (ids.length === 0) return [];

  let q = supabase
    .from('appointments')
    .select('id, branch_id, appointment_date, start_time, referral_code, status')
    .in('id', ids)
    .eq('appointment_date', day)
    .not('status', 'in', '("cancelled","no_show")');
  if (branchId) q = q.eq('branch_id', branchId);

  const { data, error } = await q;
  if (error) {
    console.error('URGENT_APPOINTMENTS_DAY_FAILED', error);
    return [];
  }

  return ((data as any[]) || []).map((a) => ({
    appointment_id: a.id,
    branch_id: a.branch_id ?? null,
    appointment_date: a.appointment_date,
    start_time: a.start_time ?? null,
    referral_code: a.referral_code ?? null,
    status: a.status,
    case: urgentMap.get(a.id) as UrgentCaseRef,
  }));
}

export { APPT_TAG };

