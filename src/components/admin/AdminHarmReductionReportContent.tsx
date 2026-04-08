import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  BarChart3, Download, FileText, Calendar, Loader2, Eye, Users,
  BookOpen, MousePointerClick, ExternalLink, ArrowRight, CheckCircle2,
  AlertTriangle, Info, TrendingUp,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import {
  fetchHrAnalytics, hrEventsToCsvRows, HR_CSV_COLUMNS,
  type HrAnalyticsData, type HrFilters,
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
      const d = await fetchHrAnalytics({ dateFrom, dateTo });
      setData(d);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

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
      // Build a printable HTML and use browser print as PDF
      const k = data.kpis;
      const reportHtml = `
<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>Harm Reduction Digital Performance Report</title>
<style>
  body { font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #1a1a1a; font-size: 13px; }
  h1 { font-size: 22px; border-bottom: 3px solid #6d28d9; padding-bottom: 8px; }
  h2 { font-size: 16px; color: #6d28d9; margin-top: 28px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
  .period { color: #6b7280; font-size: 13px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 16px 0; }
  .kpi { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; }
  .kpi .label { font-size: 11px; color: #6b7280; }
  .kpi .value { font-size: 22px; font-weight: 700; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 12px; }
  th, td { border: 1px solid #e5e7eb; padding: 6px 10px; text-align: left; }
  th { background: #f3f4f6; font-weight: 600; }
  .funnel { margin: 12px 0; }
  .funnel-step { display: flex; align-items: center; gap: 8px; padding: 6px 0; }
  .funnel-bar { height: 20px; background: #6d28d9; border-radius: 4px; min-width: 4px; }
  .insight { padding: 8px 12px; border-left: 3px solid; margin: 6px 0; border-radius: 0 4px 4px 0; }
  .insight.success { border-color: #22c55e; background: #f0fdf4; }
  .insight.warning { border-color: #f59e0b; background: #fffbeb; }
  .insight.info { border-color: #3b82f6; background: #eff6ff; }
  @media print { body { padding: 20px; } }
</style></head><body>
<h1>📊 Harm Reduction Digital Performance Report</h1>
<p class="period">Reporting Period: ${dateFrom} to ${dateTo}</p>

<h2>Executive Summary</h2>
<div class="kpi-grid">
  <div class="kpi"><div class="label">Total Page Views</div><div class="value">${k.totalPageViews}</div></div>
  <div class="kpi"><div class="label">Unique Sessions</div><div class="value">${k.uniqueSessions}</div></div>
  <div class="kpi"><div class="label">Engaged Readers</div><div class="value">${k.engagedReaders}</div></div>
  <div class="kpi"><div class="label">Engagement Rate</div><div class="value">${k.engagementRate}%</div></div>
  <div class="kpi"><div class="label">CTA Clicks</div><div class="value">${k.totalCtaClicks}</div></div>
  <div class="kpi"><div class="label">Service Starts</div><div class="value">${k.serviceStarts}</div></div>
  <div class="kpi"><div class="label">Completed Conversions</div><div class="value">${k.completedConversions}</div></div>
  <div class="kpi"><div class="label">Conversion Rate</div><div class="value">${k.conversionRate}%</div></div>
  <div class="kpi"><div class="label">Outbound Clicks</div><div class="value">${k.totalOutboundClicks}</div></div>
</div>

<h2>Page Performance</h2>
<table><thead><tr><th>Page</th><th>Views</th><th>Sessions</th></tr></thead><tbody>
${data.pages.map(p => `<tr><td>${p.page_path}</td><td>${p.views}</td><td>${p.sessions}</td></tr>`).join('')}
</tbody></table>

<h2>Engagement — Scroll Depth</h2>
<table><thead><tr><th>Depth</th><th>Users</th><th>% of Views</th></tr></thead><tbody>
${data.scrollDist.map(s => `<tr><td>${s.depth}</td><td>${s.count}</td><td>${s.pct}%</td></tr>`).join('')}
</tbody></table>

<h2>CTA Performance</h2>
<table><thead><tr><th>CTA</th><th>Position</th><th>Target</th><th>Clicks</th></tr></thead><tbody>
${data.ctas.map(c => `<tr><td>${c.cta_label}</td><td>${c.cta_position}</td><td>${c.target_path}</td><td>${c.clicks}</td></tr>`).join('')}
</tbody></table>

<h2>Service Conversion by Destination</h2>
<table><thead><tr><th>Service</th><th>CTA Clicks</th><th>Starts</th><th>Completed</th><th>Rate</th></tr></thead><tbody>
${data.destinations.map(d => `<tr><td>${d.target}</td><td>${d.clicks}</td><td>${d.starts}</td><td>${d.completed}</td><td>${d.rate}%</td></tr>`).join('')}
</tbody></table>

<h2>Conversion Funnel</h2>
<div class="funnel">
${data.funnel.map(f => {
  const maxVal = data.funnel[0]?.value || 1;
  const w = Math.max(4, (f.value / maxVal) * 100);
  return `<div class="funnel-step"><div style="width:120px">${f.label}</div><div class="funnel-bar" style="width:${w}%"></div><span>${f.value}</span></div>`;
}).join('')}
</div>

<h2>Key Insights</h2>
${data.insights.map(i => `<div class="insight ${i.severity}"><strong>${i.title}</strong>: ${i.description}</div>`).join('')}

<hr style="margin-top:32px">
<p style="font-size:11px;color:#9ca3af;">Generated on ${new Date().toISOString().split('T')[0]} — Harm Reduction Digital Report</p>
</body></html>`;

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(reportHtml);
        printWindow.document.close();
        setTimeout(() => { printWindow.print(); }, 500);
      }
      toast.success(isTh ? 'เปิดหน้า PDF สำเร็จ' : 'PDF report opened');
    } finally {
      setPdfLoading(false);
    }
  };

  const k = data?.kpis;
  const maxFunnel = data?.funnel?.[0]?.value || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BarChart3 className="h-5 w-5 text-primary" />
        <div>
          <h2 className="text-xl font-bold text-foreground">
            {isTh ? 'รายงาน Harm Reduction' : 'Harm Reduction Report'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isTh ? 'สรุปการเข้าถึง การมีส่วนร่วม และ Conversion จากเนื้อหา Harm Reduction' : 'Reach, engagement, and conversion summary from Harm Reduction content'}
          </p>
        </div>
      </div>

      {/* Filters */}
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

      {data && k && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <KpiCard icon={Eye} label={isTh ? 'Page Views' : 'Page Views'} value={k.totalPageViews} />
            <KpiCard icon={Users} label={isTh ? 'Sessions' : 'Sessions'} value={k.uniqueSessions} />
            <KpiCard icon={BookOpen} label={isTh ? 'อ่านจริง' : 'Engaged'} value={k.engagedReaders} sub={`${k.engagementRate}%`} />
            <KpiCard icon={MousePointerClick} label={isTh ? 'CTA คลิก' : 'CTA Clicks'} value={k.totalCtaClicks} />
            <KpiCard icon={ExternalLink} label={isTh ? 'Outbound' : 'Outbound'} value={k.totalOutboundClicks} />
            <KpiCard icon={ArrowRight} label={isTh ? 'เริ่มบริการ' : 'Starts'} value={k.serviceStarts} />
            <KpiCard icon={CheckCircle2} label={isTh ? 'สำเร็จ' : 'Completed'} value={k.completedConversions} />
            <KpiCard icon={TrendingUp} label={isTh ? 'Conversion' : 'Conversion'} value={`${k.conversionRate}%`} />
          </div>

          {/* Funnel */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{isTh ? 'Conversion Funnel' : 'Conversion Funnel'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.funnel.map((step, i) => {
                const pct = maxFunnel > 0 ? Math.max(2, (step.value / maxFunnel) * 100) : 2;
                return (
                  <div key={i} className="flex items-center gap-3">
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

          {/* Page performance */}
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.pages.length === 0 && (
                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">{isTh ? 'ไม่มีข้อมูล' : 'No data'}</TableCell></TableRow>
                  )}
                  {data.pages.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs">{p.page_path}</TableCell>
                      <TableCell className="text-right">{p.views}</TableCell>
                      <TableCell className="text-right">{p.sessions}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Scroll depth */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{isTh ? 'Scroll Depth' : 'Scroll Depth'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-3">
                {data.scrollDist.map((s, i) => (
                  <div key={i} className="text-center p-3 bg-muted/30 rounded-lg">
                    <p className="text-lg font-bold text-foreground">{s.count}</p>
                    <p className="text-xs text-muted-foreground">{s.depth} ({s.pct}%)</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* CTA performance */}
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
                    <TableHead className="text-right">Clicks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.ctas.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">{isTh ? 'ไม่มีข้อมูล' : 'No data'}</TableCell></TableRow>
                  )}
                  {data.ctas.map((c, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs">{c.cta_label}</TableCell>
                      <TableCell className="text-xs">{c.cta_position}</TableCell>
                      <TableCell className="text-xs font-mono">{c.target_path}</TableCell>
                      <TableCell className="text-right font-medium">{c.clicks}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Destinations */}
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.destinations.map((d, i) => (
                    <TableRow key={i}>
                      <TableCell className="capitalize">{d.target}</TableCell>
                      <TableCell className="text-right">{d.clicks}</TableCell>
                      <TableCell className="text-right">{d.starts}</TableCell>
                      <TableCell className="text-right">{d.completed}</TableCell>
                      <TableCell className="text-right font-medium">{d.rate}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Insights */}
          {data.insights.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{isTh ? 'Insights' : 'Key Insights'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.insights.map((ins, i) => (
                  <div key={i} className={`flex items-start gap-2 p-3 rounded-lg border ${
                    ins.severity === 'success' ? 'bg-green-500/5 border-green-500/20' :
                    ins.severity === 'warning' ? 'bg-yellow-500/5 border-yellow-500/20' :
                    'bg-blue-500/5 border-blue-500/20'
                  }`}>
                    {ins.severity === 'success' && <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />}
                    {ins.severity === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />}
                    {ins.severity === 'info' && <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />}
                    <div>
                      <p className="text-sm font-medium text-foreground">{ins.title}</p>
                      <p className="text-xs text-muted-foreground">{ins.description}</p>
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
