import { supabase } from '@/integrations/supabase/client';
import type { EnrichedAppointment, UrgentSupportSignal } from '@/components/admin/booking/types';

export interface ReferralResult {
  status: 'created' | 'exists';
}

/** Statuses that mean the referral is still visible/active in the counseling queue. */
export const OPEN_REFERRAL_STATUSES = ['requested', 'pending', 'assigned', 'in_progress'];

export const APPT_TAG = (id: string) => `[APPT:${id}]`;

function buildNotes(apt: EnrichedAppointment, signals: UrgentSupportSignal[]) {
  const tags = signals.map(s => s.labelTh).join(', ') || 'เร่งด่วน';
  return [
    APPT_TAG(apt.id),
    `ส่งต่อจากหน้านัดหมาย (${apt.appointment_date} ${String(apt.start_time || '').slice(0, 5)})`,
    apt.referral_code ? `รหัส: ${apt.referral_code}` : null,
    `สัญญาณเร่งด่วน: ${tags}`,
  ].filter(Boolean).join(' | ');
}

/** Which of the given appointment ids already have an open referral in the counseling queue. */
export async function fetchReferredAppointmentIds(appointmentIds: string[]): Promise<Set<string>> {
  const found = new Set<string>();
  if (appointmentIds.length === 0) return found;

  const { data } = await supabase
    .from('hr_referrals')
    .select('notes, status')
    .in('status', OPEN_REFERRAL_STATUSES)
    .order('created_at', { ascending: false })
    .limit(500);

  ((data as any[]) || []).forEach(row => {
    const notes: string = row?.notes || '';
    appointmentIds.forEach(id => { if (notes.includes(APPT_TAG(id))) found.add(id); });
  });
  return found;
}

/** Refer an urgent appointment case to the counselor queue. Idempotent per appointment. */
export async function referAppointmentToCounselor(
  apt: EnrichedAppointment,
  signals: UrgentSupportSignal[],
): Promise<ReferralResult> {
  const { data: existing } = await supabase
    .from('hr_referrals')
    .select('id')
    .ilike('notes', `%${APPT_TAG(apt.id)}%`)
    .in('status', OPEN_REFERRAL_STATUSES)
    .limit(1);

  if (existing && existing.length > 0) return { status: 'exists' };

  const primary = signals[0]?.kind || 'urgent_support';
  const contactValue = (apt as any).contact_phone || apt.contact_email || null;

  const { error } = await supabase.from('hr_referrals').insert({
    referral_type: primary,
    priority: 'urgent',
    risk_level: 'high',
    // 'requested' is the status the counseling queue treats as "new"
    status: 'requested',
    branch_id: apt.branch_id as string,
    user_id: (apt as any).user_id || null,
    contact_method: (apt as any).contact_phone ? 'phone' : apt.contact_email ? 'email' : null,
    contact_value: contactValue,
    notes: buildNotes(apt, signals),
  });

  if (error) throw error;
  return { status: 'created' };
}
