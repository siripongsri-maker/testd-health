import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users, Package, CalendarDays, Heart, MessageSquare, CreditCard,
  ShieldAlert, TrendingUp, AlertTriangle, Building2, Eye, Activity,
  CheckCircle, XCircle, Clock, Link2, UserCheck, Gift, Bot,
} from "lucide-react";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend,
} from "recharts";
import { format, subDays, eachDayOfInterval, subWeeks, eachWeekOfInterval, startOfWeek, endOfWeek } from "date-fns";
import { th, enUS } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface PlatformStats {
  totalUsers: number;
  activeUsers7d: number;
  totalSelftestRequests: number;
  totalBookings: number;
  completedBookings: number;
  autoCheckout: number;
  noShowTotal: number;
  totalInvites: number;
  inviteConversionRate: number;
  pairSessions: number;
  completedPairs: number;
  smsSent: number;
  smsSuccessRate: number;
  totalCreditsIssued: number;
  totalCreditsPurchased: number;
  pendingPayments: number;
  openAbuseFlags: number;
  activeRewards: number;
  todayPageviews: number;
}

interface Alert {
  label: string;
  count: number;
  severity: 'warning' | 'error' | 'info';
  icon: React.ElementType;
}

const fetchAllPaginated = async (table: string, select: string, filters?: Record<string, unknown>) => {
  const PAGE_SIZE = 1000;
  let allData: any[] = [];
  let from = 0;
  let hasMore = true;
  while (hasMore) {
    let q = (supabase as any).from(table).select(select).range(from, from + PAGE_SIZE - 1);
    if (filters) {
      Object.entries(filters).forEach(([key, val]) => {
        q = q.eq(key, val);
      });
    }
    const { data, error } = await q;
    if (error) break;
    allData.push(...(data || []));
    hasMore = (data?.length || 0) === PAGE_SIZE;
    from += PAGE_SIZE;
  }
  return allData;
};

