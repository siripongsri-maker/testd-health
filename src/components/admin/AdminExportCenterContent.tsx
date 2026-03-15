import { useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileDown, Download, Calendar, Loader2, Fingerprint } from "lucide-react";
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
      const { data, error } = await (supabase
        .from(tmpl.table)
        .select('*')
        .gte('created_at', `${dateFrom}T00:00:00`)
        .lte('created_at', `${dateTo}T23:59:59`)
        .order('created_at', { ascending: false })
        .limit(5000) as any);

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
