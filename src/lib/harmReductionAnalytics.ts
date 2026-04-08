import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

type AnalyticsRow = Record<string, any>;
type SourceKind = 'tracked' | 'legacy' | 'mixed';

export interface HrFilters {
  dateFrom: string;
  dateTo: string;
  pagePath?: string;
  deviceType?: string;
  language?: string;
  serviceDestination?: string;
}

export interface HrKpis {
  totalPageViews: number;
  uniqueSessions: number;
  engagedReaders: number;
  engagementRate: number;
  totalCtaClicks: number;
  totalOutboundClicks: number;
  serviceStarts: number;
  completedConversions: number;
  conversionRate: number;
}

export interface HrPageRow {
  page_path: string;
  views: number;
  sessions: number;
  trackedViews: number;
  legacyViews: number;
}

export interface HrCtaRow {
  event_type: string;
  cta_label: string;
  cta_position: string;
  target_path: string;
  content_section: string;
  clicks: number;
  trackedClicks: number;
  legacyClicks: number;
}

export interface HrDestRow {
  target: string;
  clicks: number;
  starts: number;
  completed: number;
  rate: number;
  trackedStarts: number;
  legacyEstimatedStarts: number;
  trackedCompleted: number;
  legacyEstimatedCompleted: number;
}

export interface HrScrollDist {
  depth: string;
  count: number;
  pct: number;
}

export interface HrFunnelStep {
  label: string;
  value: number;
}

export interface HrInsight {
  severity: 'success' | 'warning' | 'info';
  title: string;
  description: string;
}

export interface HrTrendRow {
  period: string;
  pageViews: number;
  sessions: number;
  engagedReaders: number;
  trackedViews: number;
  legacyViews: number;
  source: SourceKind;
}

export interface HrDataSources {
  hasLegacyBackfill: boolean;
  trackedPageViews: number;
  legacyPageViews: number;
  trackedSessions: number;
  legacySessions: number;
  trackedServiceStarts: number;
  legacyEstimatedStarts: number;
  trackedCompletedConversions: number;
  legacyEstimatedCompletedConversions: number;
  firstAccessAt: string | null;
  lastAccessAt: string | null;
}

export interface HrAnalyticsData {
  kpis: HrKpis;
  pages: HrPageRow[];
  ctas: HrCtaRow[];
  destinations: HrDestRow[];
  scrollDist: HrScrollDist[];
  funnel: HrFunnelStep[];
  insights: HrInsight[];
  trend: HrTrendRow[];
  dataSources: HrDataSources;
  rawEvents: any[];
}

const HR_PAGE_EVENTS = ['page_view_harm_reduction'];
const HR_ENGAGE_EVENTS = ['harm_reduction_engaged_read'];
const HR_SCROLL_EVENTS = [
  'harm_reduction_25_scroll',
  'harm_reduction_50_scroll',
  'harm_reduction_75_scroll',
  'harm_reduction_100_scroll',
];
const HR_CTA_EVENTS = [
  'harm_reduction_cta_booking_click',
  'harm_reduction_cta_selftest_click',
  'harm_reduction_cta_support_click',
  'harm_reduction_cta_hotline_click',
  'harm_reduction_cta_map_click',
  'harm_reduction_content_expand',
];
const HR_OUTBOUND = ['harm_reduction_outbound_click'];

const SERVICE_START_EVENTS = ['booking_started', 'selftest_started', 'support_chat_started'];
const SERVICE_COMPLETE_EVENTS = ['booking_submitted', 'selftest_submitted', 'support_chat_submitted'];

const TRACKED_HR_EVENTS = [
  ...HR_PAGE_EVENTS,
  ...HR_ENGAGE_EVENTS,
  ...HR_SCROLL_EVENTS,
  ...HR_CTA_EVENTS,
  ...HR_OUTBOUND,
];

const LEGACY_ENGAGE_EVENTS = [
  'hr_section_enter',
  'hr_learn_tab',
  'hr_combo_check',
  'hr_screening_completed',
  'hr_matrix_view',
  'hr_combo_view',
  'hr_ai_usage',
  'hr_daily_checkin',
  'hr_plan_saved',
  'hr_scenario_selected',
  'hr_distress_action',
  'substance_view',
  'factsheet_export',
  'hr_demographic_saved',
];

