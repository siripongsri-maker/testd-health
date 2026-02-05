import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Package, FileText, Eye, TrendingUp, Activity, Clock, Truck, CheckCircle, PackageCheck, Building2 } from "lucide-react";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from "recharts";
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval, eachWeekOfInterval, subWeeks } from "date-fns";
import { th, enUS } from "date-fns/locale";

interface DashboardStats {
  totalUsers: number;
  totalOrders: number;
  pendingOrders: number;
  totalArticles: number;
  publishedArticles: number;
  totalPageviews: number;
  todayVisitors: number;
}

interface BranchStats {
  pending: number;
  packed: number;
  shipped: number;
  outForDelivery: number;
  delivered: number;
  confirmed: number;
  total: number;
}

interface TrendDataPoint {
  date: string;
  label: string;
  silomRequests: number;
  silomShipped: number;
  silomDelivered: number;
  pattayaRequests: number;
  pattayaShipped: number;
  pattayaDelivered: number;
}

export default function AdminDashboardContent() {
  const { language } = useLanguage();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [silomStats, setSilomStats] = useState<BranchStats | null>(null);
  const [pattayaStats, setPattayaStats] = useState<BranchStats | null>(null);
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [trendView, setTrendView] = useState<"daily" | "weekly">("daily");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchBranchStats();
  }, []);

  useEffect(() => {
    fetchTrendData();
  }, [trendView]);

  const fetchStats = async () => {
    try {
      const [
        profilesResult,
        kitOrdersResult,
        pendingOrdersResult,
        articlesResult,
        publishedArticlesResult,
        pageviewsResult,
        todayVisitorsResult
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("kit_orders").select("id", { count: "exact", head: true }),
        supabase.from("kit_orders").select("id", { count: "exact", head: true }).in("status", ["requested", "packed"]),
        supabase.from("blog_articles").select("id", { count: "exact", head: true }),
        supabase.from("blog_articles").select("id", { count: "exact", head: true }).eq("status", "published"),
        supabase.from("analytics_events").select("id", { count: "exact", head: true }).eq("event_type", "pageview"),
        supabase.from("analytics_events").select("id", { count: "exact", head: true })
          .eq("event_type", "pageview")
          .gte("created_at", new Date().toISOString().split('T')[0])
      ]);

      setStats({
        totalUsers: profilesResult.count || 0,
        totalOrders: kitOrdersResult.count || 0,
        pendingOrders: pendingOrdersResult.count || 0,
        totalArticles: articlesResult.count || 0,
        publishedArticles: publishedArticlesResult.count || 0,
        totalPageviews: pageviewsResult.count || 0,
        todayVisitors: todayVisitorsResult.count || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranchStats = async () => {
    try {
      const [silomResult, pattayaResult] = await Promise.all([
        supabase.from("hiv_selftest_requests").select("status").eq("assigned_branch", "silom"),
        supabase.from("hiv_selftest_requests").select("status").eq("assigned_branch", "pattaya"),
      ]);

      const countByStatus = (requests: { status: string }[] | null): BranchStats => {
        const counts = {
          pending: 0, packed: 0, shipped: 0, outForDelivery: 0, delivered: 0, confirmed: 0, total: requests?.length || 0
        };
        requests?.forEach((req) => {
          switch (req.status) {
            case "pending": case "requested": counts.pending++; break;
            case "packed": counts.packed++; break;
            case "shipped": counts.shipped++; break;
            case "out_for_delivery": counts.outForDelivery++; break;
            case "delivered": case "delivered_unconfirmed": counts.delivered++; break;
            case "received_confirmed": counts.confirmed++; break;
          }
        });
        return counts;
      };

      setSilomStats(countByStatus(silomResult.data));
      setPattayaStats(countByStatus(pattayaResult.data));
    } catch (error) {
      console.error("Error fetching branch stats:", error);
    }
  };

  const fetchTrendData = async () => {
    try {
      const now = new Date();
      let startDate: Date;
      let dateIntervals: Date[];
      
      if (trendView === "daily") {
        startDate = subDays(now, 13);
        dateIntervals = eachDayOfInterval({ start: startDate, end: now });
      } else {
        startDate = subWeeks(now, 7);
        dateIntervals = eachWeekOfInterval({ start: startDate, end: now });
      }

      const [silomResult, pattayaResult] = await Promise.all([
        supabase.from("hiv_selftest_requests").select("created_at, status").eq("assigned_branch", "silom").gte("created_at", startDate.toISOString()),
        supabase.from("hiv_selftest_requests").select("created_at, status").eq("assigned_branch", "pattaya").gte("created_at", startDate.toISOString()),
      ]);

      const locale = language === 'th' ? th : enUS;
      
      const trendPoints: TrendDataPoint[] = dateIntervals.map((date) => {
        let periodStart: Date, periodEnd: Date, label: string;
        
        if (trendView === "daily") {
          periodStart = new Date(date); periodStart.setHours(0, 0, 0, 0);
          periodEnd = new Date(date); periodEnd.setHours(23, 59, 59, 999);
          label = format(date, "d MMM", { locale });
        } else {
          periodStart = startOfWeek(date, { weekStartsOn: 1 });
          periodEnd = endOfWeek(date, { weekStartsOn: 1 });
          label = `${format(periodStart, "d", { locale })}-${format(periodEnd, "d MMM", { locale })}`;
        }

        const filterPeriod = (data: { created_at: string; status: string }[] | null) => 
          data?.filter((req) => {
            const createdAt = new Date(req.created_at);
            return createdAt >= periodStart && createdAt <= periodEnd;
          }) || [];

        const countStats = (requests: { status: string }[]) => ({
          requests: requests.length,
          shipped: requests.filter((r) => ["shipped", "out_for_delivery", "delivered", "delivered_unconfirmed", "received_confirmed"].includes(r.status)).length,
          delivered: requests.filter((r) => ["delivered", "delivered_unconfirmed", "received_confirmed"].includes(r.status)).length,
        });

        const silomPeriod = countStats(filterPeriod(silomResult.data));
        const pattayaPeriod = countStats(filterPeriod(pattayaResult.data));

        return {
          date: format(date, "yyyy-MM-dd"),
          label,
          silomRequests: silomPeriod.requests,
          silomShipped: silomPeriod.shipped,
          silomDelivered: silomPeriod.delivered,
          pattayaRequests: pattayaPeriod.requests,
          pattayaShipped: pattayaPeriod.shipped,
          pattayaDelivered: pattayaPeriod.delivered,
        };
      });

      setTrendData(trendPoints);
    } catch (error) {
      console.error("Error fetching trend data:", error);
    }
  };

  const systemStatCards = [
    { title: language === 'th' ? 'ผู้ใช้ทั้งหมด' : 'Total Users', value: stats?.totalUsers || 0, icon: Users, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
    { title: language === 'th' ? 'ออร์เดอร์ทั้งหมด' : 'Total Orders', value: stats?.totalOrders || 0, icon: Package, color: 'text-green-500', bgColor: 'bg-green-500/10' },
    { title: language === 'th' ? 'รอดำเนินการ' : 'Pending Orders', value: stats?.pendingOrders || 0, icon: Activity, color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
    { title: language === 'th' ? 'บทความที่เผยแพร่' : 'Published Articles', value: stats?.publishedArticles || 0, subtitle: `/ ${stats?.totalArticles || 0} ${language === 'th' ? 'ทั้งหมด' : 'total'}`, icon: FileText, color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
    { title: language === 'th' ? 'การเข้าชมทั้งหมด' : 'Total Pageviews', value: stats?.totalPageviews || 0, icon: Eye, color: 'text-pink-500', bgColor: 'bg-pink-500/10' },
    { title: language === 'th' ? 'ผู้เข้าชมวันนี้' : 'Today Visitors', value: stats?.todayVisitors || 0, icon: TrendingUp, color: 'text-teal-500', bgColor: 'bg-teal-500/10' },
  ];

  const branchComparisonData = [
    { name: language === 'th' ? 'รอดำเนินการ' : 'Pending', silom: silomStats?.pending || 0, pattaya: pattayaStats?.pending || 0 },
    { name: language === 'th' ? 'แพ็คแล้ว' : 'Packed', silom: silomStats?.packed || 0, pattaya: pattayaStats?.packed || 0 },
    { name: language === 'th' ? 'จัดส่งแล้ว' : 'Shipped', silom: silomStats?.shipped || 0, pattaya: pattayaStats?.shipped || 0 },
    { name: language === 'th' ? 'กำลังส่ง' : 'Out for Delivery', silom: silomStats?.outForDelivery || 0, pattaya: pattayaStats?.outForDelivery || 0 },
    { name: language === 'th' ? 'ส่งถึงแล้ว' : 'Delivered', silom: silomStats?.delivered || 0, pattaya: pattayaStats?.delivered || 0 },
    { name: language === 'th' ? 'ยืนยันรับ' : 'Confirmed', silom: silomStats?.confirmed || 0, pattaya: pattayaStats?.confirmed || 0 },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div><Skeleton className="h-8 w-48 mb-2" /><Skeleton className="h-4 w-72" /></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const BranchCard = ({ name, stats, color }: { name: string; stats: BranchStats | null; color: string }) => (
    <Card className={`border-2 ${color}`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Building2 className="h-5 w-5" />
          {name}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold mb-4">
          <AnimatedCounter value={stats?.total || 0} duration={1000} />
          <span className="text-sm font-normal text-muted-foreground ml-2">
            {language === 'th' ? 'คำขอทั้งหมด' : 'total requests'}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded-lg bg-orange-500/10">
            <Clock className="h-4 w-4 mx-auto text-orange-500 mb-1" />
            <div className="text-lg font-bold text-orange-500">{stats?.pending || 0}</div>
            <div className="text-xs text-muted-foreground">{language === 'th' ? 'รอ' : 'Wait'}</div>
          </div>
          <div className="p-2 rounded-lg bg-purple-500/10">
            <Truck className="h-4 w-4 mx-auto text-purple-500 mb-1" />
            <div className="text-lg font-bold text-purple-500">{stats?.shipped || 0}</div>
            <div className="text-xs text-muted-foreground">{language === 'th' ? 'ส่ง' : 'Ship'}</div>
          </div>
          <div className="p-2 rounded-lg bg-green-500/10">
            <CheckCircle className="h-4 w-4 mx-auto text-green-500 mb-1" />
            <div className="text-lg font-bold text-green-500">{stats?.confirmed || 0}</div>
            <div className="text-xs text-muted-foreground">{language === 'th' ? 'รับ' : 'Done'}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{language === 'th' ? 'ภาพรวมระบบ' : 'System Overview'}</h2>
        <p className="text-muted-foreground">{language === 'th' ? 'สถิติและข้อมูลสำคัญของระบบ' : 'Key statistics and system metrics'}</p>
      </div>

      {/* System Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {systemStatCards.map((card, index) => (
          <Card key={index} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold"><AnimatedCounter value={card.value} duration={1000} /></span>
                {card.subtitle && <span className="text-sm text-muted-foreground">{card.subtitle}</span>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Branch Overview Section */}
      <div>
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          {language === 'th' ? 'ภาพรวมสาขา HIV Self-Test' : 'HIV Self-Test Branch Overview'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <BranchCard name="SWING Silom" stats={silomStats} color="border-blue-500/30" />
          <BranchCard name="SWING Pattaya" stats={pattayaStats} color="border-cyan-500/30" />
        </div>
      </div>

      {/* Branch Comparison Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {language === 'th' ? 'เปรียบเทียบสถานะระหว่างสาขา' : 'Branch Status Comparison'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={branchComparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="silom" name="Silom" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pattaya" name="Pattaya" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Trend Chart - Both Branches */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">{language === 'th' ? 'แนวโน้มการจัดส่งทุกสาขา' : 'All Branches Delivery Trend'}</CardTitle>
          <Tabs value={trendView} onValueChange={(v) => setTrendView(v as "daily" | "weekly")}>
            <TabsList className="h-8">
              <TabsTrigger value="daily" className="text-xs px-3 h-7">{language === 'th' ? 'รายวัน' : 'Daily'}</TabsTrigger>
              <TabsTrigger value="weekly" className="text-xs px-3 h-7">{language === 'th' ? 'รายสัปดาห์' : 'Weekly'}</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSilom" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorPattaya" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(value, name) => {
                    const labels: Record<string, string> = {
                      silomRequests: 'Silom - ' + (language === 'th' ? 'คำขอ' : 'Requests'),
                      silomDelivered: 'Silom - ' + (language === 'th' ? 'ส่งถึง' : 'Delivered'),
                      pattayaRequests: 'Pattaya - ' + (language === 'th' ? 'คำขอ' : 'Requests'),
                      pattayaDelivered: 'Pattaya - ' + (language === 'th' ? 'ส่งถึง' : 'Delivered'),
                    };
                    return [value, labels[name as string] || name];
                  }}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '11px' }}
                  formatter={(value) => {
                    const labels: Record<string, string> = {
                      silomRequests: `Silom (${language === 'th' ? 'คำขอ' : 'Req'})`,
                      silomDelivered: `Silom (${language === 'th' ? 'ส่งถึง' : 'Del'})`,
                      pattayaRequests: `Pattaya (${language === 'th' ? 'คำขอ' : 'Req'})`,
                      pattayaDelivered: `Pattaya (${language === 'th' ? 'ส่งถึง' : 'Del'})`,
                    };
                    return labels[value] || value;
                  }}
                />
                <Area type="monotone" dataKey="silomRequests" stroke="#3b82f6" fillOpacity={1} fill="url(#colorSilom)" strokeWidth={2} />
                <Area type="monotone" dataKey="silomDelivered" stroke="#1d4ed8" fillOpacity={0} strokeWidth={2} strokeDasharray="5 5" />
                <Area type="monotone" dataKey="pattayaRequests" stroke="#06b6d4" fillOpacity={1} fill="url(#colorPattaya)" strokeWidth={2} />
                <Area type="monotone" dataKey="pattayaDelivered" stroke="#0891b2" fillOpacity={0} strokeWidth={2} strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">{language === 'th' ? 'การดำเนินการด่วน' : 'Quick Actions'}</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            {language === 'th' 
              ? 'ใช้แท็บด้านบนเพื่อจัดการออร์เดอร์ชุดตรวจ HIV, ดูข้อมูลวิเคราะห์, หรือจัดการบทความ' 
              : 'Use the tabs above to manage HIV kit orders, view analytics, or manage blog posts.'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
