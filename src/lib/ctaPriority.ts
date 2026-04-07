const VISIT_COUNT_KEY = 'testd_visit_count';
const ACTION_TAKEN_KEY = 'testd_action_taken';
const VIRTUAL_FLAG = 'testd_from_virtual';
const INFO_FLAG = 'testd_viewed_info';

const INFO_PATHS = ['/learn', '/harm-reduction', '/prevention-match', '/quiz', '/knowledge'];

export type CtaPriority = 'booking' | 'selftest' | 'support';

export function recordPageSignal(path: string): void {
  // Increment visit count
  const count = parseInt(localStorage.getItem(VISIT_COUNT_KEY) || '0', 10);
  localStorage.setItem(VISIT_COUNT_KEY, String(count + 1));

  // Virtual signal
  if (path.startsWith('/virtual')) {
    sessionStorage.setItem(VIRTUAL_FLAG, '1');
  }

  // Info page signal
  if (INFO_PATHS.some(p => path.startsWith(p))) {
    sessionStorage.setItem(INFO_FLAG, '1');
  }
}

export function markActionTaken(): void {
  sessionStorage.setItem(ACTION_TAKEN_KEY, '1');
}

export function getCtaPriority(): CtaPriority {
  // 1. Came from virtual stories → booking
  if (sessionStorage.getItem(VIRTUAL_FLAG) === '1') return 'booking';

  // 2. Viewed info pages → selftest
  if (sessionStorage.getItem(INFO_FLAG) === '1') return 'selftest';

  // 3. Multiple visits, no action → support
  const visits = parseInt(localStorage.getItem(VISIT_COUNT_KEY) || '0', 10);
  const actionTaken = sessionStorage.getItem(ACTION_TAKEN_KEY) === '1';
  if (visits >= 3 && !actionTaken) return 'support';

  // Default
  return 'selftest';
}

export function getOrderedActions<T extends { path: string }>(actions: T[]): T[] {
  const priority = getCtaPriority();
  const pathMap: Record<CtaPriority, string> = {
    booking: '/booking',
    selftest: '/hiv-selftest',
    support: '/support-chat',
  };
  const targetPath = pathMap[priority];
  const prioritized = actions.find(a => a.path === targetPath);
  if (!prioritized) return actions;
  return [prioritized, ...actions.filter(a => a.path !== targetPath)];
}
