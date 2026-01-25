// Route prefetch mapping - maps paths to their lazy import functions
const routeImports: Record<string, () => Promise<unknown>> = {
  '/': () => import('@/pages/Home'),
  '/auth': () => import('@/pages/Auth'),
  '/dashboard': () => import('@/pages/Dashboard'),
  '/self-care': () => import('@/pages/SelfCare'),
  '/info': () => import('@/pages/Info'),
  '/settings': () => import('@/pages/Settings'),
  '/onboarding': () => import('@/pages/Onboarding'),
  '/consent': () => import('@/pages/Consent'),
  '/setup/prep-daily': () => import('@/pages/SetupPrepDaily'),
  '/setup/prep-ondemand': () => import('@/pages/SetupPrepOnDemand'),
  '/pep': () => import('@/pages/PEPEmergency'),
  '/pep-tracker': () => import('@/pages/PEPTracker'),
  '/progress': () => import('@/pages/Progress'),
  '/swing': () => import('@/pages/Swing'),
  '/community': () => import('@/pages/Community'),
  '/hiv-selftest': () => import('@/pages/HIVSelfTest'),
  '/quests': () => import('@/pages/Quests'),
  '/leaderboard': () => import('@/pages/Leaderboard'),
  '/share-achievements': () => import('@/pages/ShareAchievements'),
  '/surveys': () => import('@/pages/Surveys'),
  '/health-profile': () => import('@/pages/HealthProfile'),
  '/consultation': () => import('@/pages/ConsultationForm'),
  '/admin': () => import('@/pages/Admin'),
  '/track-order': () => import('@/pages/TrackOrder'),
  '/personal-info': () => import('@/pages/PersonalInfo'),
  '/avatar': () => import('@/pages/AvatarCustomization'),
  '/medication-tracker': () => import('@/pages/MedicationTracker'),
  '/install': () => import('@/pages/Install'),
  '/info/write': () => import('@/pages/WriteArticle'),
};

// Cache to track which routes have been prefetched
const prefetchedRoutes = new Set<string>();

/**
 * Prefetch a route's code chunk
 * @param path - The route path to prefetch
 */
export function prefetchRoute(path: string): void {
  // Skip if already prefetched
  if (prefetchedRoutes.has(path)) return;

  const importFn = routeImports[path];
  if (importFn) {
    prefetchedRoutes.add(path);
    // Use requestIdleCallback for non-blocking prefetch, fallback to setTimeout
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => {
        importFn().catch(() => {
          // Remove from cache if prefetch fails so it can retry
          prefetchedRoutes.delete(path);
        });
      });
    } else {
      setTimeout(() => {
        importFn().catch(() => {
          prefetchedRoutes.delete(path);
        });
      }, 100);
    }
  }
}

/**
 * Check if a route has been prefetched
 * @param path - The route path to check
 */
export function isRoutePrefetched(path: string): boolean {
  return prefetchedRoutes.has(path);
}
