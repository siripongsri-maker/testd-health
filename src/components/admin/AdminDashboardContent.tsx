import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Package, FileText, Eye, TrendingUp, Activity } from "lucide-react";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardStats {
  totalUsers: number;
  totalOrders: number;
  pendingOrders: number;
  totalArticles: number;
  publishedArticles: number;
  totalPageviews: number;
  todayVisitors: number;
}

export default function AdminDashboardContent() {
  const { language } = useLanguage();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch all stats in parallel
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

  const statCards = [
    {
      title: language === 'th' ? 'ผู้ใช้ทั้งหมด' : 'Total Users',
      value: stats?.totalUsers || 0,
      icon: Users,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: language === 'th' ? 'ออร์เดอร์ทั้งหมด' : 'Total Orders',
      value: stats?.totalOrders || 0,
      icon: Package,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: language === 'th' ? 'รอดำเนินการ' : 'Pending Orders',
      value: stats?.pendingOrders || 0,
      icon: Activity,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
    {
      title: language === 'th' ? 'บทความที่เผยแพร่' : 'Published Articles',
      value: stats?.publishedArticles || 0,
      subtitle: `/ ${stats?.totalArticles || 0} ${language === 'th' ? 'ทั้งหมด' : 'total'}`,
      icon: FileText,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: language === 'th' ? 'การเข้าชมทั้งหมด' : 'Total Pageviews',
      value: stats?.totalPageviews || 0,
      icon: Eye,
      color: 'text-pink-500',
      bgColor: 'bg-pink-500/10',
    },
    {
      title: language === 'th' ? 'ผู้เข้าชมวันนี้' : 'Today Visitors',
      value: stats?.todayVisitors || 0,
      icon: TrendingUp,
      color: 'text-teal-500',
      bgColor: 'bg-teal-500/10',
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">
          {language === 'th' ? 'ภาพรวมระบบ' : 'System Overview'}
        </h2>
        <p className="text-muted-foreground">
          {language === 'th' ? 'สถิติและข้อมูลสำคัญของระบบ' : 'Key statistics and system metrics'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card, index) => (
          <Card key={index} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">
                  <AnimatedCounter value={card.value} duration={1000} />
                </span>
                {card.subtitle && (
                  <span className="text-sm text-muted-foreground">
                    {card.subtitle}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {language === 'th' ? 'การดำเนินการด่วน' : 'Quick Actions'}
          </CardTitle>
        </CardHeader>
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
