/**
 * MVP heuristic wait-time estimator.
 * Estimates waiting time based on occupancy, capacity, and service mix.
 */

export interface WaitEstimate {
  low: number;   // minutes
  high: number;  // minutes
  label: 'short' | 'medium' | 'long';
}

/** Baseline minutes per service (rough heuristic weights) */
const SERVICE_DURATION_WEIGHTS: Record<string, number> = {
  'hiv-testing': 15,
  'syphilis-testing': 10,
  'hepc-testing': 10,
  'prep-consultation': 20,
  'pep': 25,
  'sti-screening': 15,
  default: 15,
};

/**
 * Estimate wait time for a specific time block or slot.
 */
export function estimateWaitTime(
  occupancyPercent: number,
  counselorCount: number,
  serviceSlugs?: string[],
): WaitEstimate {
  // Base service duration from service mix
  let avgServiceMin = SERVICE_DURATION_WEIGHTS.default;
  if (serviceSlugs && serviceSlugs.length > 0) {
    const total = serviceSlugs.reduce(
      (sum, slug) => sum + (SERVICE_DURATION_WEIGHTS[slug] || SERVICE_DURATION_WEIGHTS.default),
      0,
    );
    avgServiceMin = total / serviceSlugs.length;
  }

  // Occupancy factor: at 0% occ → ~0 wait, at 100% → full queue depth
  const occFactor = Math.max(0, occupancyPercent) / 100;

  // Estimated queue depth per counselor at this occupancy
  const queueDepth = occFactor * 3; // at 100%, ~3 people ahead per counselor

  // Parallelism factor: more counselors = shorter effective wait
  const parallelism = Math.max(1, counselorCount);

  const baseWait = (queueDepth * avgServiceMin) / parallelism;

  // Add variance
  const low = Math.max(0, Math.round(baseWait * 0.6));
  const high = Math.max(low + 5, Math.round(baseWait * 1.4));

  const label: WaitEstimate['label'] =
    high <= 15 ? 'short' : high <= 35 ? 'medium' : 'long';

  return { low, high, label };
}

/**
 * Get display label for wait estimate.
 */
export function getWaitLabel(
  estimate: WaitEstimate,
  language: 'th' | 'en',
): { text: string; color: string } {
  const labels = {
    short: {
      th: 'รอไม่นาน',
      en: 'Short wait',
      color: 'text-emerald-600 dark:text-emerald-400',
    },
    medium: {
      th: 'รอปานกลาง',
      en: 'Medium wait',
      color: 'text-amber-600 dark:text-amber-400',
    },
    long: {
      th: 'รอนาน',
      en: 'Long wait',
      color: 'text-red-600 dark:text-red-400',
    },
  };

  const cfg = labels[estimate.label];
  return {
    text: language === 'th' ? cfg.th : cfg.en,
    color: cfg.color,
  };
}
