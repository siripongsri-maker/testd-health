import { supabase } from '@/integrations/supabase/client';

/**
 * Shared appointment shape used across staff admin and user views.
 * Single source of truth for appointment data fetching.
 */

export interface ServiceInfo {
  name_th: string;
  name_en: string;
  icon: string;
}

export interface BranchInfo {
  name_th: string;
  name_en: string;
  slug: string;
}

export interface StaffInfo {
  id: string;
  name_th: string;
  name_en: string;
  role: string;
  branch_id: string | null;
}

export interface AppointmentLogEntry {
  id: string;
  action: string;
  performed_by: string | null;
  details: string | null;
  created_at: string;
}

export interface FullAppointment {
  id: string;
  user_id: string | null;
  branch_id: string;
  referral_code: string | null;
  appointment_date: string;
  start_time: string;
  status: string;
  notes: string | null;
  staff_notes: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_line: string | null;
  created_at: string;
  updated_at: string;
  cancelled_at: string | null;
  completed_at: string | null;
  cancellation_reason: string | null;
  attended_by: string | null;
  arrived_at: string | null;
  checked_out_at: string | null;
  duration_minutes: number | null;
  rating: number | null;
  feedback: string | null;
  booking_branches: BranchInfo | null;
  booking_services: ServiceInfo | null; // primary/legacy service
  services: ServiceInfo[]; // from join table (source of truth)
  staff: StaffInfo | null;
  logs: AppointmentLogEntry[];
}

const APPOINTMENT_SELECT = `
  *,
  booking_branches(name_th, name_en, slug),
  booking_services(name_th, name_en, icon)
`;

/**
 * Fetch full appointments for a user (their own).
 */
export async function fetchUserAppointments(userId: string): Promise<FullAppointment[]> {
  const { data } = await supabase
    .from('appointments')
    .select(APPOINTMENT_SELECT)
    .eq('user_id', userId)
    .order('appointment_date', { ascending: false })
    .order('start_time', { ascending: false });

  const rows = (data || []) as unknown as FullAppointment[];
  return enrichAppointments(rows);
}

/**
 * Fetch appointments for staff (date-filtered, optional status filter).
 */
export async function fetchStaffAppointments(
  dateFilter: string,
  statusFilter?: string,
  branchId?: string
): Promise<FullAppointment[]> {
  let query = supabase
    .from('appointments')
    .select(APPOINTMENT_SELECT)
    .eq('appointment_date', dateFilter)
    .order('start_time');

  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }
  if (branchId) {
    query = query.eq('branch_id', branchId);
  }

  const { data } = await query;
  const rows = (data || []) as unknown as FullAppointment[];
  return enrichAppointments(rows);
}

/**
 * Fetch a single appointment by ID (used for detail panel refresh).
 */
export async function fetchAppointmentById(appointmentId: string): Promise<FullAppointment | null> {
  const { data } = await supabase
    .from('appointments')
    .select(APPOINTMENT_SELECT)
    .eq('id', appointmentId)
    .single();

  if (!data) return null;
  const rows = await enrichAppointments([data as unknown as FullAppointment]);
  return rows[0] || null;
}

/**
 * Enrich appointment rows with multi-service data, staff info, and latest logs.
 */
