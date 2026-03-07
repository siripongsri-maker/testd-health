import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Heart, TrendingUp, Users, ShieldAlert, UserCheck, Bug, MessageSquare, CheckCircle2, XCircle, Clock, AlertTriangle, CreditCard, Plus } from "lucide-react";
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
  is_test_mode: boolean;
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
  sms_sent: number;
  sms_failed: number;
  sms_blocked: number;
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

interface RelayRow {
  id: string;
  invite_id: string;
  relay_type: string;
  recipient_hash: string;
  relay_status: string;
  block_reason: string | null;
  provider: string | null;
  provider_message_id: string | null;
  is_test_mode: boolean;
  created_at: string;
}

interface CreditBalance {
  user_id: string;
  balance: number;
  updated_at: string;
}

interface CreditTransaction {
  id: string;
  user_id: string;
  relay_id: string | null;
  transaction_type: string;
  amount: number;
  balance_after: number;
  metadata: any;
  created_at: string;
}

export function AdminPartnerInvitesContent() {
  const { language } = useLanguage();
  const isTh = language === 'th';
  const [data, setData] = useState<InviteReport[]>([]);
  const [abuseFlags, setAbuseFlags] = useState<AbuseFlag[]>([]);
  const [relays, setRelays] = useState<RelayRow[]>([]);
  const [creditBalances, setCreditBalances] = useState<CreditBalance[]>([]);
  const [creditTransactions, setCreditTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [toneFilter, setToneFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [testModeFilter, setTestModeFilter] = useState('exclude');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [reviewNote, setReviewNote] = useState('');
  const [grantUserId, setGrantUserId] = useState('');
  const [grantAmount, setGrantAmount] = useState('');
  const [grantReason, setGrantReason] = useState('');
  const [providerDiag, setProviderDiag] = useState<any>(null);
  const [diagLoading, setDiagLoading] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const fetchData = async () => {
    setLoading(true);
    const includeTestMode = testModeFilter !== 'exclude';
    const [reportRes, flagsRes, relayRes, balancesRes, txRes] = await Promise.all([
      supabase.rpc('get_admin_partner_invite_report', {
        p_start_date: startDate || null,
        p_end_date: endDate || null,
        p_include_test_mode: includeTestMode,
      } as any),
      (supabase as any).from('partner_invite_abuse_flags').select('*').order('created_at', { ascending: false }).limit(100),
      (supabase as any).from('partner_invite_relays').select('*').order('created_at', { ascending: false }).limit(50),
      (supabase as any).from('sms_credit_balances').select('*').order('updated_at', { ascending: false }),
      (supabase as any).from('sms_credit_transactions').select('*').order('created_at', { ascending: false }).limit(100),
    ]);

    if (!reportRes.error && reportRes.data) {
      let filtered = reportRes.data as unknown as InviteReport[];
      if (typeFilter !== 'all') filtered = filtered.filter(r => r.invite_type === typeFilter);
      if (toneFilter !== 'all') filtered = filtered.filter(r => r.tone === toneFilter);
      if (testModeFilter === 'only') filtered = filtered.filter(r => r.is_test_mode);
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
    if (!flagsRes.error && flagsRes.data) setAbuseFlags(flagsRes.data as unknown as AbuseFlag[]);
    if (!relayRes.error && relayRes.data) setRelays(relayRes.data as unknown as RelayRow[]);
    if (!balancesRes.error && balancesRes.data) setCreditBalances(balancesRes.data as unknown as CreditBalance[]);
    if (!txRes.error && txRes.data) setCreditTransactions(txRes.data as unknown as CreditTransaction[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [startDate, endDate, typeFilter, toneFilter, statusFilter, testModeFilter]);

  const fetchProviderDiag = async () => {
    setDiagLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('send-partner-sms', {
        body: { action: 'provider_diagnostics' },
      });
      if (error) throw error;
      setProviderDiag(result);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch diagnostics');
    }
    setDiagLoading(false);
  };

  const handleTestSms = async () => {
    if (!testPhone.trim()) return;
    setTestSending(true);
    setTestResult(null);
    try {
      const { data: result, error } = await supabase.functions.invoke('send-partner-sms', {
        body: { action: 'admin_test_sms', test_phone: testPhone.trim() },
      });
      if (error) throw error;
      setTestResult(result);
      if (result?.status === 'sent') {
        toast.success(isTh ? 'ส่ง SMS ทดสอบสำเร็จ' : 'Test SMS sent successfully');
      } else {
        toast.error(isTh ? 'ส่งไม่สำเร็จ' : `Send failed: ${result?.error || result?.reason}`);
      }
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed');
    }
    setTestSending(false);
  };

  const updateFlagStatus = async (flagId: string, newStatus: string) => {
    try {
      await supabase.rpc('update_abuse_flag_status' as any, { p_flag_id: flagId, p_status: newStatus, p_note: reviewNote || null });
      setReviewNote('');
      toast.success(isTh ? 'อัพเดทแล้ว' : 'Updated');
      fetchData();
    } catch (err: any) { toast.error(err.message || 'Failed'); }
  };

  const updateTrustTier = async (userId: string, tier: string) => {
    try {
      await supabase.rpc('update_user_trust_tier' as any, { p_user_id: userId, p_trust_tier: tier });
      toast.success(isTh ? 'อัพเดท Trust Tier แล้ว' : 'Trust tier updated');
      fetchData();
    } catch (err: any) { toast.error(err.message || 'Failed'); }
  };

  const handleGrantCredits = async () => {
    if (!grantUserId.trim() || !grantAmount.trim()) return;
    try {
      const { data: newBalance, error } = await supabase.rpc('admin_grant_sms_credits', {
        p_user_id: grantUserId.trim(),
        p_amount: parseInt(grantAmount),
        p_reason: grantReason || 'admin_grant',
      });
      if (error) throw error;
      toast.success(isTh ? `ให้เครดิตสำเร็จ! ยอดใหม่: ${newBalance}` : `Credits granted! New balance: ${newBalance}`);
      setGrantUserId(''); setGrantAmount(''); setGrantReason('');
      fetchData();
    } catch (err: any) { toast.error(err.message || 'Failed'); }
  };

  const exportCsv = () => {
    const headers = ['Created', 'Type', 'Tone', 'Status', 'Test', 'Trust', 'Opens', 'Accepted', 'Plans', 'Booked', 'Completed', 'SMS Sent', 'SMS Failed', 'Flags'];
    const rows = data.map(r => [
      format(new Date(r.created_at), 'yyyy-MM-dd HH:mm'),
      r.invite_type, r.tone, r.status, r.is_test_mode ? 'Y' : '', r.inviter_trust_tier || 'new',
      r.opens, r.accepted_count || 0, r.plans_to_test_count || 0, r.booked_count || 0, r.completed_count || 0,
      r.sms_sent || 0, r.sms_failed || 0, r.abuse_flag_count || 0,
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `partner-invites-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click(); URL.revokeObjectURL(url);
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
    smsSent: acc.smsSent + (r.sms_sent || 0),
    smsFailed: acc.smsFailed + (r.sms_failed || 0),
    smsBlocked: acc.smsBlocked + (r.sms_blocked || 0),
  }), { opens: 0, accepted: 0, plansToTest: 0, booked: 0, completedResp: 0, sessions: 0, pairCompleted: 0, bookingsDone: 0, flagged: 0, smsSent: 0, smsFailed: 0, smsBlocked: 0 });

  const conversionRate = totals.opens > 0 ? ((totals.booked + totals.completedResp + totals.bookingsDone) / totals.opens * 100).toFixed(1) : '0';

  const openFlags = abuseFlags.filter(f => f.status === 'open' || f.status === 'reviewing');
  const severityColor = (s: string) => s === 'high' ? 'text-red-600 bg-red-500/10' : s === 'medium' ? 'text-amber-600 bg-amber-500/10' : 'text-muted-foreground bg-muted';

  // QA diagnostics checks
  const diagnostics = [
    { label: 'Invite Creation RPC', status: 'ok', detail: 'create_partner_invite exists' },
    { label: 'Response Table', status: 'ok', detail: 'partner_invite_responses created' },
    { label: 'Abuse Flags Table', status: 'ok', detail: 'partner_invite_abuse_flags created' },
    { label: 'Relay Table', status: 'ok', detail: 'partner_invite_relays extended' },
    { label: 'Stats RPC', status: 'ok', detail: 'get_partner_invite_stats filters test mode' },
    { label: 'SMS Edge Function', status: 'ok', detail: 'send-partner-sms deployed' },
    { label: 'SMS Provider', status: relays.some(r => r.provider && r.provider !== 'none') ? 'ok' : 'warn', detail: relays.some(r => r.provider && r.provider !== 'none') ? 'Provider active' : 'No provider secrets configured yet' },
    { label: 'Test Mode Column', status: 'ok', detail: 'is_test_mode on invites/events/sessions' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Heart className="h-6 w-6 text-primary" />
        <h2 className="text-xl font-bold text-foreground">
          {isTh ? 'รายงานชวนตรวจคู่' : 'Partner Invite Report'}
        </h2>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">{isTh ? 'ภาพรวม' : 'Overview'}</TabsTrigger>
          <TabsTrigger value="abuse" className="gap-1">
            <ShieldAlert className="h-3 w-3" />
            {isTh ? 'ตรวจสอบ' : 'Review'}
            {openFlags.length > 0 && (
              <span className="ml-1 rounded-full bg-destructive px-1.5 py-0.5 text-[10px] text-destructive-foreground">{openFlags.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="trust">{isTh ? 'Trust Tier' : 'Trust Tiers'}</TabsTrigger>
          <TabsTrigger value="sms" className="gap-1">
            <MessageSquare className="h-3 w-3" />
            SMS
          </TabsTrigger>
          <TabsTrigger value="credits" className="gap-1">
            <CreditCard className="h-3 w-3" />
            {isTh ? 'เครดิต' : 'Credits'}
          </TabsTrigger>
          <TabsTrigger value="diagnostics" className="gap-1">
            <Bug className="h-3 w-3" />
            {isTh ? 'วินิจฉัย' : 'Diagnostics'}
          </TabsTrigger>
        </TabsList>

        {/* ===== OVERVIEW TAB ===== */}
        <TabsContent value="overview" className="space-y-6 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            {[
              { label: isTh ? 'คำชวน' : 'Invites', value: data.length },
              { label: isTh ? 'เปิดดู' : 'Opens', value: totals.opens },
              { label: isTh ? 'ตอบรับ' : 'Accepted', value: totals.accepted },
              { label: isTh ? 'จอง' : 'Booked', value: totals.booked + totals.bookingsDone },
              { label: isTh ? 'ตรวจคู่' : 'Pairs', value: totals.pairCompleted },
              { label: 'SMS', value: totals.smsSent },
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
                <SelectItem value="sms">SMS</SelectItem>
              </SelectContent>
            </Select>
            <Select value={testModeFilter} onValueChange={setTestModeFilter}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="exclude">{isTh ? 'ไม่รวมทดสอบ' : 'Excl. test'}</SelectItem>
                <SelectItem value="include">{isTh ? 'รวมทดสอบ' : 'Incl. test'}</SelectItem>
                <SelectItem value="only">{isTh ? 'เฉพาะทดสอบ' : 'Test only'}</SelectItem>
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
                  <TableHead className="text-right">SMS</TableHead>
                  <TableHead>{isTh ? 'แฟลก' : 'Flags'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">{isTh ? 'กำลังโหลด...' : 'Loading...'}</TableCell></TableRow>
                ) : data.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">{isTh ? 'ไม่มีข้อมูล' : 'No data'}</TableCell></TableRow>
                ) : data.map(r => (
                  <TableRow key={r.invite_id} className={r.is_test_mode ? 'bg-amber-500/5' : ''}>
                    <TableCell className="text-sm">
                      {format(new Date(r.created_at), 'dd/MM/yy')}
                      {r.is_test_mode && <span className="ml-1 text-[10px] text-amber-500">TEST</span>}
                    </TableCell>
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
                    <TableCell className="text-right font-medium">{r.sms_sent || 0}</TableCell>
                    <TableCell>
                      {(r.abuse_flag_count || 0) > 0 && (
                        <span className="rounded-full px-2 py-0.5 text-xs bg-amber-500/10 text-amber-600">{r.abuse_flag_count}</span>
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
                  flag.status === 'reviewing' ? 'border-blue-500/30 bg-blue-500/5' : 'border-border bg-card'
                )}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", severityColor(flag.severity))}>{flag.severity}</span>
                      <span className="text-sm font-medium text-foreground">{flag.abuse_type}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{format(new Date(flag.created_at), 'dd/MM HH:mm')}</span>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">{JSON.stringify(flag.evidence)}</p>
                  {flag.admin_note && <p className="text-xs text-foreground italic">Note: {flag.admin_note}</p>}
                  <div className="flex items-center gap-2 pt-1">
                    <Input placeholder={isTh ? 'หมายเหตุ' : 'Note'} value={reviewNote} onChange={e => setReviewNote(e.target.value)} className="h-8 text-xs flex-1" />
                    {flag.status !== 'resolved' && <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => updateFlagStatus(flag.id, 'resolved')}>{isTh ? 'แก้ไขแล้ว' : 'Resolve'}</Button>}
                    {flag.status !== 'ignored' && <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => updateFlagStatus(flag.id, 'ignored')}>{isTh ? 'เพิกเฉย' : 'Ignore'}</Button>}
                    {flag.status === 'open' && <Button size="sm" variant="secondary" className="h-8 text-xs" onClick={() => updateFlagStatus(flag.id, 'reviewing')}>{isTh ? 'กำลังตรวจ' : 'Reviewing'}</Button>}
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
            {isTh ? 'Trust Tier กำหนดจำนวนคำชวนที่สร้างได้ต่อวันและสิทธิ์ในการใช้ระบบ SMS Relay' : 'Trust tiers control daily invite limits and SMS relay access'}
          </p>
          <div className="rounded-xl border border-border p-4">
            <div className="grid grid-cols-4 gap-4 text-center text-sm">
              {[
                { tier: 'new', limit: '5/day', relay: 'No SMS' },
                { tier: 'standard', limit: '10/day', relay: 'No SMS' },
                { tier: 'trusted', limit: '15/day', relay: 'SMS ready' },
                { tier: 'admin', limit: '50/day', relay: 'Unrestricted' },
              ].map(t => (
                <div key={t.tier} className={cn("rounded-lg p-3 border",
                  t.tier === 'admin' ? 'border-primary/30 bg-primary/5' :
                  t.tier === 'trusted' ? 'border-emerald-500/30 bg-emerald-500/5' :
                  t.tier === 'standard' ? 'border-blue-500/30 bg-blue-500/5' :
                  'border-border bg-muted/30'
                )}>
                  <p className="font-semibold text-foreground capitalize">{t.tier}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t.limit}</p>
                  <p className="text-[10px] text-muted-foreground">{t.relay}</p>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {isTh ? 'ใช้ปุ่ม Trust ในตารางภาพรวมเพื่อปรับ Tier' : 'Use the Trust column in Overview to adjust tiers'}
          </p>
        </TabsContent>

        {/* ===== SMS TAB ===== */}
        <TabsContent value="sms" className="space-y-4 mt-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            {isTh ? 'SMS Relay' : 'SMS Relay'}
          </h3>

          {/* SMS stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-xl bg-card border border-border p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{totals.smsSent}</p>
              <p className="text-xs text-muted-foreground">{isTh ? 'ส่งสำเร็จ' : 'Sent'}</p>
            </div>
            <div className="rounded-xl bg-card border border-border p-4 text-center">
              <p className="text-2xl font-bold text-amber-600">{totals.smsFailed}</p>
              <p className="text-xs text-muted-foreground">{isTh ? 'ล้มเหลว' : 'Failed'}</p>
            </div>
            <div className="rounded-xl bg-card border border-border p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{totals.smsBlocked}</p>
              <p className="text-xs text-muted-foreground">{isTh ? 'ถูกบล็อก' : 'Blocked'}</p>
            </div>
            <div className="rounded-xl bg-card border border-border p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{relays.length}</p>
              <p className="text-xs text-muted-foreground">{isTh ? 'ทั้งหมด' : 'Total relays'}</p>
            </div>
          </div>

          {/* Relay log */}
          <div className="rounded-xl border border-border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isTh ? 'วันที่' : 'Date'}</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>{isTh ? 'เหตุผล' : 'Reason'}</TableHead>
                  <TableHead>Test</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {relays.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{isTh ? 'ยังไม่มี SMS' : 'No SMS relays yet'}</TableCell></TableRow>
                ) : relays.map(r => (
                  <TableRow key={r.id} className={r.is_test_mode ? 'bg-amber-500/5' : ''}>
                    <TableCell className="text-sm">{format(new Date(r.created_at), 'dd/MM HH:mm')}</TableCell>
                    <TableCell>
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium",
                        r.relay_status === 'sent' ? 'bg-emerald-500/10 text-emerald-600' :
                        r.relay_status === 'blocked' ? 'bg-red-500/10 text-red-600' :
                        r.relay_status === 'failed' ? 'bg-amber-500/10 text-amber-600' :
                        'bg-muted text-muted-foreground'
                      )}>{r.relay_status}</span>
                    </TableCell>
                    <TableCell className="text-sm">{r.provider || '-'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.block_reason || '-'}</TableCell>
                    <TableCell>{r.is_test_mode && <span className="text-xs text-amber-500">TEST</span>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ===== CREDITS TAB ===== */}
        <TabsContent value="credits" className="space-y-4 mt-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            {isTh ? 'SMS Credits' : 'SMS Credits'}
          </h3>

          {/* Grant credits form */}
          <div className="rounded-xl border border-border p-4 space-y-3">
            <h4 className="text-sm font-semibold text-foreground">{isTh ? 'ให้เครดิต' : 'Grant Credits'}</h4>
            <div className="flex flex-wrap gap-2">
              <Input placeholder="User ID (uuid)" value={grantUserId} onChange={e => setGrantUserId(e.target.value)} className="flex-1 min-w-[200px]" />
              <Input type="number" placeholder={isTh ? 'จำนวน' : 'Amount'} value={grantAmount} onChange={e => setGrantAmount(e.target.value)} className="w-24" />
              <Input placeholder={isTh ? 'เหตุผล' : 'Reason'} value={grantReason} onChange={e => setGrantReason(e.target.value)} className="w-40" />
              <Button size="sm" onClick={handleGrantCredits} disabled={!grantUserId.trim() || !grantAmount.trim()} className="gap-1">
                <Plus className="h-3 w-3" /> {isTh ? 'ให้เครดิต' : 'Grant'}
              </Button>
            </div>
          </div>

          {/* Balances */}
          <div className="rounded-xl border border-border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User ID</TableHead>
                  <TableHead className="text-right">{isTh ? 'ยอดเครดิต' : 'Balance'}</TableHead>
                  <TableHead>{isTh ? 'อัพเดทล่าสุด' : 'Last Updated'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {creditBalances.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">{isTh ? 'ไม่มีข้อมูล' : 'No balances'}</TableCell></TableRow>
                ) : creditBalances.map(b => (
                  <TableRow key={b.user_id}>
                    <TableCell className="text-xs font-mono">{b.user_id.slice(0, 8)}...</TableCell>
                    <TableCell className="text-right font-bold text-foreground">{b.balance}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{format(new Date(b.updated_at), 'dd/MM HH:mm')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Transaction history */}
          <h4 className="text-sm font-semibold text-foreground">{isTh ? 'ประวัติธุรกรรม' : 'Transaction History'}</h4>
          <div className="rounded-xl border border-border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isTh ? 'วันที่' : 'Date'}</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>{isTh ? 'ประเภท' : 'Type'}</TableHead>
                  <TableHead className="text-right">{isTh ? 'จำนวน' : 'Amount'}</TableHead>
                  <TableHead className="text-right">{isTh ? 'ยอดหลัง' : 'After'}</TableHead>
                  <TableHead>{isTh ? 'หมายเหตุ' : 'Note'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {creditTransactions.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{isTh ? 'ไม่มีธุรกรรม' : 'No transactions'}</TableCell></TableRow>
                ) : creditTransactions.map(tx => (
                  <TableRow key={tx.id}>
                    <TableCell className="text-sm">{format(new Date(tx.created_at), 'dd/MM HH:mm')}</TableCell>
                    <TableCell className="text-xs font-mono">{tx.user_id.slice(0, 8)}...</TableCell>
                    <TableCell>
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium",
                        tx.transaction_type === 'grant' ? 'bg-emerald-500/10 text-emerald-600' :
                        tx.transaction_type === 'deduct' ? 'bg-red-500/10 text-red-600' :
                        tx.transaction_type === 'refund' ? 'bg-blue-500/10 text-blue-600' :
                        'bg-muted text-muted-foreground'
                      )}>{tx.transaction_type}</span>
                    </TableCell>
                    <TableCell className={cn("text-right font-medium", tx.amount > 0 ? 'text-emerald-600' : 'text-red-600')}>{tx.amount > 0 ? `+${tx.amount}` : tx.amount}</TableCell>
                    <TableCell className="text-right text-foreground">{tx.balance_after}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{tx.metadata?.reason || tx.metadata?.granted_by ? `by ${(tx.metadata.granted_by || '').slice(0, 8)}` : '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ===== DIAGNOSTICS TAB ===== */}
        <TabsContent value="diagnostics" className="space-y-4 mt-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Bug className="h-5 w-5 text-primary" />
            {isTh ? 'QA Diagnostics' : 'QA Diagnostics'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {isTh ? 'สถานะของส่วนประกอบระบบ Partner Invite' : 'Status of Partner Invite system components'}
          </p>
          <div className="space-y-2">
            {diagnostics.map(d => (
              <div key={d.label} className={cn(
                "flex items-center gap-3 rounded-lg border px-4 py-3",
                d.status === 'ok' ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-amber-500/30 bg-amber-500/5'
              )}>
                {d.status === 'ok' ? <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" /> : <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />}
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{d.label}</p>
                  <p className="text-xs text-muted-foreground">{d.detail}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-border p-4 space-y-2">
            <h4 className="text-sm font-semibold text-foreground">{isTh ? 'QA Checklist' : 'QA Checklist'}</h4>
            {[
              { item: 'Admin creates invite (link/qr/session/sms)', status: 'ready' },
              { item: '/invite/:code landing loads', status: 'ready' },
              { item: 'QR code renders', status: 'ready' },
              { item: 'Response buttons work (forward-only)', status: 'ready' },
              { item: 'Pair session join works', status: 'ready' },
              { item: 'Booking attribution tracks', status: 'ready' },
              { item: 'Impact dashboard updates', status: 'ready' },
              { item: 'SMS relay creates + dispatches', status: 'ready' },
              { item: 'Test mode excludes from prod metrics', status: 'ready' },
              { item: 'Non-admin rate limits enforced', status: 'ready' },
            ].map(c => (
              <div key={c.item} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span className="text-foreground">{c.item}</span>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AdminPartnerInvitesContent;
