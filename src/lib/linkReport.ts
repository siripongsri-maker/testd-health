import { supabase } from '@/integrations/supabase/client';

/** Funnel step definitions mirror LinkCascade so the report matches the UI. */
const FUNNEL_STEPS: { key: string; events: string[]; label: string }[] = [
  { key: 'pageview', events: ['pageview'], label: 'Page views' },
  { key: 'service_view', events: ['page_view_booking', 'page_view_selftest', 'service_card_view', 'service_detail_view'], label: 'Viewed service' },
  { key: 'started', events: ['booking_started', 'selftest_started', 'signup_started'], label: 'Started action' },
  { key: 'submitted', events: ['booking_submitted', 'booking_created', 'selftest_submitted', 'signup_completed'], label: 'Submitted' },
  { key: 'completed', events: ['booking_confirmed', 'check_in', 'completed'], label: 'Confirmed / check-in' },
];

const csvEscape = (v: unknown) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const row = (...cells: unknown[]) => cells.map(csvEscape).join(',');

export interface LinkReportInput {
  id: string;
  slug: string;
  destination_path?: string | null;
  campaign?: string | null;
  channel?: string | null;
  source?: string | null;
  medium?: string | null;
  partner_name?: string | null;
  label?: string | null;
  click_count?: number | null;
  created_at?: string | null;
  attributed_users?: number;
  appointment_count?: number;
  selftest_count?: number;
}

/** Build a multi-section CSV report for a single tracked link. */
export async function generateLinkReportCsv(link: LinkReportInput): Promise<string> {
  const { data: events, error } = await supabase
    .from('analytics_events')
    .select('event_type, created_at, anonymous_id, user_id, device_type, page_path, source, channel')
    .eq('link_id', link.id)
    .order('created_at', { ascending: true })
    .limit(20000);
  if (error) throw error;

  const rows = (events as any[]) || [];

  // Funnel: distinct visitor per step
  const visitorsByStep = FUNNEL_STEPS.map((step) => {
    const set = new Set<string>();
    rows.forEach((r) => {
      if (step.events.includes(r.event_type)) {
        const id = r.user_id || r.anonymous_id;
        if (id) set.add(id);
      }
    });
    return { ...step, count: set.size };
  });

  const clicks = link.click_count || 0;
  const uniqueVisitors = new Set(rows.map((r) => r.user_id || r.anonymous_id).filter(Boolean)).size;

  // Device breakdown
  const deviceCounts = new Map<string, number>();
  rows.forEach((r) => {
    if (r.event_type !== 'pageview') return;
    const d = r.device_type || 'unknown';
    deviceCounts.set(d, (deviceCounts.get(d) || 0) + 1);
  });

  // Daily trend
  const daily = new Map<string, { pv: number; started: number; submitted: number }>();
  rows.forEach((r) => {
    const day = (r.created_at || '').slice(0, 10);
    if (!day) return;
    const cur = daily.get(day) || { pv: 0, started: 0, submitted: 0 };
    if (r.event_type === 'pageview') cur.pv++;
    if (['booking_started', 'selftest_started', 'signup_started'].includes(r.event_type)) cur.started++;
    if (['booking_submitted', 'booking_created', 'selftest_submitted', 'signup_completed'].includes(r.event_type)) cur.submitted++;
    daily.set(day, cur);
  });

  // Event-type breakdown
  const evCounts = new Map<string, number>();
  rows.forEach((r) => evCounts.set(r.event_type, (evCounts.get(r.event_type) || 0) + 1));

  const generatedAt = new Date().toISOString();
  const firstEvent = rows[0]?.created_at || '';
  const lastEvent = rows[rows.length - 1]?.created_at || '';

  const lines: string[] = [];

  lines.push('Link Attribution Report');
  lines.push(row('Generated at (UTC)', generatedAt));
  lines.push('');
  lines.push('Link metadata');
  lines.push(row('Field', 'Value'));
  lines.push(row('Slug', `/go/${link.slug}`));
  lines.push(row('Destination', link.destination_path));
  lines.push(row('Campaign', link.campaign));
  lines.push(row('Channel', link.channel));
  lines.push(row('Source', link.source));
  lines.push(row('Medium', link.medium));
  lines.push(row('Partner / KOL', link.partner_name));
  lines.push(row('Label', link.label));
  lines.push(row('Created at', link.created_at));
  lines.push(row('First event', firstEvent));
  lines.push(row('Last event', lastEvent));
  lines.push('');

  lines.push('Headline metrics');
  lines.push(row('Metric', 'Value'));
  lines.push(row('Link clicks', clicks));
  lines.push(row('Unique visitors (any event)', uniqueVisitors));
  lines.push(row('Identified users linked', link.attributed_users ?? ''));
  lines.push(row('Clinic appointments (via identified users)', link.appointment_count ?? ''));
  lines.push(row('HIV self-test requests (via identified users)', link.selftest_count ?? ''));
  lines.push('');

  lines.push('Funnel (distinct visitors per step)');
  lines.push(row('Step', 'Visitors', '% of clicks', 'Drop-off from prev'));
  let prev = clicks;
  lines.push(row('Link clicks', clicks, '100%', ''));
  visitorsByStep.forEach((s) => {
    const pct = clicks ? Math.round((s.count / clicks) * 100) + '%' : '';
    const drop = prev > 0 ? Math.round(((prev - s.count) / prev) * 100) + '%' : '';
    lines.push(row(s.label, s.count, pct, drop));
    prev = s.count;
  });
  lines.push('');

  lines.push('Event-type breakdown');
  lines.push(row('Event type', 'Count'));
  [...evCounts.entries()].sort((a, b) => b[1] - a[1]).forEach(([k, v]) => lines.push(row(k, v)));
  lines.push('');

  lines.push('Device breakdown (pageviews)');
  lines.push(row('Device', 'Pageviews'));
  [...deviceCounts.entries()].sort((a, b) => b[1] - a[1]).forEach(([k, v]) => lines.push(row(k, v)));
  lines.push('');

  lines.push('Daily trend');
  lines.push(row('Date', 'Pageviews', 'Started', 'Submitted'));
  [...daily.entries()].sort().forEach(([day, v]) => lines.push(row(day, v.pv, v.started, v.submitted)));

  // Prepend UTF-8 BOM so Excel opens Thai correctly
  return '\uFEFF' + lines.join('\n');
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
