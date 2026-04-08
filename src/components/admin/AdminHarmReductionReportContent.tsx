import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  BarChart3, Download, FileText, Calendar, Loader2, Eye, Users,
  BookOpen, MousePointerClick, ExternalLink, ArrowRight, CheckCircle2,
  AlertTriangle, Info, TrendingUp, History,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import {
  fetchHrAnalytics, hrEventsToCsvRows, HR_CSV_COLUMNS,
  type HrAnalyticsData,
} from '@/lib/harmReductionAnalytics';
import { exportToCsv } from '@/lib/adminCsvExport';
import { toast } from 'sonner';

const KpiCard = ({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string | number; sub?: string }) => (
  <Card className="border border-border/50">
    <CardContent className="p-4">
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-primary shrink-0" />
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold text-foreground">{value}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </div>
    </CardContent>
  </Card>
);

function formatDateLabel(value: string | null | undefined) {
  if (!value) return '-';
  return format(new Date(value), 'yyyy-MM-dd');
}

export default function AdminHarmReductionReportContent() {
  const { language } = useLanguage();
  const isTh = language === 'th';

  const now = new Date();
  const [dateFrom, setDateFrom] = useState(new Date(now.getTime() - 30 * 86400000).toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(now.toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [data, setData] = useState<HrAnalyticsData | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const result = await fetchHrAnalytics({ dateFrom, dateTo });
      setData(result);
    } catch {
      toast.error(isTh ? 'โหลดข้อมูลไม่สำเร็จ' : 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleCsvExport = () => {
    if (!data) return;
    const rows = hrEventsToCsvRows(data.rawEvents);
    exportToCsv(rows, HR_CSV_COLUMNS as any, 'harm-reduction-report', { from: dateFrom, to: dateTo });
    toast.success(isTh ? 'ส่งออก CSV สำเร็จ' : 'CSV exported');
  };

  const handlePdfExport = async () => {
    if (!data) return;
    setPdfLoading(true);
    try {
      const k = data.kpis;
      const ds = data.dataSources;
      const reportHtml = `
<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>Harm Reduction Digital Performance Report</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 860px; margin: 0 auto; padding: 36px; color: #111827; font-size: 13px; }
  h1 { font-size: 24px; margin-bottom: 8px; }
  h2 { font-size: 16px; margin-top: 28px; padding-bottom: 4px; border-bottom: 1px solid #d1d5db; }
  .muted { color: #6b7280; }
  .note { background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 8px; padding: 10px 12px; margin: 16px 0; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 16px 0; }
  .kpi { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; background: #fafafa; }
  .kpi .label { font-size: 11px; color: #6b7280; }
  .kpi .value { font-size: 22px; font-weight: 700; margin-top: 4px; }
  .kpi .sub { font-size: 11px; color: #6b7280; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  th, td { border: 1px solid #e5e7eb; padding: 6px 8px; text-align: left; font-size: 12px; }
  th { background: #f9fafb; }
  .insight { border: 1px solid #e5e7eb; background: #fafafa; border-radius: 8px; padding: 10px 12px; margin-bottom: 8px; }
  .bar-row { display: flex; align-items: center; gap: 10px; margin: 8px 0; }
  .bar-label { width: 130px; font-size: 12px; color: #4b5563; }
  .bar-track { flex: 1; background: #e5e7eb; height: 18px; border-radius: 999px; overflow: hidden; }
  .bar-fill { background: #111827; height: 100%; }
  .bar-value { width: 48px; text-align: right; font-size: 12px; font-weight: 600; }
</style></head><body>
<h1>Harm Reduction Digital Performance Report</h1>
<p class="muted">Reporting period: ${dateFrom} to ${dateTo}</p>

${ds.hasLegacyBackfill ? `<div class="note"><strong>${isTh ? 'หมายเหตุ:' : 'Note:'}</strong> ${isTh ? 'ข้อมูลบางส่วนมาจากระบบเดิม (ก่อนมี analytics tracking)' : 'Some metrics include legacy-system data from before dedicated analytics tracking.'}</div>` : ''}

<h2>Executive Summary</h2>
<div class="grid">
  <div class="kpi"><div class="label">Total Page Views</div><div class="value">${k.totalPageViews}</div><div class="sub">Tracked ${ds.trackedPageViews} · Legacy ${ds.legacyPageViews}</div></div>
  <div class="kpi"><div class="label">Unique Sessions</div><div class="value">${k.uniqueSessions}</div><div class="sub">Tracked ${ds.trackedSessions} · Approx. legacy ${ds.legacySessions}</div></div>
  <div class="kpi"><div class="label">Engaged Readers</div><div class="value">${k.engagedReaders}</div><div class="sub">Engagement rate ${k.engagementRate}%</div></div>
  <div class="kpi"><div class="label">CTA Clicks</div><div class="value">${k.totalCtaClicks}</div><div class="sub">Across tracked + legacy CTA actions</div></div>
  <div class="kpi"><div class="label">Service Starts</div><div class="value">${k.serviceStarts}</div><div class="sub">Tracked ${ds.trackedServiceStarts} · Est. legacy ${ds.legacyEstimatedStarts}</div></div>
  <div class="kpi"><div class="label">Completed Conversions</div><div class="value">${k.completedConversions}</div><div class="sub">Tracked ${ds.trackedCompletedConversions} · Est. legacy ${ds.legacyEstimatedCompletedConversions}</div></div>
</div>

<h2>Data Coverage</h2>
<table><tbody>
<tr><th>First Access Date</th><td>${formatDateLabel(ds.firstAccessAt)}</td><th>Last Access in Period</th><td>${formatDateLabel(ds.lastAccessAt)}</td></tr>
<tr><th>Tracked Page Views</th><td>${ds.trackedPageViews}</td><th>Historical Backfill Page Views</th><td>${ds.legacyPageViews}</td></tr>
</tbody></table>

<h2>Page Performance</h2>
<table><thead><tr><th>Page</th><th>Views</th><th>Sessions</th><th>Tracked</th><th>Legacy</th></tr></thead><tbody>
${data.pages.map((p) => `<tr><td>${p.page_path}</td><td>${p.views}</td><td>${p.sessions}</td><td>${p.trackedViews}</td><td>${p.legacyViews}</td></tr>`).join('')}
</tbody></table>

<h2>Daily Trend</h2>
<table><thead><tr><th>Date</th><th>Views</th><th>Sessions</th><th>Engaged</th><th>Source</th></tr></thead><tbody>
${data.trend.slice(0, 14).map((row) => `<tr><td>${row.period}</td><td>${row.pageViews}</td><td>${row.sessions}</td><td>${row.engagedReaders}</td><td>${row.source}</td></tr>`).join('')}
</tbody></table>

<h2>CTA & Destination Summary</h2>
<table><thead><tr><th>CTA</th><th>Position</th><th>Target</th><th>Total</th><th>Tracked</th><th>Legacy</th></tr></thead><tbody>
${data.ctas.map((row) => `<tr><td>${row.cta_label}</td><td>${row.cta_position}</td><td>${row.target_path}</td><td>${row.clicks}</td><td>${row.trackedClicks}</td><td>${row.legacyClicks}</td></tr>`).join('')}
</tbody></table>

<h2>Conversion Funnel</h2>
${data.funnel.map((step) => {
  const max = data.funnel[0]?.value || 1;
  const width = Math.max(4, (step.value / max) * 100);
  return `<div class="bar-row"><div class="bar-label">${step.label}</div><div class="bar-track"><div class="bar-fill" style="width:${width}%"></div></div><div class="bar-value">${step.value}</div></div>`;
}).join('')}

<h2>Key Insights</h2>
${data.insights.map((item) => `<div class="insight"><strong>${item.title}</strong><br>${item.description}</div>`).join('')}

<p class="muted" style="margin-top: 24px; font-size: 11px;">Generated ${formatDateLabel(new Date().toISOString())}</p>
</body></html>`;

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(reportHtml);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 500);
      }
      toast.success(isTh ? 'เปิดรายงาน PDF แล้ว' : 'PDF report opened');
    } finally {
      setPdfLoading(false);
    }
  };

  const k = data?.kpis;
  const ds = data?.dataSources;
  const maxFunnel = data?.funnel?.[0]?.value || 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="h-5 w-5 text-primary" />
        <div>
          <h2 className="text-xl font-bold text-foreground">
            {isTh ? 'รายงาน Harm Reduction' : 'Harm Reduction Report'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isTh ? 'รวมข้อมูล tracked + historical usage เพื่อสะท้อนการใช้งานจริงตั้งแต่เริ่มเปิดหน้า' : 'Combines tracked analytics and historical usage so the report reflects real usage since launch'}
          </p>
        </div>
      </div>

      <Card className="border border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-36 h-8" />
            <span className="text-xs text-muted-foreground">→</span>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-36 h-8" />
            <Button size="sm" onClick={load} disabled={loading} className="h-8 gap-1">
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <BarChart3 className="h-3 w-3" />}
              {isTh ? 'โหลดข้อมูล' : 'Load'}
            </Button>
            <div className="ml-auto flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCsvExport} disabled={!data} className="h-8 gap-1">
                <Download className="h-3 w-3" /> CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handlePdfExport} disabled={!data || pdfLoading} className="h-8 gap-1">
                {pdfLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />} PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading && (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {data && k && ds && (
        <>
          {ds.hasLegacyBackfill && (
            <Card className="border border-border/50 bg-muted/30">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <History className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {isTh ? 'ข้อมูลบางส่วนมาจากระบบเดิม (ก่อนมี analytics tracking)' : 'Some data comes from the legacy system before analytics tracking'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {isTh
                        ? `เพิ่ม historical backfill ${ds.legacyPageViews} page views และประมาณ ${ds.legacySessions} sessions · เริ่มมีการใช้งานครั้งแรก ${formatDateLabel(ds.firstAccessAt)}`
                        : `Added ${ds.legacyPageViews} historical page views and about ${ds.legacySessions} sessions · first access ${formatDateLabel(ds.firstAccessAt)}`}
                    </p>
                    {(ds.legacyEstimatedStarts > 0 || ds.legacyEstimatedCompletedConversions > 0) && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {isTh
                          ? `Service starts/completions บางส่วนเป็นค่าประมาณจาก legacy actions (starts ${ds.legacyEstimatedStarts}, completes ${ds.legacyEstimatedCompletedConversions})`
                          : `Some service starts/completions are estimated from legacy actions (starts ${ds.legacyEstimatedStarts}, completes ${ds.legacyEstimatedCompletedConversions})`}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard icon={Eye} label={isTh ? 'Page Views' : 'Page Views'} value={k.totalPageViews} sub={`Tracked ${ds.trackedPageViews} · Legacy ${ds.legacyPageViews}`} />
            <KpiCard icon={Users} label={isTh ? 'Sessions' : 'Sessions'} value={k.uniqueSessions} sub={`Tracked ${ds.trackedSessions} · Legacy ${ds.legacySessions}`} />
            <KpiCard icon={BookOpen} label={isTh ? 'อ่าน/มีส่วนร่วม' : 'Engaged'} value={k.engagedReaders} sub={`${k.engagementRate}%`} />
            <KpiCard icon={MousePointerClick} label={isTh ? 'CTA คลิก' : 'CTA Clicks'} value={k.totalCtaClicks} />
            <KpiCard icon={ExternalLink} label={isTh ? 'Outbound' : 'Outbound'} value={k.totalOutboundClicks} sub={isTh ? 'เก็บได้เฉพาะช่วง tracked' : 'Tracked period only'} />
            <KpiCard icon={ArrowRight} label={isTh ? 'เริ่มบริการ' : 'Service Starts'} value={k.serviceStarts} sub={`Tracked ${ds.trackedServiceStarts} · Est. ${ds.legacyEstimatedStarts}`} />
            <KpiCard icon={CheckCircle2} label={isTh ? 'สำเร็จ' : 'Completed'} value={k.completedConversions} sub={`Tracked ${ds.trackedCompletedConversions} · Est. ${ds.legacyEstimatedCompletedConversions}`} />
            <KpiCard icon={TrendingUp} label={isTh ? 'Conversion Rate' : 'Conversion Rate'} value={`${k.conversionRate}%`} sub={isTh ? `เริ่มใช้งานครั้งแรก ${formatDateLabel(ds.firstAccessAt)}` : `First access ${formatDateLabel(ds.firstAccessAt)}`} />
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{isTh ? 'Conversion Funnel' : 'Conversion Funnel'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.funnel.map((step, index) => {
                const pct = maxFunnel > 0 ? Math.max(2, (step.value / maxFunnel) * 100) : 2;
                return (
                  <div key={index} className="flex items-center gap-3">
                    <span className="text-xs w-28 text-muted-foreground">{step.label}</span>
                    <div className="flex-1 bg-muted rounded-full h-5 overflow-hidden">
                      <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-sm font-medium w-12 text-right">{step.value}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{isTh ? 'แนวโน้มรายวัน' : 'Daily Trend'}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isTh ? 'วันที่' : 'Date'}</TableHead>
                    <TableHead className="text-right">{isTh ? 'Views' : 'Views'}</TableHead>
                    <TableHead className="text-right">{isTh ? 'Sessions' : 'Sessions'}</TableHead>
                    <TableHead className="text-right">{isTh ? 'Engaged' : 'Engaged'}</TableHead>
                    <TableHead>{isTh ? 'แหล่งข้อมูล' : 'Source'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.trend.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">{isTh ? 'ไม่มีข้อมูล' : 'No data'}</TableCell></TableRow>
                  )}
                  {data.trend.slice(0, 14).map((row, index) => (
                    <TableRow key={index}>
                      <TableCell>{row.period}</TableCell>
                      <TableCell className="text-right">{row.pageViews}</TableCell>
                      <TableCell className="text-right">{row.sessions}</TableCell>
                      <TableCell className="text-right">{row.engagedReaders}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {row.source === 'mixed' ? (isTh ? 'tracked + เดิม' : 'tracked + legacy') : row.source}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{isTh ? 'หน้าที่เข้าชม' : 'Page Performance'}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Page</TableHead>
                    <TableHead className="text-right">Views</TableHead>
                    <TableHead className="text-right">Sessions</TableHead>
                    <TableHead>{isTh ? 'แยกตามแหล่งข้อมูล' : 'Breakdown'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.pages.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">{isTh ? 'ไม่มีข้อมูล' : 'No data'}</TableCell></TableRow>
                  )}
                  {data.pages.map((page, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-xs">{page.page_path}</TableCell>
                      <TableCell className="text-right">{page.views}</TableCell>
                      <TableCell className="text-right">{page.sessions}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">Tracked {page.trackedViews} · Legacy {page.legacyViews}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{isTh ? 'Scroll Depth' : 'Scroll Depth'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {data.scrollDist.map((scroll, index) => (
                  <div key={index} className="text-center p-3 bg-muted/30 rounded-lg">
                    <p className="text-lg font-bold text-foreground">{scroll.count}</p>
                    <p className="text-xs text-muted-foreground">{scroll.depth} ({scroll.pct}%)</p>
                  </div>
                ))}
              </div>
              {ds.hasLegacyBackfill && (
                <p className="text-xs text-muted-foreground">
                  {isTh ? 'Historical scroll depth ไม่มีในระบบเดิม จึงแสดงเฉพาะช่วงที่มี tracked analytics' : 'Historical scroll depth was not available in the legacy system, so this section shows tracked-period data only.'}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{isTh ? 'CTA Performance' : 'CTA Performance'}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>CTA</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead className="text-right">{isTh ? 'รวม' : 'Total'}</TableHead>
                    <TableHead>{isTh ? 'แยกตามแหล่งข้อมูล' : 'Breakdown'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.ctas.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">{isTh ? 'ไม่มีข้อมูล' : 'No data'}</TableCell></TableRow>
                  )}
                  {data.ctas.map((cta, index) => (
                    <TableRow key={index}>
                      <TableCell className="text-xs">{cta.cta_label}</TableCell>
                      <TableCell className="text-xs">{cta.cta_position}</TableCell>
                      <TableCell className="text-xs font-mono">{cta.target_path}</TableCell>
                      <TableCell className="text-right font-medium">{cta.clicks}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">Tracked {cta.trackedClicks} · Legacy {cta.legacyClicks}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{isTh ? 'Conversion ตามบริการ' : 'Conversion by Service'}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead className="text-right">CTA Clicks</TableHead>
                    <TableHead className="text-right">Starts</TableHead>
                    <TableHead className="text-right">Completed</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead>{isTh ? 'แยกตามแหล่งข้อมูล' : 'Breakdown'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.destinations.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="capitalize">{row.target}</TableCell>
                      <TableCell className="text-right">{row.clicks}</TableCell>
                      <TableCell className="text-right">{row.starts}</TableCell>
                      <TableCell className="text-right">{row.completed}</TableCell>
                      <TableCell className="text-right font-medium">{row.rate}%</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {isTh
                          ? `Starts: tracked ${row.trackedStarts} / est. ${row.legacyEstimatedStarts} · Completed: tracked ${row.trackedCompleted} / est. ${row.legacyEstimatedCompleted}`
                          : `Starts: tracked ${row.trackedStarts} / est. ${row.legacyEstimatedStarts} · Completed: tracked ${row.trackedCompleted} / est. ${row.legacyEstimatedCompleted}`}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {data.insights.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{isTh ? 'Insights' : 'Key Insights'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.insights.map((insight, index) => (
                  <div key={index} className="flex items-start gap-2 p-3 rounded-lg border border-border/50 bg-muted/30">
                    {insight.severity === 'success' && <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />}
                    {insight.severity === 'warning' && <AlertTriangle className="h-4 w-4 text-primary mt-0.5 shrink-0" />}
                    {insight.severity === 'info' && <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />}
                    <div>
                      <p className="text-sm font-medium text-foreground">{insight.title}</p>
                      <p className="text-xs text-muted-foreground">{insight.description}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
