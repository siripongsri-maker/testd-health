import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/hooks/useAnalytics";

/**
 * Service Pathway — tracks user journey through HR clinical service system.
 * Connects entry → intake → screening → recommendation → action → follow-up.
 */

export type ServiceCategory =
  | "harm_reduction_counseling"
  | "sexual_health"
  | "hiv_test"
  | "sti_test"
  | "prep"
  | "pep"
  | "self_test_support"
  | "mental_health_support"
  | "followup_consultation";

export type ServiceEventType =
  | "hr_screening_started"
  | "hr_screening_completed"
  | "hr_counseling_requested"
  | "swing_clinic_booking_started"
  | "swing_clinic_booking_completed"
  | "mental_health_screen_completed"
  | "callback_requested"
  | "recovery_mode_activated"
  | "followup_completed"
  | "safer_plan_created"
  | "referral_accepted"
  | "referral_declined";

export interface PathwayData {
  entry_point?: string;
  reason_for_visit?: string[];
  intake_age_range?: string;
  intake_gender?: string;
  intake_context?: string;
  intake_urgency?: string;
  preferred_support_channel?: string;
}

/** Create a new service pathway and return its ID */
export async function createServicePathway(
  userId: string | undefined,
  data: PathwayData
): Promise<string | null> {
  const payload: any = {
    ...data,
    user_id: userId || null,
    anonymous_token: userId ? null : `anon-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    service_status: "started",
  };

  const { data: result, error } = await supabase
    .from("service_pathways")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    console.error("Failed to create service pathway:", error);
    return null;
  }

  trackEvent("service_pathway_created", { entry_point: data.entry_point });
  return result.id;
}

/** Update pathway with screening results */
export async function updatePathwayScreening(
  pathwayId: string,
  distressLevel: string,
  recommendations: string[]
) {
  await supabase
    .from("service_pathways")
    .update({
      screening_completed: true,
      screening_distress_level: distressLevel,
      recommendation_shown: recommendations,
      updated_at: new Date().toISOString(),
    })
    .eq("id", pathwayId);

  trackEvent("service_pathway_screening", { distress: distressLevel });
}

/** Record a service event linked to a pathway */
export async function recordServiceEvent(
  pathwayId: string | null,
  eventType: ServiceEventType,
  userId?: string,
  meta?: {
    service_category?: ServiceCategory;
    urgency_level?: string;
    counseling_needed?: boolean;
    clinic_referral_needed?: boolean;
    mental_health_referral_needed?: boolean;
    population_group?: string;
    branch_id?: string;
  }
) {
  const payload: any = {
    event_type: eventType,
    service_date: new Date().toISOString().split("T")[0],
    pathway_id: pathwayId,
    user_id: userId || null,
    service_category: meta?.service_category || null,
    urgency_level: meta?.urgency_level || "normal",
    counseling_needed: meta?.counseling_needed || false,
    clinic_referral_needed: meta?.clinic_referral_needed || false,
    mental_health_referral_needed: meta?.mental_health_referral_needed || false,
    population_group: meta?.population_group || null,
    branch_id: meta?.branch_id || null,
    service_status: "pending",
  };

  const { error } = await supabase.from("service_events").insert(payload);
  if (error) console.error("Failed to record service event:", error);

  trackEvent(eventType, { pathway_id: pathwayId });
}

/** Create a follow-up event */
export async function createFollowup(
  pathwayId: string | null,
  userId: string | undefined,
  followupType: string,
  daysFromNow: number
) {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + daysFromNow);

  await supabase.from("followup_events").insert({
    pathway_id: pathwayId,
    user_id: userId || null,
    followup_type: followupType,
    source_type: "service_pathway",
    scheduled_at: dueDate.toISOString(),
    status: "pending",
  });

  trackEvent("followup_created", { type: followupType, days: daysFromNow });
}

/** Get user's active pathway */
export async function getActivePathway(userId: string) {
  const { data } = await supabase
    .from("service_pathways")
    .select("*")
    .eq("user_id", userId)
    .in("service_status", ["started", "in_progress"])
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  return data;
}

/** Get user's service timeline */
export async function getServiceTimeline(userId: string) {
  const [pathways, events, followups] = await Promise.all([
    supabase
      .from("service_pathways")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("service_events")
      .select("*")
      .eq("user_id", userId)
      .order("service_date", { ascending: false })
      .limit(20),
    supabase
      .from("followup_events")
      .select("*")
      .eq("user_id", userId)
      .order("due_date", { ascending: true })
      .limit(10),
  ]);

  return {
    pathways: pathways.data || [],
    events: events.data || [],
    followups: followups.data || [],
  };
}