export default function AdminDashboardContent() {
  const { language } = useLanguage();
  const isTh = language === 'th';
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [trendView, setTrendView] = useState<"7d" | "30d">("7d");
  const [bookingTrend, setBookingTrend] = useState<any[]>([]);
  const [inviteFunnel, setInviteFunnel] = useState<any>(null);

  useEffect(() => { fetchPlatformStats(); }, []);
  useEffect(() => { fetchTrends(); }, [trendView]);

  const fetchPlatformStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const sevenDaysAgo = subDays(new Date(), 7).toISOString();

      const [
        profilesRes,
        activeUsersRes,
        selftestRes,
        bookingsRes,
        completedBookingsRes,
        autoCheckoutRes,
        autoNoShowRes,
        noShowRes,
        invitesRes,
        inviteEventsRes,
        pairSessionsRes,
        completedPairsRes,
        relaysRes,
        relaysSentRes,
        creditBalancesRes,
        purchasesRes,
        pendingPurchasesRes,
        abuseFlagsRes,
        rewardsRes,
        todayPageviewsRes,
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).gte("updated_at", sevenDaysAgo),
        supabase.from("hiv_selftest_requests").select("id", { count: "exact", head: true }),
        supabase.from("appointments").select("id", { count: "exact", head: true }),
        supabase.from("appointments").select("id", { count: "exact", head: true }).in("status", ["completed", "checked_out"]),
        supabase.from("appointments").select("id", { count: "exact", head: true }).not("auto_checked_out_at", "is", null),
        supabase.from("appointments").select("id", { count: "exact", head: true }).eq("status", "no_show"),
        supabase.from("appointments").select("id", { count: "exact", head: true }).eq("status", "no_show"),
        supabase.from("partner_invites").select("id", { count: "exact", head: true }).eq("is_test_mode", false),
        supabase.from("partner_invite_events").select("id", { count: "exact", head: true }).eq("event_type", "open").eq("is_test_mode", false),
        supabase.from("partner_test_sessions").select("id", { count: "exact", head: true }).eq("is_test_mode", false),
        supabase.from("partner_test_sessions").select("id", { count: "exact", head: true }).eq("status", "completed").eq("is_test_mode", false),
        (supabase as any).from("partner_invite_relays").select("id", { count: "exact", head: true }),
        (supabase as any).from("partner_invite_relays").select("id", { count: "exact", head: true }).eq("relay_status", "sent"),
        (supabase as any).from("sms_credit_balances").select("balance"),
        (supabase as any).from("sms_credit_purchases").select("id, credits, status"),
        (supabase as any).from("sms_credit_purchases").select("id", { count: "exact", head: true }).eq("status", "pending"),
        (supabase as any).from("partner_invite_abuse_flags").select("id", { count: "exact", head: true }).in("status", ["open", "reviewing"]),
        supabase.from("homepage_rewards").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("analytics_events").select("id", { count: "exact", head: true }).eq("event_type", "pageview").gte("created_at", today),
      ]);

      const totalRelays = relaysRes?.count || 0;
      const sentRelays = relaysSentRes?.count || 0;
      const balances = creditBalancesRes?.data || [];
      const totalCreditsIssued = balances.reduce((sum: number, b: any) => sum + (b.balance || 0), 0);
      const purchases = purchasesRes?.data || [];
      const totalCreditsPurchased = purchases.filter((p: any) => p.status === 'completed').reduce((sum: number, p: any) => sum + (p.credits || 0), 0);
      const inviteCount = invitesRes?.count || 0;
      const openCount = inviteEventsRes?.count || 0;
      const convRate = inviteCount > 0 ? Math.round((openCount / inviteCount) * 100) : 0;

      setStats({
        totalUsers: profilesRes.count || 0,
        activeUsers7d: activeUsersRes.count || 0,
        totalSelftestRequests: selftestRes.count || 0,
        totalBookings: bookingsRes.count || 0,
        completedBookings: completedBookingsRes.count || 0,
        totalInvites: inviteCount,
        inviteConversionRate: convRate,
        pairSessions: pairSessionsRes.count || 0,
        completedPairs: completedPairsRes.count || 0,
        smsSent: sentRelays,
        smsSuccessRate: totalRelays > 0 ? Math.round((sentRelays / totalRelays) * 100) : 0,
        totalCreditsIssued,
        totalCreditsPurchased,
        pendingPayments: pendingPurchasesRes?.count || 0,
        openAbuseFlags: abuseFlagsRes?.count || 0,
        activeRewards: rewardsRes.count || 0,
        todayPageviews: todayPageviewsRes.count || 0,
      });

      // Build alerts
      const alertList: Alert[] = [];
      if ((pendingPurchasesRes?.count || 0) > 0)
        alertList.push({ label: isTh ? 'การชำระเงินรอตรวจสอบ' : 'Pending payment verification', count: pendingPurchasesRes?.count || 0, severity: 'warning', icon: CreditCard });
      if ((abuseFlagsRes?.count || 0) > 0)
        alertList.push({ label: isTh ? 'แฟลกที่ยังไม่ตรวจสอบ' : 'Unresolved abuse flags', count: abuseFlagsRes?.count || 0, severity: 'error', icon: ShieldAlert });
      
      // Check for failed SMS in last 24h
      const { count: failedSms } = await (supabase as any)
        .from("partner_invite_relays")
        .select("id", { count: "exact", head: true })
        .eq("relay_status", "failed")
        .gte("created_at", subDays(new Date(), 1).toISOString());
      if ((failedSms || 0) > 0)
        alertList.push({ label: isTh ? 'SMS ล้มเหลวใน 24 ชม.' : 'Failed SMS in 24h', count: failedSms || 0, severity: 'error', icon: MessageSquare });
      
      setAlerts(alertList);
    } catch (error) {
      console.error("Dashboard stats error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrends = async () => {
    try {
      const days = trendView === "7d" ? 7 : 30;
      const startDate = subDays(new Date(), days);
      const intervals = trendView === "7d"
        ? eachDayOfInterval({ start: startDate, end: new Date() })
        : eachWeekOfInterval({ start: startDate, end: new Date() });

      // Fetch bookings for the trend period
      const { data: bookings } = await supabase
        .from("appointments")
        .select("appointment_date, status")
        .gte("appointment_date", format(startDate, 'yyyy-MM-dd'));

      // Fetch invites for funnel
      const { data: invites } = await supabase
        .from("partner_invites")
        .select("id")
        .eq("is_test_mode", false);

      const { data: inviteResponses } = await (supabase as any)
        .from("partner_invite_responses")
        .select("response_state");

      const { data: relayData } = await (supabase as any)
        .from("partner_invite_relays")
        .select("relay_status, is_test_mode")
        .eq("is_test_mode", false);

      const locale = isTh ? th : enUS;
      const trendPoints = intervals.map(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayBookings = bookings?.filter(b => b.appointment_date === dateStr) || [];
        return {
          label: format(date, trendView === "7d" ? "EEE" : "d MMM", { locale }),
          booked: dayBookings.length,
          completed: dayBookings.filter(b => b.status === 'completed').length,
          cancelled: dayBookings.filter(b => b.status === 'cancelled').length,
        };
      });
      setBookingTrend(trendPoints);

      // Build invite funnel
      const totalInvites = invites?.length || 0;
      const responses = inviteResponses || [];
      const accepted = responses.filter((r: any) => r.response_state === 'accepted').length;
      const plans = responses.filter((r: any) => r.response_state === 'plans_to_test').length;
      const booked = responses.filter((r: any) => r.response_state === 'booked').length;
      const completed = responses.filter((r: any) => r.response_state === 'completed').length;

      setInviteFunnel({
        sent: totalInvites,
        accepted,
        plans,
        booked,
        completed,
      });
    } catch (error) {
      console.error("Trend fetch error:", error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[...Array(12)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const s = stats!;

  const kpiCards = [
    { label: isTh ? 'ผู้ใช้ทั้งหมด' : 'Total Users', value: s.totalUsers, icon: Users, color: 'text-blue-600' },
    { label: isTh ? 'ใช้งาน 7 วัน' : 'Active 7d', value: s.activeUsers7d, icon: Activity, color: 'text-emerald-600' },
    { label: isTh ? 'คำขอตรวจ HIV' : 'Self-Test Requests', value: s.totalSelftestRequests, icon: Package, color: 'text-purple-600' },
    { label: isTh ? 'จองทั้งหมด' : 'Total Bookings', value: s.totalBookings, icon: CalendarDays, color: 'text-sky-600' },
    { label: isTh ? 'จองสำเร็จ' : 'Completed Bookings', value: s.completedBookings, icon: CheckCircle, color: 'text-emerald-600' },
    { label: isTh ? 'คำชวนส่งแล้ว' : 'Invites Sent', value: s.totalInvites, icon: Heart, color: 'text-pink-600' },
    { label: isTh ? 'อัตรา Conversion' : 'Invite CVR', value: `${s.inviteConversionRate}%`, icon: TrendingUp, color: 'text-emerald-600', isRate: true },
    { label: isTh ? 'ตรวจคู่' : 'Pair Sessions', value: s.pairSessions, icon: Link2, color: 'text-indigo-600' },
    { label: isTh ? 'คู่สำเร็จ' : 'Completed Pairs', value: s.completedPairs, icon: UserCheck, color: 'text-emerald-600' },
    { label: 'SMS Sent', value: s.smsSent, icon: MessageSquare, color: 'text-sky-600' },
    { label: isTh ? 'SMS สำเร็จ' : 'SMS Success', value: `${s.smsSuccessRate}%`, icon: CheckCircle, color: s.smsSuccessRate >= 90 ? 'text-emerald-600' : 'text-amber-600', isRate: true },
    { label: isTh ? 'เครดิตคงเหลือรวม' : 'Total Credits', value: s.totalCreditsIssued, icon: CreditCard, color: 'text-violet-600' },
    { label: isTh ? 'เครดิตซื้อแล้ว' : 'Purchased Credits', value: s.totalCreditsPurchased, icon: CreditCard, color: 'text-emerald-600' },
    { label: isTh ? 'จ่ายรอตรวจ' : 'Pending Payments', value: s.pendingPayments, icon: Clock, color: s.pendingPayments > 0 ? 'text-amber-600' : 'text-muted-foreground' },
    { label: isTh ? 'แฟลกเปิด' : 'Open Flags', value: s.openAbuseFlags, icon: ShieldAlert, color: s.openAbuseFlags > 0 ? 'text-red-600' : 'text-muted-foreground' },
    { label: isTh ? 'ผู้เข้าชมวันนี้' : 'Today Views', value: s.todayPageviews, icon: Eye, color: 'text-sky-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">{isTh ? 'ศูนย์ปฏิบัติการ testD' : 'testD Operations Center'}</h2>
        <p className="text-sm text-muted-foreground">{isTh ? 'ภาพรวมแพลตฟอร์มแบบเรียลไทม์' : 'Real-time platform overview'}</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-3">
        {kpiCards.map((card, i) => (
          <Card key={i} className="relative overflow-hidden border border-border/50">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-1">
                <card.icon className={cn("h-4 w-4", card.color)} />
              </div>
              <div className="text-xl font-bold text-foreground">
                {card.isRate ? card.value : <AnimatedCounter value={Number(card.value)} duration={800} />}
              </div>
              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{card.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alerts Row */}
      {alerts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {alerts.map((alert, i) => (
            <Card key={i} className={cn(
              "border-l-4",
              alert.severity === 'error' ? 'border-l-red-500 bg-red-500/5' :
              alert.severity === 'warning' ? 'border-l-amber-500 bg-amber-500/5' :
              'border-l-blue-500 bg-blue-500/5'
            )}>
              <CardContent className="p-3 flex items-center gap-3">
                <alert.icon className={cn("h-5 w-5 shrink-0",
                  alert.severity === 'error' ? 'text-red-600' :
                  alert.severity === 'warning' ? 'text-amber-600' : 'text-blue-600'
                )} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{alert.label}</p>
                </div>
                <span className={cn("text-lg font-bold",
                  alert.severity === 'error' ? 'text-red-600' :
                  alert.severity === 'warning' ? 'text-amber-600' : 'text-blue-600'
                )}>{alert.count}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Booking Trend Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">{isTh ? 'แนวโน้มการจอง' : 'Booking Trend'}</CardTitle>
          <Tabs value={trendView} onValueChange={(v) => setTrendView(v as "7d" | "30d")}>
            <TabsList className="h-7">
              <TabsTrigger value="7d" className="text-xs px-3 h-6">7d</TabsTrigger>
              <TabsTrigger value="30d" className="text-xs px-3 h-6">30d</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bookingTrend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '11px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="booked" name={isTh ? 'จอง' : 'Booked'} fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                <Bar dataKey="completed" name={isTh ? 'สำเร็จ' : 'Completed'} fill="hsl(142, 76%, 36%)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="cancelled" name={isTh ? 'ยกเลิก' : 'Cancelled'} fill="hsl(0, 72%, 50%)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Funnels Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Invite Funnel */}
        {inviteFunnel && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Heart className="h-4 w-4 text-pink-600" />
                {isTh ? 'Funnel ชวนตรวจ' : 'Invite Funnel'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  { label: isTh ? 'ส่งคำชวน' : 'Sent', value: inviteFunnel.sent, color: 'bg-primary' },
                  { label: isTh ? 'ตอบรับ' : 'Accepted', value: inviteFunnel.accepted, color: 'bg-blue-500' },
                  { label: isTh ? 'วางแผน' : 'Plans to Test', value: inviteFunnel.plans, color: 'bg-amber-500' },
                  { label: isTh ? 'จองแล้ว' : 'Booked', value: inviteFunnel.booked, color: 'bg-emerald-500' },
                  { label: isTh ? 'ตรวจแล้ว' : 'Completed', value: inviteFunnel.completed, color: 'bg-emerald-700' },
                ].map((step, idx) => {
                  const maxVal = inviteFunnel.sent || 1;
                  const pct = Math.round((step.value / maxVal) * 100);
                  return (
                    <div key={idx} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-24 shrink-0 text-right">{step.label}</span>
                      <div className="flex-1 h-6 bg-muted/30 rounded-md overflow-hidden relative">
                        <div
                          className={cn("h-full rounded-md transition-all duration-500", step.color)}
                          style={{ width: `${Math.max(pct, 2)}%` }}
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-foreground">
                          {step.value} ({pct}%)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* SMS Credit Funnel */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-violet-600" />
              {isTh ? 'สรุปเครดิต SMS' : 'SMS Credit Summary'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: isTh ? 'คงเหลือรวม' : 'Total Balance', value: s.totalCreditsIssued, color: 'text-violet-600' },
                { label: isTh ? 'ซื้อแล้ว' : 'Purchased', value: s.totalCreditsPurchased, color: 'text-emerald-600' },
                { label: isTh ? 'SMS ส่งแล้ว' : 'SMS Sent', value: s.smsSent, color: 'text-sky-600' },
                { label: isTh ? 'สำเร็จ' : 'Success Rate', value: `${s.smsSuccessRate}%`, color: s.smsSuccessRate >= 90 ? 'text-emerald-600' : 'text-amber-600', isRate: true },
              ].map((item, idx) => (
                <div key={idx} className="rounded-xl bg-muted/20 border border-border/30 p-3 text-center">
                  <p className={cn("text-xl font-bold", item.color)}>
                    {(item as any).isRate ? item.value : <AnimatedCounter value={Number(item.value)} duration={800} />}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{item.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Self-Test Branch Overview */}
      <BranchOverviewSection language={language} />
    </div>
  );
}

/** Branch overview section - keeps existing logic */
function BranchOverviewSection({ language }: { language: string }) {
  const isTh = language === 'th';
  const [silomStats, setSilomStats] = useState<any>(null);
  const [pattayaStats, setPattayaStats] = useState<any>(null);

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    const fetchBranch = async (branch: string) => {
      const PAGE_SIZE = 1000;
      const allData: { status: string }[] = [];
      let from = 0;
      let hasMore = true;
      while (hasMore) {
        const { data } = await supabase
          .from("hiv_selftest_requests")
          .select("status")
          .eq("assigned_branch", branch)
          .range(from, from + PAGE_SIZE - 1);
        allData.push(...(data || []));
        hasMore = (data?.length || 0) === PAGE_SIZE;
        from += PAGE_SIZE;
      }
      const counts = { pending: 0, shipped: 0, confirmed: 0, total: allData.length };
      allData.forEach(r => {
        if (['pending', 'requested'].includes(r.status)) counts.pending++;
        else if (['shipped', 'out_for_delivery'].includes(r.status)) counts.shipped++;
        else if (['received_confirmed', 'delivered', 'delivered_unconfirmed'].includes(r.status)) counts.confirmed++;
      });
      return counts;
    };

    const [s, p] = await Promise.all([fetchBranch("silom"), fetchBranch("pattaya")]);
    setSilomStats(s);
    setPattayaStats(p);
  };

  const BranchMini = ({ name, stats }: { name: string; stats: any }) => (
    <Card className="border border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold text-sm text-foreground">{name}</span>
          </div>
          <span className="text-lg font-bold text-foreground">{stats?.total || 0}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-amber-500/10 p-2">
            <p className="text-sm font-bold text-amber-600">{stats?.pending || 0}</p>
            <p className="text-[10px] text-muted-foreground">{isTh ? 'รอ' : 'Pending'}</p>
          </div>
          <div className="rounded-lg bg-blue-500/10 p-2">
            <p className="text-sm font-bold text-blue-600">{stats?.shipped || 0}</p>
            <p className="text-[10px] text-muted-foreground">{isTh ? 'ส่ง' : 'Shipped'}</p>
          </div>
          <div className="rounded-lg bg-emerald-500/10 p-2">
            <p className="text-sm font-bold text-emerald-600">{stats?.confirmed || 0}</p>
            <p className="text-[10px] text-muted-foreground">{isTh ? 'รับ' : 'Done'}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div>
      <h3 className="text-base font-semibold mb-3 flex items-center gap-2 text-foreground">
        <Building2 className="h-4 w-4" />
        {isTh ? 'สาขาตรวจ HIV Self-Test' : 'HIV Self-Test by Branch'}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <BranchMini name="SWING Silom" stats={silomStats} />
        <BranchMini name="SWING Pattaya" stats={pattayaStats} />
      </div>
    </div>
  );
}