const LEGACY_CTA_EVENTS = [
  'hr_cta_click',
  'hr_pathway_click',
  'hr_quick_action',
  'hr_combo_support_click',
  'hr_support_pathway',
];

const LEGACY_COMPLETE_EVENTS = ['hr_support_submitted'];
const LEGACY_ALL_EVENTS = [...LEGACY_ENGAGE_EVENTS, ...LEGACY_CTA_EVENTS, ...LEGACY_COMPLETE_EVENTS];

function metaOf(row: AnalyticsRow): Record<string, any> {
  return (row?.metadata ?? {}) as Record<string, any>;
}

function dayKey(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  return format(new Date(dateStr), 'yyyy-MM-dd');
}

function pagePathOf(row: AnalyticsRow): string {
  return row.page_path || '/harm-reduction';
}

function sessionKeyOf(row: AnalyticsRow): string {
  return String(
    row.session_id || row.anonymous_id || row.user_id || `${pagePathOf(row)}:${dayKey(row.created_at)}:${row.id || row.created_at}`,
  );
}

function countUniqueSessions(rows: AnalyticsRow[]): number {
  return new Set(rows.map(sessionKeyOf)).size;
}

function sourceKind(tracked: number, legacy: number): SourceKind {
  if (tracked > 0 && legacy > 0) return 'mixed';
  if (tracked > 0) return 'tracked';
  return 'legacy';
}

function normalizeLabel(value: unknown, fallback: string): string {
  const v = String(value || fallback).replace(/_/g, ' ').trim();
  return v.length > 0 ? v : fallback;
}

function mapLegacyTarget(row: AnalyticsRow) {
  const meta = metaOf(row);
  const raw = `${row.event_type} ${meta.action || ''} ${meta.pathway || ''} ${meta.section || ''} ${meta.type || ''}`.toLowerCase();

  let target = 'other';
  if (raw.includes('clinic') || raw.includes('booking')) target = 'booking';
  else if (raw.includes('kit') || raw.includes('selftest') || raw.includes('self-test') || raw.includes('hiv test')) target = 'selftest';
  else if (raw.includes('counselor') || raw.includes('support')) target = 'support';
  else if (raw.includes('hotline')) target = 'hotline';
  else if (raw.includes('learn')) target = 'learn';
  else if (raw.includes('plan')) target = 'plan';
  else if (raw.includes('check') || raw.includes('screen')) target = 'screening';

  const targetPath = target === 'booking'
    ? '/booking'
    : target === 'selftest'
      ? '/self-test'
      : target === 'support'
        ? '/support-chat'
        : target === 'hotline'
          ? 'hotline'
          : '/harm-reduction';

  const ctaPosition = row.event_type === 'hr_quick_action'
    ? 'quick-action'
    : row.event_type === 'hr_pathway_click'
      ? 'pathway'
      : row.event_type === 'hr_combo_support_click'
        ? 'combo'
        : row.event_type === 'hr_support_pathway'
          ? 'support-pathway'
          : 'hub';

  const ctaLabel = normalizeLabel(
    meta.cta_label || meta.action || meta.pathway || meta.section,
    target === 'booking'
      ? 'Booking'
      : target === 'selftest'
        ? 'Self-test'
        : target === 'support'
          ? 'Support'
          : target === 'hotline'
            ? 'Hotline'
            : target === 'learn'
              ? 'Learn'
              : target === 'plan'
                ? 'Plan'
                : target === 'screening'
                  ? 'Screening'
                  : row.event_type,
  );

  return {
    target,
    targetPath,
    ctaPosition,
    ctaLabel,
    contentSection: normalizeLabel(meta.content_section || meta.section || meta.pathway || meta.action, '-'),
  };
}

function isMeaningfulLegacyEngagement(row: AnalyticsRow): boolean {
  return LEGACY_ENGAGE_EVENTS.includes(row.event_type) || LEGACY_CTA_EVENTS.includes(row.event_type) || LEGACY_COMPLETE_EVENTS.includes(row.event_type);
}

function isServiceIntentTarget(target: string): boolean {
  return ['booking', 'selftest', 'support'].includes(target);
}

function matchesCommonFilters(row: AnalyticsRow, filters: HrFilters): boolean {
  const meta = metaOf(row);
  const rowPage = pagePathOf(row);
  const rowLanguage = String(meta.language || meta.lang || '').trim();

  if (filters.pagePath && rowPage !== filters.pagePath) return false;
  if (filters.deviceType && row.device_type !== filters.deviceType) return false;
  if (filters.language && rowLanguage && rowLanguage !== filters.language) return false;
  return true;
}

