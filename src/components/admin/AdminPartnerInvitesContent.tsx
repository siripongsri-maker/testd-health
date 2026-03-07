import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Heart, AlertTriangle, TrendingUp, ThumbsUp, CalendarCheck, CheckCircle2, Users } from "lucide-react";
import { format } from "date-fns";

interface InviteReport {
  invite_id: string;
  created_at: string;
  invite_type: string;
  tone: string;
  expires_at: string;
  is_active: boolean;
  status: string;
  opens: number;
  kit_cta: number;
  booking_cta: number;
  sessions_joined: number;
  timer_completed: number;
  bookings_completed: number;
  selftest_requests: number;
  accepted_count: number;
  plans_to_test_count: number;
  booked_count: number;
  completed_count: number;
  pair_status: string | null;
  pair_booking_count: number | null;
}

interface AbuseFlag {
  id: string;
  invite_id: string;
  reason: string;
  created_at: string;
  resolved: boolean;
}

export function AdminPartnerInvitesContent() {
  const { language } = useLanguage();
  const isTh = language === 'th';
  const [data, setData] = useState<InviteReport[]>([]);
  const [abuseFlags, setAbuseFlags] = useState<AbuseFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [toneFilter, setToneFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchData = async () => {
    setLoading(true);
    const [reportRes, flagsRes] = await Promise.all([
      supabase.rpc('get_admin_partner_invite_report', {
        p_start_date: startDate || null,
        p_end_date: endDate || null,
      }),
      (supabase as any).from('partner_invite_abuse_flags').select('*').eq('resolved', false).order('created_at', { ascending: false }).limit(50),
    ]);

    if (!reportRes.error && reportRes.data) {
      let filtered = reportRes.data as unknown as InviteReport[];
      if (typeFilter !== 'all') filtered = filtered.filter(r => r.invite_type === typeFilter);
      if (toneFilter !== 'all') filtered = filtered.filter(r => r.tone === toneFilter);
      if (statusFilter !== 'all') {
        filtered = filtered.filter(r => {
          if (statusFilter === 'active') return r.status === 'active' && r.is_active && new Date(r.expires_at) > new Date();
          if (statusFilter === 'expired') return r.status !== 'active' || !r.is_active || new Date(r.expires_at) <= new Date();
          if (statusFilter === 'revoked') return r.status === 'revoked';
          return true;
        });
      }
      setData(filtered);
    }
    if (!flagsRes.error && flagsRes.data) {
      setAbuseFlags(flagsRes.data as unknown as AbuseFlag[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [startDate, endDate, typeFilter, toneFilter, statusFilter]);

  const resolveFlag = async (flagId: string) => {
    await (supabase as any).from('partner_invite_abuse_flags').update({ resolved: true }).eq('id', flagId);
    setAbuseFlags(prev => prev.filter(f => f.id !== flagId));
  };

  const exportCsv = () => {
    const headers = ['Created', 'Type', 'Tone', 'Status', 'Expires', 'Opens', 'Accepted', 'Plans', 'Booked', 'Completed', 'Kit', 'Booking', 'Sessions', 'Timer Done', 'Pair Status', 'Pair Bookings'];
    const rows = data.map(r => [
      format(new Date(r.created_at), 'yyyy-MM-dd HH:mm'),
      r.invite_type, r.tone, r.status,
      format(new Date(r.expires_at), 'yyyy-MM-dd HH:mm'),
      r.opens,
      r.accepted_count || 0, r.plans_to_test_count || 0, r.booked_count || 0, r.completed_count || 0,
      r.kit_cta, r.booking_cta, r.sessions_joined, r.timer_completed,
      r.pair_status || '', r.pair_booking_count || 0,
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `partner-invites-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totals = data.reduce((acc, r) => ({
    opens: acc.opens + r.opens,
    accepted: acc.accepted + (r.accepted_count || 0),
    plansToTest: acc.plansToTest + (r.plans_to_test_count || 0),
    booked: acc.booked + (r.booked_count || 0),
    completedResp: acc.completedResp + (r.completed_count || 0),
    sessions: acc.sessions + r.sessions_joined,
    pairBooked: acc.pairBooked + (r.pair_booking_count || 0),
    pairCompleted: acc.pairCompleted + (r.pair_status === 'completed' ? 1 : 0),
    bookingsDone: acc.bookingsDone + (r.bookings_completed || 0),
  }), { opens: 0, accepted: 0, plansToTest: 0, booked: 0, completedResp: 0, sessions: 0, pairBooked: 0, pairCompleted: 0, bookingsDone: 0 });

  const conversionRate = totals.opens > 0
    ? ((totals.booked + totals.completedResp + totals.bookingsDone) / totals.opens * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Heart className="h-6 w-6 text-primary" />
        <h2 className="text-xl font-bold text-foreground">
          {isTh ? 'รายงานชวนตรวจคู่' : 'Partner Invite Report'}
        </h2>
      </div>

      {abuseFlags.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <h3 className="font-medium text-foreground">
              {isTh ? `แจ้งเตือนการใช้งานผิดปกติ (${abuseFlags.length})` : `Abuse Flags (${abuseFlags.length})`}
            </h3>
          </div>
          <div className="space-y-2">
            {abuseFlags.slice(0, 5).map(flag => (
              <div key={flag.id} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{flag.reason} — {format(new Date(flag.created_at), 'dd/MM HH:mm')}</span>
                <Button variant="ghost" size="sm" onClick={() => resolveFlag(flag.id)}>
                  {isTh ? 'ดำเนินการแล้ว' : 'Resolve'}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: isTh ? 'คำชวน' : 'Invites', value: data.length },
          { label: isTh ? 'เปิดดู' : 'Opens', value: totals.opens },
          { label: isTh ? 'ตอบรับ' : 'Accepted', value: totals.accepted, icon: ThumbsUp },
          { label: isTh ? 'ตั้งใจตรวจ' : 'Plans', value: totals.plansToTest, icon: CalendarCheck },
          { label: isTh ? 'จอง' : 'Booked', value: totals.booked + totals.bookingsDone, icon: CheckCircle2 },
          { label: isTh ? 'ตรวจคู่' : 'Pairs', value: totals.pairCompleted, icon: Users },
          { label: isTh ? 'อัตราแปลง' : 'CVR', value: `${conversionRate}%`, isRate: true },
        ].map(s => (
          <div key={s.label} className="rounded-xl bg-card border border-border p-4 text-center">
            {'isRate' in s && s.isRate ? (
              <div className="flex items-center justify-center gap-1">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                <p className="text-2xl font-bold text-emerald-600">{s.value}</p>
              </div>
            ) : (
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
            )}
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-40" placeholder="Start" />
        <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-40" placeholder="End" />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isTh ? 'ทุกประเภท' : 'All types'}</SelectItem>
            <SelectItem value="link">Link</SelectItem>
            <SelectItem value="qr">QR</SelectItem>
            <SelectItem value="session">Session</SelectItem>
          </SelectContent>
        </Select>
        <Select value={toneFilter} onValueChange={setToneFilter}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isTh ? 'ทุกโทน' : 'All tones'}</SelectItem>
            <SelectItem value="routine">Routine</SelectItem>
            <SelectItem value="risk">Risk</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isTh ? 'ทุกสถานะ' : 'All status'}</SelectItem>
            <SelectItem value="active">{isTh ? 'ใช้งาน' : 'Active'}</SelectItem>
            <SelectItem value="expired">{isTh ? 'หมดอายุ' : 'Expired'}</SelectItem>
            <SelectItem value="revoked">{isTh ? 'ยกเลิก' : 'Revoked'}</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={exportCsv} className="gap-2 ml-auto">
          <Download className="h-4 w-4" /> CSV
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{isTh ? 'วันที่' : 'Date'}</TableHead>
              <TableHead>{isTh ? 'ประเภท' : 'Type'}</TableHead>
              <TableHead>{isTh ? 'โทน' : 'Tone'}</TableHead>
              <TableHead>{isTh ? 'สถานะ' : 'Status'}</TableHead>
              <TableHead className="text-right">{isTh ? 'เปิด' : 'Opens'}</TableHead>
              <TableHead className="text-right">{isTh ? 'ตอบรับ' : 'Accept'}</TableHead>
              <TableHead className="text-right">{isTh ? 'ตั้งใจ' : 'Plans'}</TableHead>
              <TableHead className="text-right">{isTh ? 'จอง' : 'Book'}</TableHead>
              <TableHead className="text-right">{isTh ? 'เสร็จ' : 'Done'}</TableHead>
              <TableHead>{isTh ? 'คู่' : 'Pair'}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">{isTh ? 'กำลังโหลด...' : 'Loading...'}</TableCell></TableRow>
            ) : data.length === 0 ? (
              <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">{isTh ? 'ไม่มีข้อมูล' : 'No data'}</TableCell></TableRow>
            ) : data.map(r => (
              <TableRow key={r.invite_id}>
                <TableCell className="text-sm">{format(new Date(r.created_at), 'dd/MM/yy HH:mm')}</TableCell>
                <TableCell>
                  <span className="rounded-full px-2 py-0.5 text-xs bg-primary/10 text-primary">{r.invite_type}</span>
                </TableCell>
                <TableCell>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${
                    r.tone === 'urgent' ? 'bg-red-500/10 text-red-600' :
                    r.tone === 'risk' ? 'bg-amber-500/10 text-amber-600' :
                    'bg-emerald-500/10 text-emerald-600'
                  }`}>{r.tone}</span>
                </TableCell>
                <TableCell>
                  <span className={`text-xs font-medium ${
                    r.status === 'active' && r.is_active && new Date(r.expires_at) > new Date() ? 'text-emerald-600' :
                    r.status === 'revoked' ? 'text-red-500' :
                    'text-muted-foreground'
                  }`}>
                    {r.status === 'revoked' ? (isTh ? 'ยกเลิก' : 'Revoked') :
                     r.status === 'active' && r.is_active && new Date(r.expires_at) > new Date() ? (isTh ? 'ใช้งาน' : 'Active') :
                     (isTh ? 'หมดอายุ' : 'Expired')}
                  </span>
                </TableCell>
                <TableCell className="text-right font-medium">{r.opens}</TableCell>
                <TableCell className="text-right font-medium">{r.accepted_count || 0}</TableCell>
                <TableCell className="text-right font-medium">{r.plans_to_test_count || 0}</TableCell>
                <TableCell className="text-right font-medium">{(r.booked_count || 0) + (r.bookings_completed || 0)}</TableCell>
                <TableCell className="text-right font-medium">{(r.completed_count || 0) + r.timer_completed}</TableCell>
                <TableCell>
                  {r.pair_status && (
                    <span className={`rounded-full px-2 py-0.5 text-xs ${
                      r.pair_status === 'completed' ? 'bg-emerald-500/10 text-emerald-600' :
                      r.pair_status === 'booked' ? 'bg-blue-500/10 text-blue-600' :
                      'bg-muted text-muted-foreground'
                    }`}>{r.pair_status}</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default AdminPartnerInvitesContent;
