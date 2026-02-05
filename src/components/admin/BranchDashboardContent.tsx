import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Clock, Truck, CheckCircle, AlertCircle, PackageCheck } from "lucide-react";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval, eachWeekOfInterval, subWeeks } from "date-fns";
import { th, enUS } from "date-fns/locale";

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
  requests: number;
  shipped: number;
  delivered: number;
}

interface BranchDashboardContentProps {
  userBranch: string | null;
}

export default function BranchDashboardContent({ userBranch }: BranchDashboardContentProps) {
  const { language } = useLanguage();
  const [stats, setStats] = useState<BranchStats | null>(null);
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [trendView, setTrendView] = useState<"daily" | "weekly">("daily");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userBranch) {
      fetchBranchStats();
      fetchTrendData();
    }
  }, [userBranch, trendView]);

  const fetchBranchStats = async () => {
    if (!userBranch) return;
    
    try {
      const { data: requests, error } = await supabase
        .from("hiv_selftest_requests")
        .select("status")
        .eq("assigned_branch", userBranch);

      if (error) throw error;

      const statusCounts = {
        pending: 0,
        packed: 0,
        shipped: 0,
        outForDelivery: 0,
        delivered: 0,
        confirmed: 0,
        total: requests?.length || 0,
      };

      requests?.forEach((req) => {
        switch (req.status) {
          case "pending":
          case "requested":
            statusCounts.pending++;
            break;
          case "packed":
            statusCounts.packed++;
            break;
          case "shipped":
            statusCounts.shipped++;
            break;
          case "out_for_delivery":
            statusCounts.outForDelivery++;
            break;
          case "delivered":
          case "delivered_unconfirmed":
            statusCounts.delivered++;
            break;
          case "received_confirmed":
            statusCounts.confirmed++;
            break;
        }
      });

      setStats(statusCounts);
    } catch (error) {
      console.error("Error fetching branch stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrendData = async () => {
    if (!userBranch) return;

    try {
      const now = new Date();
      let startDate: Date;
      let dateIntervals: Date[];
      
      if (trendView === "daily") {
        startDate = subDays(now, 13); // Last 14 days
        dateIntervals = eachDayOfInterval({ start: startDate, end: now });
      } else {
        startDate = subWeeks(now, 7); // Last 8 weeks
        dateIntervals = eachWeekOfInterval({ start: startDate, end: now });
      }

      const { data: requests, error } = await supabase
        .from("hiv_selftest_requests")
        .select("created_at, status, updated_at")
        .eq("assigned_branch", userBranch)
        .gte("created_at", startDate.toISOString());

      if (error) throw error;

      const locale = language === 'th' ? th : enUS;
      
      const trendPoints: TrendDataPoint[] = dateIntervals.map((date, index) => {
        let periodStart: Date;
        let periodEnd: Date;
        let label: string;
        
        if (trendView === "daily") {
          periodStart = new Date(date);
          periodStart.setHours(0, 0, 0, 0);
          periodEnd = new Date(date);
          periodEnd.setHours(23, 59, 59, 999);
          label = format(date, "d MMM", { locale });
        } else {
          periodStart = startOfWeek(date, { weekStartsOn: 1 });
          periodEnd = endOfWeek(date, { weekStartsOn: 1 });
          label = `${format(periodStart, "d", { locale })}-${format(periodEnd, "d MMM", { locale })}`;
        }

        const periodRequests = requests?.filter((req) => {
          const createdAt = new Date(req.created_at);
          return createdAt >= periodStart && createdAt <= periodEnd;
        }) || [];

        const shippedCount = periodRequests.filter((req) => 
          ["shipped", "out_for_delivery", "delivered", "delivered_unconfirmed", "received_confirmed"].includes(req.status)
        ).length;

        const deliveredCount = periodRequests.filter((req) => 
          ["delivered", "delivered_unconfirmed", "received_confirmed"].includes(req.status)
        ).length;

        return {
          date: format(date, "yyyy-MM-dd"),
          label,
          requests: periodRequests.length,
          shipped: shippedCount,
          delivered: deliveredCount,
        };
      });

      setTrendData(trendPoints);
    } catch (error) {
      console.error("Error fetching trend data:", error);
    }
  };

  const branchName = userBranch === 'silom' ? 'SWING Silom' : userBranch === 'pattaya' ? 'SWING Pattaya' : userBranch;

  const statCards = [
    {
      title: language === 'th' ? 'รอดำเนินการ' : 'Pending',
      value: stats?.pending || 0,
      icon: Clock,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/20',
    },
    {
      title: language === 'th' ? 'แพ็คแล้ว' : 'Packed',
      value: stats?.packed || 0,
      icon: Package,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
    },
    {
      title: language === 'th' ? 'จัดส่งแล้ว' : 'Shipped',
      value: stats?.shipped || 0,
      icon: Truck,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20',
    },
    {
      title: language === 'th' ? 'กำลังจัดส่ง' : 'Out for Delivery',
      value: stats?.outForDelivery || 0,
      icon: AlertCircle,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
    },
    {
      title: language === 'th' ? 'ส่งถึงแล้ว' : 'Delivered',
      value: stats?.delivered || 0,
      icon: PackageCheck,
      color: 'text-teal-500',
      bgColor: 'bg-teal-500/10',
      borderColor: 'border-teal-500/20',
    },
    {
      title: language === 'th' ? 'ยืนยันรับแล้ว' : 'Confirmed',
      value: stats?.confirmed || 0,
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/20',
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">
          {language === 'th' ? `ภาพรวมสาขา ${branchName}` : `${branchName} Overview`}
        </h2>
        <p className="text-muted-foreground">
          {language === 'th' ? 'สถิติการจัดส่งชุดตรวจ HIV ของสาขา' : 'HIV test kit delivery statistics for your branch'}
        </p>
      </div>

      {/* Total Card */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {language === 'th' ? 'จำนวนคำขอทั้งหมด' : 'Total Requests'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-primary">
            <AnimatedCounter value={stats?.total || 0} duration={1000} />
          </div>
        </CardContent>
      </Card>

      {/* Status Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {statCards.map((card, index) => (
          <Card key={index} className={`relative overflow-hidden border ${card.borderColor}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <span className={`text-2xl font-bold ${card.color}`}>
                <AnimatedCounter value={card.value} duration={800} />
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Trend Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">
            {language === 'th' ? 'แนวโน้มการจัดส่ง' : 'Delivery Trend'}
          </CardTitle>
          <Tabs value={trendView} onValueChange={(v) => setTrendView(v as "daily" | "weekly")}>
            <TabsList className="h-8">
              <TabsTrigger value="daily" className="text-xs px-3 h-7">
                {language === 'th' ? 'รายวัน' : 'Daily'}
              </TabsTrigger>
              <TabsTrigger value="weekly" className="text-xs px-3 h-7">
                {language === 'th' ? 'รายสัปดาห์' : 'Weekly'}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorShipped" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorDelivered" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="label" 
                  tick={{ fontSize: 10 }} 
                  tickLine={false}
                  axisLine={false}
                  className="text-muted-foreground"
                />
                <YAxis 
                  tick={{ fontSize: 10 }} 
                  tickLine={false}
                  axisLine={false}
                  className="text-muted-foreground"
                  allowDecimals={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '12px' }}
                  formatter={(value) => {
                    const labels: Record<string, string> = {
                      requests: language === 'th' ? 'คำขอใหม่' : 'New Requests',
                      shipped: language === 'th' ? 'จัดส่งแล้ว' : 'Shipped',
                      delivered: language === 'th' ? 'ส่งถึงแล้ว' : 'Delivered',
                    };
                    return labels[value] || value;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="requests"
                  stroke="hsl(var(--primary))"
                  fillOpacity={1}
                  fill="url(#colorRequests)"
                  strokeWidth={2}
                  name="requests"
                />
                <Area
                  type="monotone"
                  dataKey="shipped"
                  stroke="#8b5cf6"
                  fillOpacity={1}
                  fill="url(#colorShipped)"
                  strokeWidth={2}
                  name="shipped"
                />
                <Area
                  type="monotone"
                  dataKey="delivered"
                  stroke="#22c55e"
                  fillOpacity={1}
                  fill="url(#colorDelivered)"
                  strokeWidth={2}
                  name="delivered"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {language === 'th' ? 'การดำเนินการด่วน' : 'Quick Actions'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            {language === 'th' 
              ? 'ใช้แท็บ "ชุดตรวจ" ด้านบนเพื่อจัดการคำขอชุดตรวจ HIV, อัพเดทสถานะ หรือเพิ่มเลขพัสดุ' 
              : 'Use the "Orders" tab above to manage HIV kit requests, update status, or add tracking numbers.'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
