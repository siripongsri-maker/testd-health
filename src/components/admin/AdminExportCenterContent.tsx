import { useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileDown, Download, Calendar, Loader2, Fingerprint, Link2, Check, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAdminRole } from "@/hooks/useAdminRole";
import { usePdpaAudit } from "@/hooks/usePdpaAudit";
import { exportToCsv, type CsvColumn, formatCsvDate } from "@/lib/adminCsvExport";
import { toast } from "sonner";

interface ReportTemplate {
  id: string;
  name: string;
  nameTh: string;
  description: string;
  descriptionTh: string;
  module: string;
  table: string;
  icon: string;
  columns: CsvColumn<any>[];
}

const reportTemplates: ReportTemplate[] = [
  {
    id: 'booking_conversion', name: 'Booking Report', nameTh: 'รายงานการจอง',
    description: 'All appointments with status and branch', descriptionTh: 'การนัดหมายทั้งหมดพร้อมสถานะและสาขา',
    module: 'bookings', table: 'appointments', icon: '📅',
    columns: [
      { key: 'referral_code', header: 'Referral Code' },
      { key: 'appointment_date', header: 'Date', format: (r: any) => formatCsvDate(r.appointment_date, false) },
      { key: 'start_time', header: 'Time' },
      { key: 'status', header: 'Status' },
      { key: 'source', header: 'Source' },
      { key: 'created_at', header: 'Created', format: (r: any) => formatCsvDate(r.created_at) },
    ],
  },
  {
    id: 'selftest_ops', name: 'Self-Test Operations', nameTh: 'รายงานการตรวจ',
    description: 'Self-test request fulfillment', descriptionTh: 'การดำเนินการคำขอตรวจ',
    module: 'kit-orders', table: 'hiv_selftest_requests', icon: '🧪',
    columns: [
      { key: 'status', header: 'Status' },
      { key: 'assigned_branch', header: 'Branch' },
      { key: 'created_at', header: 'Created', format: (r: any) => formatCsvDate(r.created_at) },
    ],
  },
  {
    id: 'user_activity', name: 'User Activity', nameTh: 'รายงานผู้ใช้',
    description: 'User registrations and profiles', descriptionTh: 'การลงทะเบียนและโปรไฟล์',
    module: 'users', table: 'profiles', icon: '👥',
    columns: [
      { key: 'display_name', header: 'Display Name' },
      { key: 'created_at', header: 'Joined', format: (r: any) => formatCsvDate(r.created_at) },
    ],
  },
  {
    id: 'abuse_moderation', name: 'Abuse & Moderation', nameTh: 'รายงานการละเมิด',
    description: 'Abuse flags and moderation', descriptionTh: 'แฟลกการละเมิดและการตรวจสอบ',
    module: 'abuse-logs', table: 'pdpa_audit_logs', icon: '🛡️',
    columns: [
      { key: 'action_type', header: 'Action' },
      { key: 'actor_role', header: 'Role' },
      { key: 'result', header: 'Result' },
      { key: 'created_at', header: 'Time', format: (r: any) => formatCsvDate(r.created_at) },
    ],
  },
];

