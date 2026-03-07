import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Heart, AlertTriangle, TrendingUp, ThumbsUp, CalendarCheck, CheckCircle2, Users, Shield, Eye, ShieldAlert, UserCheck } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
  inviter_trust_tier: string | null;
  abuse_flag_count: number | null;
}

interface AbuseFlag {
  id: string;
  invite_id: string | null;
  user_id: string | null;
  visitor_session_id: string | null;
  abuse_type: string;
  severity: string;
  score: number;
  evidence: any;
  status: string;
  admin_note: string | null;
  created_at: string;
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
  const [activeTab, setActiveTab] = useState('overview');
  const [reviewNote, setReviewNote] = useState('');

  const fetchData = async () => {
    setLoading(true);
    const [reportRes, flagsRes] = await Promise.all([
      supabase.rpc('get_admin_partner_invite_report', {
        p_start_date: startDate || null,
        p_end_date: endDate || null,
      }),
      (supabase as any).from('partner_invite_abuse_flags').select('*').order('created_at', { ascending: false }).limit(100),
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
          if (statusFilter === 'flagged') return (r.abuse_flag_count || 0) > 0;
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

  const updateFlagStatus = async (flagId: string, newStatus: string) => {
    try {
      await supabase.rpc('update_abuse_flag_status' as any, {
        p_flag_id: flagId,
        p_status: newStatus,
        p_note: reviewNote || null,
      });
      setReviewNote('');
      toast.success(isTh ? 'อัพเดทแล้ว' : 'Updated');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed');
    }
  };

  const updateTrustTier = async (userId: string, tier: string) => {
    try {
      await supabase.rpc('update_user_trust_tier' as any, {
        p_user_id: userId,
        p_trust_tier: tier,
      });
      toast.success(isTh ? 'อัพเดท Trust Tier แล้ว' : 'Trust tier updated');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed');
    }
  };

  const exportCsv = () => {
    const headers = ['Created', 'Type', 'Tone', 'Status', 'Trust', 'Opens', 'Accepted', 'Plans', 'Booked', 'Completed', 'Flags', 'Pair Status'];
    const rows = data.map(r => [
      format(new Date(r.created_at), 'yyyy-MM-dd HH:mm'),
      r.invite_type, r.tone, r.status, r.inviter_trust_tier || 'new',
      r.opens,
      r.accepted_count || 0, r.plans_to_test_count || 0, r.booked_count || 0, r.completed_count || 0,
      r.abuse_flag_count || 0, r.pair_status || '',
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
    pairCompleted: acc.pairCompleted + (r.pair_status === 'completed' ? 1 : 0),
    bookingsDone: acc.bookingsDone + (r.bookings_completed || 0),
    flagged: acc.flagged + ((r.abuse_flag_count || 0) > 0 ? 1 : 0),
  }), { opens: 0, accepted: 0, plansToTest: 0, booked: 0, completedResp: 0, sessions: 0, pairCompleted: 0, bookingsDone: 0, flagged: 0 });

  const conversionRate = totals.opens > 0
    ? ((totals.booked + totals.completedResp + totals.bookingsDone) / totals.opens * 100).toFixed(1)
    : '0';

  const openFlags = abuseFlags.filter(f => f.status === 'open' || f.status === 'reviewing');

  const severityColor = (s: string) => s === 'high' ? 'text-red-600 bg-red-500/10' : s === 'medium' ? 'text-amber-600 bg-amber-500/10' : 'text-muted-foreground bg-muted';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Heart className="h-6 w-6 text-primary" />
        <h2 className="text-xl font-bold text-foreground">
          {isTh ? 'รายงานชวนตรวจคู่' : 'Partner Invite Report'}
        </h2>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">{isTh ? 'ภาพรวม' : 'Overview'}</TabsTrigger>
          <TabsTrigger value="abuse" className="gap-1">
            <ShieldAlert className="h-3 w-3" />
            {isTh ? 'ตรวจสอบ' : 'Review'}
            {openFlags.length > 0 && (
              <span className="ml-1 rounded-full bg-destructive px-1.5 py-0.5 text-[10px] text-destructive-foreground">{openFlags.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="trust">{isTh ? 'Trust Tier' : 'Trust Tiers'}</TabsTrigger>
        </TabsList>

        {/* ===== OVERVIEW TAB ===== */}
        <TabsContent value="overview" className="space-y-6 mt-4">
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            {[
              { label: isTh ? 'คำชวน' : 'Invites', value: data.length },
              { label: isTh ? 'เปิดดู' : 'Opens', value: totals.opens },
              { label: isTh ? 'ตอบรับ' : 'Accepted', value: totals.accepted },
              { label: isTh ? 'ตั้งใจ' : 'Plans', value: totals.plansToTest },
              { label: isTh ? 'จอง' : 'Booked', value: totals.booked + totals.bookingsDone },
              { label: isTh ? 'ตรวจคู่' : 'Pairs', value: totals.pairCompleted },
              { label: isTh ? 'มีแฟลก' : 'Flagged', value: totals.flagged, warn: true },
              { label: 'CVR', value: `${conversionRate}%`, isRate: true },
            ].map(s => (
              <div key={s.label} className="rounded-xl bg-card border border-border p-4 text-center">
                {'isRate' in s && s.isRate ? (
                  <div className="flex items-center justify-center gap-1">
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                    <p className="text-2xl font-bold text-emerald-600">{s.value}</p>
                  </div>
                ) : 'warn' in s && s.warn ? (
                  <p className={cn("text-2xl font-bold", Number(s.value) > 0 ? "text-amber-600" : "text-foreground")}>{s.value}</p>
                ) : (
                  <p className="text-2xl font-bold text-foreground">{s.value}</p>
                )}
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-40" />
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-40" />
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
                <SelectItem value="flagged">{isTh ? 'มีแฟลก' : 'Flagged'}</SelectItem>
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
                  <TableHead>Trust</TableHead>
                  <TableHead>{isTh ? 'สถานะ' : 'Status'}</TableHead>
                  <TableHead className="text-right">{isTh ? 'เปิด' : 'Opens'}</TableHead>
                  <TableHead className="text-right">{isTh ? 'ตอบรับ' : 'Accept'}</TableHead>
                  <TableHead className="text-right">{isTh ? 'จอง' : 'Book'}</TableHead>
                  <TableHead className="text-right">{isTh ? 'เสร็จ' : 'Done'}</TableHead>
                  <TableHead>{isTh ? 'แฟลก' : 'Flags'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">{isTh ? 'กำลังโหลด...' : 'Loading...'}</TableCell></TableRow>
                ) : data.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">{isTh ? 'ไม่มีข้อมูล' : 'No data'}</TableCell></TableRow>
                ) : data.map(r => (
                  <TableRow key={r.invite_id}>
                    <TableCell className="text-sm">{format(new Date(r.created_at), 'dd/MM/yy')}</TableCell>
                    <TableCell>
                      <span className="rounded-full px-2 py-0.5 text-xs bg-primary/10 text-primary">{r.invite_type}</span>
                    </TableCell>
                    <TableCell>
                      <span className={cn("rounded-full px-2 py-0.5 text-xs",
                        r.inviter_trust_tier === 'trusted' ? 'bg-emerald-500/10 text-emerald-600' :
                        r.inviter_trust_tier === 'admin' ? 'bg-primary/10 text-primary' :
                        r.inviter_trust_tier === 'standard' ? 'bg-blue-500/10 text-blue-600' :
                        'bg-muted text-muted-foreground'
                      )}>{r.inviter_trust_tier || 'new'}</span>
                    </TableCell>
                    <TableCell>
                      <span className={cn("text-xs font-medium",
                        r.status === 'active' && r.is_active && new Date(r.expires_at) > new Date() ? 'text-emerald-600' :
                        r.status === 'revoked' ? 'text-red-500' : 'text-muted-foreground'
                      )}>
                        {r.status === 'revoked' ? (isTh ? 'ยกเลิก' : 'Revoked') :
                         r.status === 'active' && r.is_active && new Date(r.expires_at) > new Date() ? (isTh ? 'ใช้งาน' : 'Active') :
                         (isTh ? 'หมดอายุ' : 'Expired')}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium">{r.opens}</TableCell>
                    <TableCell className="text-right font-medium">{r.accepted_count || 0}</TableCell>
                    <TableCell className="text-right font-medium">{(r.booked_count || 0) + (r.bookings_completed || 0)}</TableCell>
                    <TableCell className="text-right font-medium">{(r.completed_count || 0) + r.timer_completed}</TableCell>
                    <TableCell>
                      {(r.abuse_flag_count || 0) > 0 && (
                        <span className="rounded-full px-2 py-0.5 text-xs bg-amber-500/10 text-amber-600">
                          {r.abuse_flag_count}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ===== ABUSE REVIEW TAB ===== */}
        <TabsContent value="abuse" className="space-y-4 mt-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-600" />
            {isTh ? `คิวตรวจสอบ (${openFlags.length} รายการเปิด)` : `Review Queue (${openFlags.length} open)`}
          </h3>
          {abuseFlags.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">{isTh ? 'ไม่มีแฟลก' : 'No abuse flags'}</p>
          ) : (
            <div className="space-y-3">
              {abuseFlags.map(flag => (
                <div key={flag.id} className={cn(
                  "rounded-xl border p-4 space-y-2",
                  flag.status === 'open' ? 'border-amber-500/30 bg-amber-500/5' :
                  flag.status === 'reviewing' ? 'border-blue-500/30 bg-blue-500/5' :
                  'border-border bg-card'
                )}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", severityColor(flag.severity))}>
                        {flag.severity}
                      </span>
                      <span className="text-sm font-medium text-foreground">{flag.abuse_type}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{format(new Date(flag.created_at), 'dd/MM HH:mm')}</span>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">{JSON.stringify(flag.evidence)}</p>
                  {flag.admin_note && <p className="text-xs text-foreground italic">Note: {flag.admin_note}</p>}
                  <div className="flex items-center gap-2 pt-1">
                    <Input
                      placeholder={isTh ? 'หมายเหตุ (ถ้ามี)' : 'Note (optional)'}
                      value={reviewNote}
                      onChange={e => setReviewNote(e.target.value)}
                      className="h-8 text-xs flex-1"
                    />
                    {flag.status !== 'resolved' && (
                      <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => updateFlagStatus(flag.id, 'resolved')}>
                        {isTh ? 'แก้ไขแล้ว' : 'Resolve'}
                      </Button>
                    )}
                    {flag.status !== 'ignored' && (
                      <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => updateFlagStatus(flag.id, 'ignored')}>
                        {isTh ? 'เพิกเฉย' : 'Ignore'}
                      </Button>
                    )}
                    {flag.status === 'open' && (
                      <Button size="sm" variant="secondary" className="h-8 text-xs" onClick={() => updateFlagStatus(flag.id, 'reviewing')}>
                        {isTh ? 'กำลังตรวจ' : 'Reviewing'}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ===== TRUST TIER TAB ===== */}
        <TabsContent value="trust" className="space-y-4 mt-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            {isTh ? 'จัดการ Trust Tier' : 'Trust Tier Management'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {isTh
              ? 'Trust Tier กำหนดจำนวนคำชวนที่สร้างได้ต่อวันและสิทธิ์ในการใช้ระบบ Relay'
              : 'Trust tiers control daily invite limits and relay access permissions'}
          </p>
          <div className="rounded-xl border border-border p-4">
            <div className="grid grid-cols-4 gap-4 text-center text-sm">
              {['new', 'standard', 'trusted', 'admin'].map(tier => (
                <div key={tier} className={cn("rounded-lg p-3 border",
                  tier === 'admin' ? 'border-primary/30 bg-primary/5' :
                  tier === 'trusted' ? 'border-emerald-500/30 bg-emerald-500/5' :
                  tier === 'standard' ? 'border-blue-500/30 bg-blue-500/5' :
                  'border-border bg-muted/30'
                )}>
                  <p className="font-semibold text-foreground capitalize">{tier}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {tier === 'new' ? '5/day' : tier === 'standard' ? '10/day' : tier === 'trusted' ? '15/day' : '50/day'}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {tier === 'new' ? 'No relay' : tier === 'standard' ? 'No relay' : tier === 'trusted' ? 'Relay ready' : 'Unrestricted'}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {isTh ? 'ใช้ปุ่ม Trust ในตารางภาพรวมเพื่อปรับ Tier ของแต่ละ Inviter' : 'Use the Trust column in the Overview table to adjust individual inviter tiers'}
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AdminPartnerInvitesContent;
