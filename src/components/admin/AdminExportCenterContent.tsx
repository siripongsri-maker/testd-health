import { useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileDown, Download, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReportTemplate {
  id: string;
  name: string;
  nameTh: string;
  description: string;
  descriptionTh: string;
  module: string;
  icon: string;
}

const reportTemplates: ReportTemplate[] = [
  { id: 'invite_performance', name: 'Invite Performance Report', nameTh: 'รายงานประสิทธิภาพคำชวน', description: 'Invite funnel conversion rates and trends', descriptionTh: 'อัตรา Conversion และแนวโน้มคำชวน', module: 'partner-invites', icon: '💌' },
  { id: 'booking_conversion', name: 'Booking Conversion Report', nameTh: 'รายงาน Conversion จอง', description: 'Booking lifecycle from created to completed', descriptionTh: 'วงจรการจองจากสร้างถึงเสร็จ', module: 'bookings', icon: '📅' },
  { id: 'sms_usage', name: 'SMS Usage Report', nameTh: 'รายงานการใช้ SMS', description: 'SMS relay activity, success rates, and provider health', descriptionTh: 'กิจกรรม SMS, อัตราสำเร็จ, และสถานะ Provider', module: 'sms-relay', icon: '📱' },
  { id: 'credit_financial', name: 'SMS Credit Financial Report', nameTh: 'รายงานการเงินเครดิต SMS', description: 'Credit purchases, grants, usage, and refunds', descriptionTh: 'การซื้อ, ให้, ใช้, และคืนเครดิต', module: 'credit-purchases', icon: '💳' },
  { id: 'abuse_moderation', name: 'Abuse & Moderation Report', nameTh: 'รายงานการตรวจสอบการละเมิด', description: 'Abuse flags, severity distribution, resolution rates', descriptionTh: 'แฟลกการละเมิด, การกระจายความรุนแรง, อัตราแก้ไข', module: 'abuse-logs', icon: '🛡️' },
  { id: 'user_activity', name: 'User Activity Report', nameTh: 'รายงานกิจกรรมผู้ใช้', description: 'User registrations, active users, and engagement', descriptionTh: 'การลงทะเบียน, ผู้ใช้ที่ใช้งาน, และความผูกพัน', module: 'users', icon: '👥' },
  { id: 'selftest_ops', name: 'Self-Test Operations Report', nameTh: 'รายงานการดำเนินการตรวจ', description: 'Self-test request fulfillment by branch', descriptionTh: 'การดำเนินการคำขอตรวจแยกตามสาขา', module: 'kit-orders', icon: '🧪' },
  { id: 'rewards_campaign', name: 'Campaign & Rewards Report', nameTh: 'รายงานแคมเปญและรางวัล', description: 'Active campaigns, participation, and content status', descriptionTh: 'แคมเปญที่ใช้งาน, การเข้าร่วม, และสถานะเนื้อหา', module: 'rewards', icon: '🎁' },
];

export default function AdminExportCenterContent() {
  const { language } = useLanguage();
  const isTh = language === 'th';
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedRange, setSelectedRange] = useState('7d');

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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileDown className="h-5 w-5 text-primary" />
        <div>
          <h2 className="text-xl font-bold text-foreground">{isTh ? 'ศูนย์รายงานและส่งออก' : 'Reports & Export Center'}</h2>
          <p className="text-sm text-muted-foreground">{isTh ? 'สร้างและดาวน์โหลดรายงานจากข้อมูลจริง' : 'Generate and download reports from real data'}</p>
        </div>
      </div>

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
                <Button variant="outline" size="sm" className="gap-1 shrink-0 h-7 text-xs">
                  <Download className="h-3 w-3" />
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