export default function AdminExportCenterContent() {
  const { language } = useLanguage();
  const isTh = language === 'th';
  const { user } = useAuth();
  const { role } = useAdminRole();
  const { log } = usePdpaAudit();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedRange, setSelectedRange] = useState('7d');
  const [exporting, setExporting] = useState<string | null>(null);

  const handleQuickRange = (range: string) => {
    setSelectedRange(range);
    const now = new Date();
    const to = now.toISOString().split('T')[0];
    let from = to;
    if (range === '7d') from = new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0];
    else if (range === '30d') from = new Date(now.getTime() - 30 * 86400000).toISOString().split('T')[0];
    else if (range === '90d') from = new Date(now.getTime() - 90 * 86400000).toISOString().split('T')[0];
    setDateFrom(from);
    setDateTo(to);
  };

  const handleExport = async (tmpl: ReportTemplate) => {
    if (!dateFrom || !dateTo) {
      toast.error(isTh ? 'กรุณาเลือกช่วงเวลา' : 'Please select a date range');
      return;
    }

    setExporting(tmpl.id);

    // Audit: log attempt
    await log({
      action_type: 'export_attempt',
      target_type: tmpl.table,
      target_classification: 'personal',
      reason: `Export ${tmpl.module} report`,
      metadata: { dateFrom, dateTo, module: tmpl.module },
    });

    try {
      const { data, error } = await (supabase as any)
        .from(tmpl.table)
        .select('*')
        .gte('created_at', `${dateFrom}T00:00:00`)
        .lte('created_at', `${dateTo}T23:59:59`)
        .order('created_at', { ascending: false })
        .limit(5000);

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.info(isTh ? 'ไม่พบข้อมูลในช่วงเวลานี้' : 'No data found for this period');
        setExporting(null);
        return;
      }

      // Export with watermark
      exportToCsv(
        data,
        tmpl.columns,
        tmpl.module,
        { from: dateFrom, to: dateTo },
        {
          userId: user?.id || 'unknown',
          role: role || 'admin',
          timestamp: Date.now(),
          module: tmpl.module,
        }
      );

      // Audit: log success
      await log({
        action_type: 'export_success',
        target_type: tmpl.table,
        target_classification: 'personal',
        metadata: { dateFrom, dateTo, module: tmpl.module, rowCount: data.length },
      });

      toast.success(isTh ? `ส่งออก ${data.length} แถวสำเร็จ` : `Exported ${data.length} rows`);
    } catch (err: any) {
      toast.error(isTh ? 'เกิดข้อผิดพลาดในการส่งออก' : 'Export failed');
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileDown className="h-5 w-5 text-primary" />
        <div>
          <h2 className="text-xl font-bold text-foreground">{isTh ? 'ศูนย์รายงานและส่งออก' : 'Reports & Export Center'}</h2>
          <p className="text-sm text-muted-foreground">
            {isTh ? 'ส่งออกข้อมูลพร้อมลายน้ำดิจิทัลเพื่อความปลอดภัย' : 'Export data with digital watermarking for PDPA compliance'}
          </p>
        </div>
      </div>

      {/* Watermark notice */}
      <Card className="border border-primary/20 bg-primary/5">
        <CardContent className="p-3 flex items-center gap-3">
          <Fingerprint className="h-5 w-5 text-primary shrink-0" />
          <p className="text-xs text-muted-foreground">
            {isTh
              ? '📌 ไฟล์ CSV ทุกไฟล์จะมีลายน้ำดิจิทัลที่มองไม่เห็นเพื่อระบุตัวผู้ส่งออก ตามข้อกำหนด PDPA'
              : '📌 All CSV exports contain invisible digital watermarks identifying the exporter, per PDPA requirements'}
          </p>
        </CardContent>
      </Card>

      {/* Date range */}
      <Card className="border border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">{isTh ? 'ช่วงเวลา:' : 'Date Range:'}</span>
            <div className="flex gap-1">
              {[
                { key: '7d', label: '7 Days' },
                { key: '30d', label: '30 Days' },
                { key: '90d', label: '90 Days' },
              ].map(r => (
                <Button key={r.key} variant={selectedRange === r.key ? 'default' : 'outline'} size="sm" className="h-7 text-xs" onClick={() => handleQuickRange(r.key)}>
                  {r.label}
                </Button>
              ))}
            </div>
            <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setSelectedRange('custom'); }} className="w-36 h-8" />
            <span className="text-xs text-muted-foreground">→</span>
            <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setSelectedRange('custom'); }} className="w-36 h-8" />
          </div>
        </CardContent>
      </Card>

      {/* Journey summaries (PDF) */}
      <JourneyPdfCards isTh={isTh} />

      {/* Report Templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {reportTemplates.map(tmpl => (
          <Card key={tmpl.id} className="border border-border/50 hover:border-primary/30 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{tmpl.icon}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm text-foreground">{isTh ? tmpl.nameTh : tmpl.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{isTh ? tmpl.descriptionTh : tmpl.description}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 shrink-0 h-7 text-xs"
                  disabled={exporting === tmpl.id}
                  onClick={() => handleExport(tmpl)}
                >
                  {exporting === tmpl.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Download className="h-3 w-3" />
                  )}
                  {isTh ? 'ส่งออก' : 'Export'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border border-border/50 bg-muted/20">
        <CardContent className="p-4 text-center">
          <p className="text-sm text-muted-foreground">
            {isTh ? '💡 เคล็ดลับ: ไปที่แต่ละหน้าโมดูลเพื่อส่งออก CSV พร้อมฟิลเตอร์ที่กำหนดเอง' : '💡 Tip: Visit each module page for CSV export with custom filters applied'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

const journeyDocs = [
  {
    id: 'client',
    file: '/docs/journey-client.pdf',
    icon: '🧑‍💼',
    name: 'Client Journey (full data)',
    nameTh: 'Journey ผู้รับบริการ (ข้อมูลครบ)',
    description: '17 steps: booking → survey → counseling → SMS → travel allowance',
    descriptionTh: '17 ขั้นตอน: จอง → แบบสำรวจ → รับคำปรึกษา → SMS → ขอค่าเดินทาง',
  },
  {
    id: 'admin',
    file: '/docs/journey-admin-counselor.pdf',
    icon: '🧑‍⚕️',
    name: 'Staff & Counselor Journey',
    nameTh: 'Journey เจ้าหน้าที่และผู้ให้คำปรึกษา',
    description: '11 steps across admin console screens with live data',
    descriptionTh: '11 ขั้นตอนในหน้าจอแอดมิน พร้อมข้อมูลจริง',
  },
];

function JourneyPdfCards({ isTh }: { isTh: boolean }) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [versions, setVersions] = useState<Record<string, string>>({});

  // Resolve the latest published version of each PDF (from Last-Modified) so the
  // copied link always busts caches for the review team.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        journeyDocs.map(async doc => {
          try {
            const res = await fetch(doc.file, { method: 'HEAD', cache: 'no-store' });
            const lm = res.headers.get('last-modified');
            const stamp = lm ? new Date(lm).getTime() : Date.now();
            return [doc.id, String(stamp)] as const;
          } catch {
            return [doc.id, String(Date.now())] as const;
          }
        })
      );
      if (!cancelled) setVersions(Object.fromEntries(entries));
    })();
    return () => { cancelled = true; };
  }, []);

  const urlFor = (doc: typeof journeyDocs[number]) =>
    `${window.location.origin}${doc.file}?v=${versions[doc.id] ?? 'latest'}`;

  const versionLabel = (id: string) => {
    const v = versions[id];
    if (!v) return isTh ? 'กำลังตรวจสอบเวอร์ชัน…' : 'Checking version…';
    const d = new Date(Number(v));
    return `${isTh ? 'อัปเดตล่าสุด' : 'Updated'} ${d.toLocaleDateString(isTh ? 'th-TH' : 'en-GB')} ${d.toLocaleTimeString(isTh ? 'th-TH' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const copy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      toast.success(isTh ? 'คัดลอกลิงก์แล้ว' : 'Link copied', { description: text.split('\n')[0] });
    } catch {
      toast.error(isTh ? 'คัดลอกลิงก์ไม่สำเร็จ' : 'Could not copy link');
    }
  };

  const copyAll = () => {
    const header = isTh
      ? 'สรุป Journey เวอร์ชันล่าสุด (สำหรับทีมตรวจสอบ):'
      : 'Latest Journey summaries (for the review team):';
    const body = journeyDocs
      .map(doc => `• ${isTh ? doc.nameTh : doc.name}\n  ${urlFor(doc)}`)
      .join('\n');
    copy('all', `${header}\n${body}`);
  };

  return (
    <Card className="border border-border/50">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">
              {isTh ? 'สรุป Journey (PDF) สำหรับส่งทีมตรวจสอบ' : 'Journey summaries (PDF) for review teams'}
            </h3>
          </div>
          <Button size="sm" className="h-8 text-xs gap-1" onClick={copyAll}>
            {copiedId === 'all' ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
            {isTh ? 'คัดลอกลิงก์เวอร์ชันล่าสุด' : 'Copy latest version links'}
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {journeyDocs.map(doc => (
            <div key={doc.id} className="rounded-xl border border-border/50 p-3 flex items-start gap-3">
              <span className="text-2xl">{doc.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground">{isTh ? doc.nameTh : doc.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{isTh ? doc.descriptionTh : doc.description}</p>
                <p className="text-[11px] text-muted-foreground/80 mt-1">{versionLabel(doc.id)}</p>
                <div className="flex gap-2 mt-2">
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => copy(doc.id, urlFor(doc))}>
                    {copiedId === doc.id ? <Check className="h-3 w-3" /> : <Link2 className="h-3 w-3" />}
                    {isTh ? 'คัดลอกลิงก์ล่าสุด' : 'Copy latest link'}
                  </Button>
                  <Button asChild variant="outline" size="sm" className="h-7 text-xs gap-1">
                    <a href={doc.file} download target="_blank" rel="noopener noreferrer">
                      <Download className="h-3 w-3" />
                      {isTh ? 'ดาวน์โหลด PDF' : 'Download PDF'}
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