function addGroupedCount<T extends { trackedClicks?: number; legacyClicks?: number }>(
  map: Map<string, T>,
  key: string,
  build: () => T,
  source: 'tracked' | 'legacy',
) {
  if (!map.has(key)) map.set(key, build());
  const entry = map.get(key)!;
  if (source === 'tracked') {
    entry.trackedClicks = (entry.trackedClicks || 0) + 1;
  } else {
    entry.legacyClicks = (entry.legacyClicks || 0) + 1;
  }
}

function uniqueBy<T>(rows: T[], getKey: (row: T) => string): T[] {
  const map = new Map<string, T>();
  rows.forEach((row) => map.set(getKey(row), row));
  return Array.from(map.values());
}

function normalizeLegacyEventName(row: AnalyticsRow): string {
  if (row.event_type === 'pageview') return 'page_view_harm_reduction';
  if (LEGACY_CTA_EVENTS.includes(row.event_type)) return 'harm_reduction_legacy_click';
  if (LEGACY_COMPLETE_EVENTS.includes(row.event_type)) return 'support_chat_submitted';
  return 'harm_reduction_legacy_engagement';
}

export async function fetchHrAnalytics(filters: HrFilters): Promise<HrAnalyticsData> {
  const { dateFrom, dateTo } = filters;

  const [
    trackedStartRes,
    trackedEventsRes,
    trackedServiceRes,
    legacyPageRes,
    legacyEventsRes,
    firstLegacyPageRes,
    firstLegacyEventRes,
  ] = await Promise.all([
    supabase
      .from('analytics_events')
      .select('created_at')
      .eq('event_type', 'page_view_harm_reduction')
      .order('created_at', { ascending: true })
      .limit(1),
    supabase
      .from('analytics_events')
      .select('*')
      .in('event_type', TRACKED_HR_EVENTS)
      .gte('created_at', `${dateFrom}T00:00:00`)
      .lte('created_at', `${dateTo}T23:59:59`)
      .order('created_at', { ascending: false })
      .limit(5000),
    supabase
      .from('analytics_events')
      .select('*')
      .in('event_type', [...SERVICE_START_EVENTS, ...SERVICE_COMPLETE_EVENTS])
      .gte('created_at', `${dateFrom}T00:00:00`)
      .lte('created_at', `${dateTo}T23:59:59`)
      .order('created_at', { ascending: false })
      .limit(5000),
    supabase
      .from('analytics_events')
      .select('*')
      .eq('event_type', 'pageview')
      .ilike('page_path', '/harm-reduction%')
      .gte('created_at', `${dateFrom}T00:00:00`)
      .lte('created_at', `${dateTo}T23:59:59`)
      .order('created_at', { ascending: false })
      .limit(5000),
    supabase
      .from('analytics_events')
      .select('*')
      .in('event_type', LEGACY_ALL_EVENTS)
      .gte('created_at', `${dateFrom}T00:00:00`)
      .lte('created_at', `${dateTo}T23:59:59`)
      .order('created_at', { ascending: false })
      .limit(5000),
    supabase
      .from('analytics_events')
      .select('created_at')
      .eq('event_type', 'pageview')
      .ilike('page_path', '/harm-reduction%')
      .order('created_at', { ascending: true })
      .limit(1),
    supabase
      .from('analytics_events')
      .select('created_at')
      .in('event_type', LEGACY_ALL_EVENTS)
      .order('created_at', { ascending: true })
      .limit(1),
  ]);

  const trackedStartAt = (trackedStartRes.data?.[0] as AnalyticsRow | undefined)?.created_at || null;
  const trackedStartMs = trackedStartAt ? new Date(trackedStartAt).getTime() : null;

  const trackedEvents = ((trackedEventsRes.data ?? []) as AnalyticsRow[]).filter((row) => matchesCommonFilters(row, filters));
  const trackedServiceEvents = ((trackedServiceRes.data ?? []) as AnalyticsRow[])
    .filter((row) => metaOf(row).source_page === '/harm-reduction')
    .filter((row) => matchesCommonFilters(row, filters));

  const trackedPageViews = trackedEvents.filter((row) => HR_PAGE_EVENTS.includes(row.event_type));
  const trackedPageDays = new Set(trackedPageViews.map((row) => dayKey(row.created_at)));
  const trackedDetailDays = new Set(trackedEvents.map((row) => dayKey(row.created_at)));

  const allowLegacyPage = (row: AnalyticsRow) => {
    if (!matchesCommonFilters(row, filters)) return false;
    if (!trackedStartMs) return true;
    const rowMs = new Date(row.created_at).getTime();
    if (rowMs < trackedStartMs) return true;
    return !trackedPageDays.has(dayKey(row.created_at));
  };

  const allowLegacyDetail = (row: AnalyticsRow) => {
    if (!matchesCommonFilters(row, filters)) return false;
    if (!trackedStartMs) return true;
    const rowMs = new Date(row.created_at).getTime();
    if (rowMs < trackedStartMs) return true;
    return !trackedDetailDays.has(dayKey(row.created_at));
  };

  const legacyPageViews = ((legacyPageRes.data ?? []) as AnalyticsRow[]).filter(allowLegacyPage);
  const legacyEvents = ((legacyEventsRes.data ?? []) as AnalyticsRow[]).filter(allowLegacyDetail);

  const trackedEngaged = trackedEvents.filter((row) => HR_ENGAGE_EVENTS.includes(row.event_type));
  const trackedCtas = trackedEvents.filter((row) => HR_CTA_EVENTS.includes(row.event_type));
  const trackedOutbound = trackedEvents.filter((row) => HR_OUTBOUND.includes(row.event_type));
  const trackedScrolls = trackedEvents.filter((row) => HR_SCROLL_EVENTS.includes(row.event_type));

  const legacyEngaged = legacyEvents.filter(isMeaningfulLegacyEngagement);
  const legacyCtas = legacyEvents.filter((row) => LEGACY_CTA_EVENTS.includes(row.event_type));
  const legacyCompletesRaw = legacyEvents.filter((row) => LEGACY_COMPLETE_EVENTS.includes(row.event_type));

  const trackedStarts = trackedServiceEvents.filter((row) => SERVICE_START_EVENTS.includes(row.event_type));
  const trackedCompletes = trackedServiceEvents.filter((row) => SERVICE_COMPLETE_EVENTS.includes(row.event_type));

  const legacyEstimatedStarts = uniqueBy(
    legacyCtas.filter((row) => isServiceIntentTarget(mapLegacyTarget(row).target)),
    (row) => `${sessionKeyOf(row)}:${mapLegacyTarget(row).target}:${dayKey(row.created_at)}`,
  );

  const legacyEstimatedCompletes = uniqueBy(
    legacyCompletesRaw,
    (row) => `${sessionKeyOf(row)}:${row.event_type}:${dayKey(row.created_at)}`,
  );

  const combinedPageViews = [...trackedPageViews, ...legacyPageViews];
  const reachSessionRows = combinedPageViews.length > 0 ? combinedPageViews : [...trackedEngaged, ...legacyEngaged];
  const engagedSessionRows = [...trackedEngaged, ...legacyEngaged];

  const trackedSessions = countUniqueSessions(trackedPageViews.length > 0 ? trackedPageViews : trackedEngaged);
  const legacySessions = countUniqueSessions(legacyPageViews.length > 0 ? legacyPageViews : legacyEngaged);
  const uniqueSessions = countUniqueSessions(reachSessionRows);
  const engagedReaders = countUniqueSessions(engagedSessionRows);

  const kpis: HrKpis = {
    totalPageViews: combinedPageViews.length,
    uniqueSessions,
    engagedReaders,
    engagementRate: uniqueSessions > 0 ? Math.round((engagedReaders / uniqueSessions) * 100) : 0,
    totalCtaClicks: trackedCtas.length + legacyCtas.length,
    totalOutboundClicks: trackedOutbound.length,
    serviceStarts: trackedStarts.length + legacyEstimatedStarts.length,
    completedConversions: trackedCompletes.length + legacyEstimatedCompletes.length,
    conversionRate: combinedPageViews.length > 0 ? Math.round(((trackedCompletes.length + legacyEstimatedCompletes.length) / combinedPageViews.length) * 100) : 0,
  };

  const pageMap = new Map<string, { views: number; sessions: Set<string>; trackedViews: number; legacyViews: number }>();
  trackedPageViews.forEach((row) => {
    const key = pagePathOf(row);
    if (!pageMap.has(key)) pageMap.set(key, { views: 0, sessions: new Set(), trackedViews: 0, legacyViews: 0 });
    const entry = pageMap.get(key)!;
    entry.views += 1;
    entry.trackedViews += 1;
    entry.sessions.add(sessionKeyOf(row));
  });
  legacyPageViews.forEach((row) => {
    const key = pagePathOf(row);
    if (!pageMap.has(key)) pageMap.set(key, { views: 0, sessions: new Set(), trackedViews: 0, legacyViews: 0 });
    const entry = pageMap.get(key)!;
    entry.views += 1;
    entry.legacyViews += 1;
    entry.sessions.add(sessionKeyOf(row));
  });

  const pages: HrPageRow[] = Array.from(pageMap.entries())
    .map(([page_path, value]) => ({
      page_path,
      views: value.views,
      sessions: value.sessions.size,
      trackedViews: value.trackedViews,
      legacyViews: value.legacyViews,
    }))
    .sort((a, b) => b.views - a.views);

  const ctaMap = new Map<string, HrCtaRow>();
  trackedCtas.forEach((row) => {
    const meta = metaOf(row);
    const label = normalizeLabel(meta.cta_label, row.event_type.replace('harm_reduction_cta_', '').replace('_click', ''));
    const position = normalizeLabel(meta.cta_position, '-');
    const target = normalizeLabel(meta.target_path, '-');
    const contentSection = normalizeLabel(meta.content_section, '-');
    const key = `${label}|${position}|${target}|${contentSection}`;
    addGroupedCount(ctaMap, key, () => ({
      event_type: row.event_type,
      cta_label: label,
      cta_position: position,
      target_path: target,
      content_section: contentSection,
      clicks: 0,
      trackedClicks: 0,
      legacyClicks: 0,
    }), 'tracked');
    ctaMap.get(key)!.clicks += 1;
  });

  legacyCtas.forEach((row) => {
    const mapped = mapLegacyTarget(row);
    const key = `${mapped.ctaLabel}|${mapped.ctaPosition}|${mapped.targetPath}|${mapped.contentSection}`;
    addGroupedCount(ctaMap, key, () => ({
      event_type: row.event_type,
      cta_label: mapped.ctaLabel,
      cta_position: mapped.ctaPosition,
      target_path: mapped.targetPath,
      content_section: mapped.contentSection,
      clicks: 0,
      trackedClicks: 0,
      legacyClicks: 0,
    }), 'legacy');
    ctaMap.get(key)!.clicks += 1;
  });

  const ctas = Array.from(ctaMap.values()).sort((a, b) => b.clicks - a.clicks);

  const destinationTypes = ['booking', 'selftest', 'support', 'hotline'];
  const destinations: HrDestRow[] = destinationTypes.map((target) => {
    const trackedStartsCount = trackedStarts.filter((row) => row.event_type.includes(target)).length;
    const trackedCompletedCount = trackedCompletes.filter((row) => row.event_type.includes(target)).length;
    const legacyStartsCount = legacyEstimatedStarts.filter((row) => mapLegacyTarget(row).target === target).length;
    const legacyCompletedCount = legacyEstimatedCompletes.filter((row) => mapLegacyTarget(row).target === target || target === 'support').length;
    const clicks = ctas
      .filter((row) => row.target_path === (target === 'booking' ? '/booking' : target === 'selftest' ? '/self-test' : target === 'support' ? '/support-chat' : 'hotline'))
      .reduce((sum, row) => sum + row.clicks, 0);
    const starts = trackedStartsCount + legacyStartsCount;
    const completed = trackedCompletedCount + legacyCompletedCount;
    return {
      target,
      clicks,
      starts,
      completed,
      rate: starts > 0 ? Math.round((completed / starts) * 100) : 0,
      trackedStarts: trackedStartsCount,
      legacyEstimatedStarts: legacyStartsCount,
      trackedCompleted: trackedCompletedCount,
      legacyEstimatedCompleted: legacyCompletedCount,
    };
  });

  const scrollLabels = ['25%', '50%', '75%', '100%'];
  const scrollDist: HrScrollDist[] = scrollLabels.map((depth, index) => {
    const count = trackedScrolls.filter((row) => row.event_type === HR_SCROLL_EVENTS[index]).length;
    return {
      depth,
      count,
      pct: trackedPageViews.length > 0 ? Math.round((count / trackedPageViews.length) * 100) : 0,
    };
  });

  const funnel: HrFunnelStep[] = [
    { label: 'Page Views', value: kpis.totalPageViews },
    { label: 'Engaged Reads', value: engagedReaders },
    { label: 'CTA Clicks', value: kpis.totalCtaClicks },
    { label: 'Service Starts', value: kpis.serviceStarts },
    { label: 'Completed', value: kpis.completedConversions },
  ];

  const trendMap = new Map<string, { trackedViews: number; legacyViews: number; sessionKeys: Set<string>; engagedKeys: Set<string> }>();
  const ensureTrend = (period: string) => {
    if (!trendMap.has(period)) trendMap.set(period, { trackedViews: 0, legacyViews: 0, sessionKeys: new Set(), engagedKeys: new Set() });
    return trendMap.get(period)!;
  };

  trackedPageViews.forEach((row) => {
    const period = dayKey(row.created_at);
    const entry = ensureTrend(period);
    entry.trackedViews += 1;
    entry.sessionKeys.add(sessionKeyOf(row));
  });
  legacyPageViews.forEach((row) => {
    const period = dayKey(row.created_at);
    const entry = ensureTrend(period);
    entry.legacyViews += 1;
    entry.sessionKeys.add(sessionKeyOf(row));
  });
  [...trackedEngaged, ...legacyEngaged].forEach((row) => {
    const period = dayKey(row.created_at);
    const entry = ensureTrend(period);
    entry.engagedKeys.add(sessionKeyOf(row));
  });

  const trend: HrTrendRow[] = Array.from(trendMap.entries())
    .map(([period, entry]) => ({
      period,
      pageViews: entry.trackedViews + entry.legacyViews,
      sessions: entry.sessionKeys.size,
      engagedReaders: entry.engagedKeys.size,
      trackedViews: entry.trackedViews,
      legacyViews: entry.legacyViews,
      source: sourceKind(entry.trackedViews, entry.legacyViews),
    }))
    .sort((a, b) => b.period.localeCompare(a.period));

  const firstDates = [
    trackedStartAt,
    (firstLegacyPageRes.data?.[0] as AnalyticsRow | undefined)?.created_at || null,
    (firstLegacyEventRes.data?.[0] as AnalyticsRow | undefined)?.created_at || null,
  ].filter(Boolean) as string[];

  const accessDates = [...combinedPageViews, ...legacyEvents, ...trackedEvents]
    .map((row) => row.created_at)
    .filter(Boolean)
    .sort();
  const lastAccessAt = accessDates.length > 0 ? accessDates[accessDates.length - 1] : null;

  const dataSources: HrDataSources = {
    hasLegacyBackfill: legacyPageViews.length > 0 || legacyEvents.length > 0,
    trackedPageViews: trackedPageViews.length,
    legacyPageViews: legacyPageViews.length,
    trackedSessions,
    legacySessions,
    trackedServiceStarts: trackedStarts.length,
    legacyEstimatedStarts: legacyEstimatedStarts.length,
    trackedCompletedConversions: trackedCompletes.length,
    legacyEstimatedCompletedConversions: legacyEstimatedCompletes.length,
    firstAccessAt: firstDates.length > 0 ? firstDates.sort()[0] : null,
    lastAccessAt,
  };

  const insights: HrInsight[] = [];
  if (dataSources.hasLegacyBackfill) {
    insights.push({
      severity: 'info',
      title: 'รวมข้อมูลจากระบบเดิมแล้ว',
      description: `เพิ่ม historical backfill ${dataSources.legacyPageViews} page views เพื่อให้รายงานสะท้อนการใช้งานก่อนมี analytics tracking`,
    });
  }
  if (pages.length > 0) {
    insights.push({
      severity: 'info',
      title: 'หน้าที่มีคนเข้ามามากที่สุด',
      description: `${pages[0].page_path} มี ${pages[0].views} views`,
    });
  }
  if (ctas.length > 0) {
    insights.push({
      severity: 'info',
      title: 'CTA ที่ทำงานดีที่สุด',
      description: `${ctas[0].cta_label} ถูกคลิก ${ctas[0].clicks} ครั้ง`,
    });
  }
  const topDestination = [...destinations].sort((a, b) => b.starts - a.starts)[0];
  if (topDestination && topDestination.starts > 0) {
    insights.push({
      severity: 'success',
      title: 'เส้นทางบริการที่เด่นที่สุด',
      description: `${topDestination.target} มี ${topDestination.starts} starts และ ${topDestination.completed} completed`,
    });
  }
  if (kpis.serviceStarts > 0 && kpis.completedConversions / Math.max(kpis.serviceStarts, 1) < 0.5) {
    insights.push({
      severity: 'warning',
      title: 'มี drop-off หลังคลิกเข้าสู่บริการ',
      description: `เริ่มบริการ ${kpis.serviceStarts} ครั้ง แต่จบเพียง ${kpis.completedConversions} ครั้ง`,
    });
  }
  if (kpis.engagementRate >= 50) {
    insights.push({
      severity: 'success',
      title: 'Engagement แข็งแรง',
      description: `${kpis.engagementRate}% ของ sessions มีการอ่านหรือโต้ตอบกับเนื้อหา`,
    });
  }
  if (kpis.totalCtaClicks > 0 && kpis.serviceStarts === 0) {
    insights.push({
      severity: 'warning',
      title: 'มีความสนใจแต่ยังไม่ไปต่อ',
      description: 'มี CTA clicks แล้ว แต่ยังไม่เห็น service start — ควรตรวจสอบหน้าปลายทางหรือข้อความนำทาง',
    });
  }

  const trackedRawEvents: any[] = [...trackedEvents, ...trackedServiceEvents].map((row: any) => ({
    ...(row || {}),
    data_source: 'tracked',
    normalized_event_name: row.event_type,
  }));

  const legacyRawEvents: any[] = [...legacyPageViews, ...legacyEvents].map((row: any) => ({
    ...(row || {}),
    data_source: 'legacy',
    normalized_event_name: normalizeLegacyEventName(row),
    metadata: {
      ...metaOf(row),
      source_page: metaOf(row).source_page || '/harm-reduction',
      target_path: metaOf(row).target_path || mapLegacyTarget(row).targetPath,
      cta_position: metaOf(row).cta_position || mapLegacyTarget(row).ctaPosition,
      cta_label: metaOf(row).cta_label || mapLegacyTarget(row).ctaLabel,
      content_section: metaOf(row).content_section || mapLegacyTarget(row).contentSection,
    },
  }));

  const rawEvents: any[] = [...trackedRawEvents, ...legacyRawEvents].sort((a: any, b: any) => String(b.created_at || '').localeCompare(String(a.created_at || '')));


  return {
    kpis,
    pages,
    ctas,
    destinations,
    scrollDist,
    funnel,
    insights,
    trend,
    dataSources,
    rawEvents,
  };
}

