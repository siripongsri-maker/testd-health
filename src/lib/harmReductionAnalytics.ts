import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

// ── Types ──

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
}

export interface HrCtaRow {
  event_type: string;
  cta_label: string;
  cta_position: string;
  target_path: string;
  clicks: number;
}

export interface HrDestRow {
  target: string;
  clicks: number;
  starts: number;
  completed: number;
  rate: number;
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

export interface HrAnalyticsData {
  kpis: HrKpis;
  pages: HrPageRow[];
  ctas: HrCtaRow[];
  destinations: HrDestRow[];
  scrollDist: HrScrollDist[];
  funnel: HrFunnelStep[];
  insights: HrInsight[];
  rawEvents: any[];
}

// ── HR event types ──

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

const ALL_HR_EVENTS = [
  ...HR_PAGE_EVENTS, ...HR_ENGAGE_EVENTS, ...HR_SCROLL_EVENTS,
  ...HR_CTA_EVENTS, ...HR_OUTBOUND,
];

// ── Fetch ──

export async function fetchHrAnalytics(filters: HrFilters): Promise<HrAnalyticsData> {
  const { dateFrom, dateTo } = filters;

  // Fetch all HR events
  const { data: hrEvents = [] } = await supabase
    .from('analytics_events')
    .select('*')
    .in('event_type', ALL_HR_EVENTS)
    .gte('created_at', `${dateFrom}T00:00:00`)
    .lte('created_at', `${dateTo}T23:59:59`)
    .order('created_at', { ascending: false })
    .limit(5000) as any;

  // Fetch downstream service events attributed to harm-reduction
  const { data: svcEvents = [] } = await supabase
    .from('analytics_events')
    .select('*')
    .in('event_type', [...SERVICE_START_EVENTS, ...SERVICE_COMPLETE_EVENTS])
    .gte('created_at', `${dateFrom}T00:00:00`)
    .lte('created_at', `${dateTo}T23:59:59`)
    .limit(5000) as any;

  // Filter by source_page in metadata
  const hrServiceEvents = svcEvents.filter((e: any) => {
    const meta = e.metadata as any;
    return meta?.source_page === '/harm-reduction';
  });

  // Apply optional filters
  let filtered = hrEvents;
  if (filters.deviceType) filtered = filtered.filter((e: any) => e.device_type === filters.deviceType);

  // ── KPIs ──
  const pageViews = filtered.filter((e: any) => HR_PAGE_EVENTS.includes(e.event_type));
  const engaged = filtered.filter((e: any) => HR_ENGAGE_EVENTS.includes(e.event_type));
  const ctaClicks = filtered.filter((e: any) => HR_CTA_EVENTS.includes(e.event_type));
  const outbound = filtered.filter((e: any) => HR_OUTBOUND.includes(e.event_type));
  const scrolls = filtered.filter((e: any) => HR_SCROLL_EVENTS.includes(e.event_type));

  const uniqueSessions = new Set(pageViews.map((e: any) => e.session_id)).size;
  const engagedCount = new Set(engaged.map((e: any) => e.session_id)).size;

  const starts = hrServiceEvents.filter((e: any) => SERVICE_START_EVENTS.includes(e.event_type));
  const completes = hrServiceEvents.filter((e: any) => SERVICE_COMPLETE_EVENTS.includes(e.event_type));

  const kpis: HrKpis = {
    totalPageViews: pageViews.length,
    uniqueSessions,
    engagedReaders: engagedCount,
    engagementRate: uniqueSessions > 0 ? Math.round((engagedCount / uniqueSessions) * 100) : 0,
    totalCtaClicks: ctaClicks.length,
    totalOutboundClicks: outbound.length,
    serviceStarts: starts.length,
    completedConversions: completes.length,
    conversionRate: pageViews.length > 0 ? Math.round((completes.length / pageViews.length) * 100) : 0,
  };

  // ── Page performance ──
  const pageMap = new Map<string, { views: number; sessions: Set<string> }>();
  pageViews.forEach((e: any) => {
    const p = e.page_path || '/harm-reduction';
    if (!pageMap.has(p)) pageMap.set(p, { views: 0, sessions: new Set() });
    const entry = pageMap.get(p)!;
    entry.views++;
    if (e.session_id) entry.sessions.add(e.session_id);
  });
  const pages: HrPageRow[] = Array.from(pageMap.entries())
    .map(([page_path, v]) => ({ page_path, views: v.views, sessions: v.sessions.size }))
    .sort((a, b) => b.views - a.views);

  // ── CTA performance ──
  const ctaMap = new Map<string, HrCtaRow>();
  ctaClicks.forEach((e: any) => {
    const meta = (e.metadata || {}) as any;
    const key = `${e.event_type}|${meta.cta_label || ''}|${meta.cta_position || ''}`;
    if (!ctaMap.has(key)) {
      ctaMap.set(key, {
        event_type: e.event_type,
        cta_label: meta.cta_label || e.event_type.replace('harm_reduction_cta_', '').replace('_click', ''),
        cta_position: meta.cta_position || '-',
        target_path: meta.target_path || '-',
        clicks: 0,
      });
    }
    ctaMap.get(key)!.clicks++;
  });
  const ctas = Array.from(ctaMap.values()).sort((a, b) => b.clicks - a.clicks);

  // ── Destinations ──
  const destTypes = ['booking', 'selftest', 'support'];
  const destinations: HrDestRow[] = destTypes.map(t => {
    const s = starts.filter((e: any) => e.event_type.includes(t)).length;
    const c = completes.filter((e: any) => e.event_type.includes(t)).length;
    return {
      target: t,
      clicks: ctaClicks.filter((e: any) => e.event_type.includes(t)).length,
      starts: s,
      completed: c,
      rate: s > 0 ? Math.round((c / s) * 100) : 0,
    };
  });

  // ── Scroll distribution ──
  const scrollLabels = ['25%', '50%', '75%', '100%'];
  const scrollDist: HrScrollDist[] = scrollLabels.map((depth, i) => {
    const count = scrolls.filter((e: any) => e.event_type === HR_SCROLL_EVENTS[i]).length;
    return { depth, count, pct: pageViews.length > 0 ? Math.round((count / pageViews.length) * 100) : 0 };
  });

  // ── Funnel ──
  const funnel: HrFunnelStep[] = [
    { label: 'Page Views', value: pageViews.length },
    { label: 'Engaged Reads', value: engagedCount },
    { label: 'CTA Clicks', value: ctaClicks.length },
    { label: 'Service Starts', value: starts.length },
    { label: 'Completed', value: completes.length },
  ];

  // ── Insights ──
  const insights: HrInsight[] = [];

  if (pages.length > 0) {
    insights.push({ severity: 'info', title: 'หน้ายอดนิยม', description: `"${pages[0].page_path}" มี ${pages[0].views} views` });
  }
  if (ctas.length > 0) {
    insights.push({ severity: 'info', title: 'CTA ยอดนิยม', description: `"${ctas[0].cta_label}" ถูกคลิก ${ctas[0].clicks} ครั้ง` });
  }
  if (kpis.engagementRate >= 50) {
    insights.push({ severity: 'success', title: 'Engagement ดี', description: `${kpis.engagementRate}% ของผู้เข้าชมอ่านเนื้อหาจริง` });
  } else if (kpis.totalPageViews > 10 && kpis.engagementRate < 30) {
    insights.push({ severity: 'warning', title: 'Engagement ต่ำ', description: `เพียง ${kpis.engagementRate}% อ่านเนื้อหาจริง — ปรับปรุงเนื้อหาให้น่าสนใจขึ้น` });
  }
  if (kpis.totalCtaClicks > 0 && kpis.serviceStarts === 0) {
    insights.push({ severity: 'warning', title: 'คลิกแต่ไม่เข้าบริการ', description: 'มีคนคลิก CTA แต่ไม่เริ่มใช้บริการ — ตรวจสอบหน้าปลายทาง' });
  }
  if (kpis.conversionRate >= 5) {
    insights.push({ severity: 'success', title: 'Conversion ดี', description: `${kpis.conversionRate}% จากผู้เข้าชม HR นำไปสู่บริการสำเร็จ` });
  }

  // ── Raw events for CSV ──
  const rawEvents = [...filtered, ...hrServiceEvents];

  return { kpis, pages, ctas, destinations, scrollDist, funnel, insights, rawEvents };
}

// ── CSV export helpers ──

export function hrEventsToCsvRows(events: any[]) {
  return events.map((e: any) => {
    const meta = (e.metadata || {}) as any;
    return {
      date: e.created_at ? format(new Date(e.created_at), 'yyyy-MM-dd') : '',
      timestamp: e.created_at || '',
      page_path: e.page_path || '',
      event_name: e.event_type || '',
      session_id: e.session_id || '',
      source_page: meta.source_page || '',
      cta_label: meta.cta_label || '',
      cta_position: meta.cta_position || '',
      target_path: meta.target_path || '',
      content_section: meta.content_section || '',
      device_type: e.device_type || '',
      language: meta.language || '',
    };
  });
}

export const HR_CSV_COLUMNS = [
  { key: 'date', header: 'Date' },
  { key: 'timestamp', header: 'Timestamp' },
  { key: 'page_path', header: 'Page Path' },
  { key: 'event_name', header: 'Event Name' },
  { key: 'session_id', header: 'Session ID' },
  { key: 'source_page', header: 'Source Page' },
  { key: 'cta_label', header: 'CTA Label' },
  { key: 'cta_position', header: 'CTA Position' },
  { key: 'target_path', header: 'Target Path' },
  { key: 'content_section', header: 'Content Section' },
  { key: 'device_type', header: 'Device Type' },
  { key: 'language', header: 'Language' },
];
