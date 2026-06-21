/**
 * cacheResetLog
 *
 * Lightweight, fire-and-forget logger for cache reset / forced reload telemetry.
 * Writes directly to the public `cache_reset_events` table via PostgREST so it
 * works during unload (`keepalive: true`) and without bundling extra deps.
 */

import { APP_VERSION } from "@/config/appVersion";
import { getVisitorId } from "@/lib/visitorId";

export type CacheResetTrigger =
  | "force_guard"
  | "version_check"
  | "manual"
  | "stuck_retry";

export type CacheResetStage =
  | "started"
  | "service_worker_reset"
  | "caches_cleared"
  | "storage_cleared"
  | "completed"
  | "reload_triggered"
  | "reload_succeeded"
  | "failed"
  | "gave_up";

export interface CacheResetEventInput {
  trigger: CacheResetTrigger;
  stage: CacheResetStage;
  to_version?: string | null;
  from_version?: string | null;
  success?: boolean | null;
  duration_ms?: number | null;
  attempt?: number | null;
  error?: string | null;
  metadata?: Record<string, unknown> | null;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const PENDING_RELOAD_KEY = "testd_cache_reset_pending_reload";

function safeVisitorId(): string | null {
  try {
    return getVisitorId();
  } catch {
    return null;
  }
}

export function logCacheResetEvent(input: CacheResetEventInput): void {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;

  const payload = {
    anonymous_id: safeVisitorId(),
    user_id: null,
    from_version: input.from_version ?? APP_VERSION,
    to_version: input.to_version ?? APP_VERSION,
    trigger: input.trigger,
    stage: input.stage,
    success: input.success ?? null,
    duration_ms: input.duration_ms ?? null,
    attempt: input.attempt ?? 1,
    error: input.error ?? null,
    user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : null,
    hostname: typeof window !== "undefined" ? window.location.hostname : null,
    path: typeof window !== "undefined"
      ? `${window.location.pathname}${window.location.search}`.slice(0, 500)
      : null,
    metadata: input.metadata ?? null,
  };

  try {
    fetch(`${SUPABASE_URL}/rest/v1/cache_reset_events`, {
      method: "POST",
      keepalive: true,
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify(payload),
    }).catch(() => {});
  } catch {
    // Never let logging break the reset flow.
  }
}

/**
 * Mark that a reload is about to happen so the next page load can confirm
 * the user came back successfully on the target version.
 */
export function markReloadPending(
  trigger: CacheResetTrigger,
  toVersion: string,
  attempt = 1,
): void {
  try {
    sessionStorage.setItem(
      PENDING_RELOAD_KEY,
      JSON.stringify({
        trigger,
        to_version: toVersion,
        from_version: APP_VERSION,
        attempt,
        started_at: Date.now(),
      }),
    );
  } catch {}
}

/**
 * On app boot, if a pending reload exists, log whether it succeeded
 * (running bundle matches the requested version) or failed (mismatch).
 */
export function consumePendingReload(): void {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(PENDING_RELOAD_KEY);
  } catch {
    return;
  }
  if (!raw) return;

  try {
    sessionStorage.removeItem(PENDING_RELOAD_KEY);
  } catch {}

  let parsed: {
    trigger?: CacheResetTrigger;
    to_version?: string;
    from_version?: string;
    attempt?: number;
    started_at?: number;
  } = {};
  try {
    parsed = JSON.parse(raw);
  } catch {
    return;
  }

  const trigger = parsed.trigger ?? "force_guard";
  const target = parsed.to_version ?? APP_VERSION;
  const duration =
    typeof parsed.started_at === "number" ? Date.now() - parsed.started_at : null;
  const success = target === APP_VERSION;

  logCacheResetEvent({
    trigger,
    stage: success ? "reload_succeeded" : "failed",
    to_version: target,
    from_version: parsed.from_version ?? APP_VERSION,
    attempt: parsed.attempt ?? 1,
    duration_ms: duration,
    success,
    error: success ? null : `version_mismatch_after_reload (got ${APP_VERSION}, expected ${target})`,
  });
}
