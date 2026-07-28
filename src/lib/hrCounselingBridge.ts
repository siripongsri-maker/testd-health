/**
 * Bridge between the Harm Reduction self-screening flow and the
 * pre-counselling / counselor queue.
 *
 * The HR screening is intentionally anonymous-friendly, so we keep only a
 * lightweight pointer to the last screening in localStorage. When the user
 * later asks for support (CounselingReferral), that pointer is attached to
 * the referral so a counselor can open the matching harm-reduction context.
 */

const KEY = "hr_last_screening_v1";

export interface LastScreeningRef {
  id: string;
  riskLevel: string | null;
  anonymousToken: string | null;
  completedAt: string;
}

export function saveLastScreening(ref: LastScreeningRef) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ref));
  } catch {
    /* storage unavailable — bridge is best-effort */
  }
}

export function getLastScreening(): LastScreeningRef | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LastScreeningRef;
    if (!parsed?.id) return null;
    // Only bridge recent screenings (30 days) to avoid stale clinical context
    const age = Date.now() - new Date(parsed.completedAt).getTime();
    if (!Number.isFinite(age) || age > 30 * 24 * 60 * 60 * 1000) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearLastScreening() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* no-op */
  }
}

/** Maps an HR screening risk level to the referral priority used by counselors. */
export function riskToPriority(riskLevel: string | null | undefined, urgentFlag?: boolean): string {
  if (urgentFlag || riskLevel === "critical") return "urgent";
  if (riskLevel === "high") return "high";
  return "normal";
}