export function hrEventsToCsvRows(events: any[]) {
  return events.map((row: any) => {
    const meta = metaOf(row);
    return {
      date: row.created_at ? format(new Date(row.created_at), 'yyyy-MM-dd') : '',
      timestamp: row.created_at || '',
      page_path: pagePathOf(row),
      event_name: row.event_type || '',
      normalized_event_name: row.normalized_event_name || row.event_type || '',
      data_source: row.data_source || 'tracked',
      session_id: row.session_id || '',
      source_page: meta.source_page || (pagePathOf(row).startsWith('/harm-reduction') ? '/harm-reduction' : ''),
      cta_label: meta.cta_label || '',
      cta_position: meta.cta_position || '',
      target_path: meta.target_path || '',
      content_section: meta.content_section || meta.section || meta.pathway || '',
      device_type: row.device_type || '',
      language: meta.language || meta.lang || '',
    };
  });
}

export const HR_CSV_COLUMNS = [
  { key: 'date', header: 'Date' },
  { key: 'timestamp', header: 'Timestamp' },
  { key: 'page_path', header: 'Page Path' },
  { key: 'event_name', header: 'Event Name' },
  { key: 'normalized_event_name', header: 'Normalized Event' },
  { key: 'data_source', header: 'Data Source' },
  { key: 'session_id', header: 'Session ID' },
  { key: 'source_page', header: 'Source Page' },
  { key: 'cta_label', header: 'CTA Label' },
  { key: 'cta_position', header: 'CTA Position' },
  { key: 'target_path', header: 'Target Path' },
  { key: 'content_section', header: 'Content Section' },
  { key: 'device_type', header: 'Device Type' },
  { key: 'language', header: 'Language' },
];