export async function enrichAppointments(rows: FullAppointment[]): Promise<FullAppointment[]> {
  if (rows.length === 0) return rows;

  const ids = rows.map(r => r.id);

  // Parallel: fetch services, staff, and logs
  const [servicesRes, staffRes, logsRes] = await Promise.all([
    supabase
      .from('appointment_services')
      .select('appointment_id, booking_services(name_th, name_en, icon)')
      .in('appointment_id', ids),
    supabase
      .from('staff_profiles')
      .select('id, name_th, name_en, role, branch_id')
      .in('id', rows.filter(r => r.attended_by).map(r => r.attended_by!)),
    supabase
      .from('appointment_logs')
      .select('id, appointment_id, action, performed_by, details, created_at')
      .in('appointment_id', ids)
      .order('created_at', { ascending: false })
      .limit(50), // latest 50 across all
  ]);

  // Build services map
  const servicesMap: Record<string, ServiceInfo[]> = {};
  (servicesRes.data || []).forEach((row: any) => {
    const aid = row.appointment_id;
    if (!servicesMap[aid]) servicesMap[aid] = [];
    if (row.booking_services) servicesMap[aid].push(row.booking_services);
  });

  // Build staff map
  const staffMap: Record<string, StaffInfo> = {};
  (staffRes.data || []).forEach((s: any) => {
    staffMap[s.id] = s;
  });

  // Build logs map
  const logsMap: Record<string, AppointmentLogEntry[]> = {};
  (logsRes.data || []).forEach((log: any) => {
    const aid = log.appointment_id;
    if (!logsMap[aid]) logsMap[aid] = [];
    logsMap[aid].push(log);
  });

  return rows.map(row => ({
    ...row,
    services: servicesMap[row.id] || (row.booking_services ? [row.booking_services] : []),
    staff: row.attended_by ? (staffMap[row.attended_by] || null) : null,
    logs: (logsMap[row.id] || []).slice(0, 5), // latest 5 per appointment
  }));
}

/**
 * Get display services for an appointment (prefers join table, falls back to primary).
 */
export function getDisplayServices(apt: FullAppointment): ServiceInfo[] {
  return apt.services.length > 0 ? apt.services : (apt.booking_services ? [apt.booking_services] : []);
}

/**
 * Update appointment status via secure RPC.
 */
export async function updateAppointmentStatusRPC(
  appointmentId: string,
  newStatus: string,
  reason?: string
) {
  const { error } = await supabase.rpc('update_appointment_status', {
    p_appointment_id: appointmentId,
    p_new_status: newStatus,
    p_reason: reason || null,
  });
  if (error) throw error;
}

/**
 * Assign staff via secure RPC.
 */
export async function assignStaffRPC(appointmentId: string, staffProfileId: string) {
  const { error } = await supabase.rpc('assign_staff_to_appointment', {
    p_appointment_id: appointmentId,
    p_staff_profile_id: staffProfileId,
  });
  if (error) throw error;
}

/**
 * Add staff note via secure RPC.
 */
export async function addStaffNoteRPC(appointmentId: string, note: string) {
  const { error } = await supabase.rpc('add_staff_note', {
    p_appointment_id: appointmentId,
    p_note: note,
  });
  if (error) throw error;
}

/**
 * Self check-in via secure RPC.
 */
export async function selfCheckinRPC(appointmentId: string) {
  const { error } = await supabase.rpc('self_checkin_appointment', {
    p_appointment_id: appointmentId,
  });
  if (error) throw error;
}

/**
 * Self check-out via secure RPC.
 */
export async function selfCheckoutRPC(
  appointmentId: string,
  confirmCode: string,
  rating?: number | null,
  feedback?: string | null
) {
  const { error } = await supabase.rpc('self_checkout_appointment', {
    p_appointment_id: appointmentId,
    p_confirm_code: confirmCode,
    p_rating: rating ?? null,
    p_feedback: feedback ?? null,
  });
  if (error) throw error;
}

/**
 * Subscribe to realtime appointment changes.
 * Returns an unsubscribe function.
 */
export function subscribeToAppointments(
  onUpdate: () => void,
  filter?: { column: string; value: string }
) {
  let channel = supabase.channel('appointments-realtime');

  // Subscribe to appointments changes
  channel = channel.on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'appointments',
      ...(filter ? { filter: `${filter.column}=eq.${filter.value}` } : {}),
    },
    () => onUpdate()
  );

  // Also listen to appointment_logs for activity updates
  channel = channel.on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'appointment_logs',
    },
    () => onUpdate()
  );

  channel.subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
