/**
 * Single source of truth for deciding whether an HIV self-test request has
 * already had its result submitted, and whether it should still block a new
 * request / render the "submit result" flow.
 *
 * These helpers must be used everywhere the app decides what step to render
 * or whether to treat a row as an active pending kit. Do NOT rely on
 * `request.status` alone — some rows keep a `delivered` / `received` status
 * even after a result has been submitted, and any such row must be treated
 * as SUBMITTED (not active) so we don't loop the user back into "พร้อมส่งผลแล้ว".
 */

export const SUBMITTED_STATUSES = new Set([
  "result_submitted",
  "submitted",
  "reviewed",
  "result_reviewed",
  "followed_up",
  "completed",
  "closed",
  "cancelled",
  "positive",
  "negative",
  "reactive",
  "non_reactive",
  "invalid",
]);

// A "pending result submission" ONLY means the kit is physically in the user's
// hands (delivered/received) and no result evidence exists. Earlier stages
// (pending / approved / shipped) must NEVER show the "submit result" card.
export const ACTIVE_PRE_RESULT_STATUSES = new Set([
  "delivered",
  "received",
]);

function toTime(value: unknown): number | null {
  if (!value) return null;
  const time = new Date(String(value)).getTime();
  return Number.isFinite(time) ? time : null;
}


/** Best-known timestamp for a submitted/completed result signal. */
export function getSelfTestSubmittedTime(r: unknown): number | null {
  if (!r || typeof r !== "object") return null;
  if (!hasSubmittedSelfTestResult(r)) return null;
  const row = r as Record<string, unknown>;
  const candidates = [
    row.result_submitted_at,
    row.submitted_at,
    row.updated_at,
    row.created_at,
  ]
    .map(toTime)
    .filter((time): time is number => time !== null);
  return candidates.length ? Math.max(...candidates) : null;
}


/** True when a later submitted/check signal means this older active row is no longer the current cycle. */
export function isSupersededBySelfTestSubmission(
  request: unknown,
  submittedTimes: number[]
): boolean {
  if (!request || typeof request !== "object") return false;
  const requestTime = toTime((request as Record<string, unknown>).created_at);
  if (requestTime === null) return false;
  return submittedTimes.some((submittedTime) => submittedTime >= requestTime);
}


/** Anything that looks like a submitted result should count. */
export function hasSubmittedSelfTestResult(r: unknown): boolean {
  if (!r || typeof r !== "object") return false;
  const row = r as Record<string, unknown>;
  const status = String((row.status as string) ?? "").toLowerCase();
  const submitted =
    SUBMITTED_STATUSES.has(status) ||
    !!row.result_submitted_at ||
    !!row.result_photo_url ||
    !!(row as { result_image_url?: unknown }).result_image_url ||
    !!row.test_result ||
    !!row.self_reported_result;

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug("[selftest] hasSubmittedSelfTestResult", {
      id: row.id,
      status,
      has_result_ts: !!row.result_submitted_at,
      has_photo: !!row.result_photo_url,
      has_test_result: !!row.test_result,
      has_self_reported: !!row.self_reported_result,
      decided: submitted,
    });
  }
  return submitted;
}

/** True only for a real pre-result stage with no submitted evidence. */
export function isActiveUnsubmittedSelfTestRequest(r: unknown): boolean {
  if (!r || typeof r !== "object") return false;
  if (hasSubmittedSelfTestResult(r)) return false;
  const row = r as Record<string, unknown>;
  const status = String((row.status as string) ?? "").toLowerCase();
  return ACTIVE_PRE_RESULT_STATUSES.has(status);
}
