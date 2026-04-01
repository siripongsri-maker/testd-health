
import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, RefreshCw, ClipboardCheck, Search, Bot,
  Package, MessageCircle, AlertTriangle, Shield, ArrowRightLeft
} from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";

interface DemoStats {
  total_profiles: number;
  msm_count: number;
  msw_count: number;
  age_stats: Array<{ range: string; count: number }>;
  gender_stats: Array<{ identity: string; count: number }>;
  behavior_stats: Array<{ category: string; count: number }>;
  total_checkins: number;
  total_screenings: number;
  total_ai_conversations: number;
  total_selftest_requests: number;
  total_peer_posts: number;
  total_distress_alerts: number;
  total_safer_plans: number;
  total_referrals: number;
  monthly_trend: Array<{ month: string; checkins: number; screenings: number }>;
}

export default function AdminDemographicsContent() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const [stats, setStats] = useState<DemoStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_hr_demographic_stats");
      if (error) throw error;
      if (data && Array.isArray(data) && data.length > 0) {
        const row = data[0] as any;
        setStats({
          total_profiles: Number(row.total_profiles) || 0,
          msm_count: Number(row.msm_count) || 0,
          msw_count: Number(row.msw_count) || 0,
          age_stats: (row.age_stats || []).map((a: any) => ({ range: a.range, count: Number(a.count) })),
          gender_stats: (row.gender_stats || []).map((g: any) => ({ identity: g.identity, count: Number(g.count) })),
          behavior_stats: (row.behavior_stats || []).map((b: any) => ({ category: b.category, count: Number(b.count) })),
          total_checkins: Number(row.total_checkins) || 0,
          total_screenings: Number(row.total_screenings) || 0,
          total_ai_conversations: Number(row.total_ai_conversations) || 0,
          total_selftest_requests: Number(row.total_selftest_requests) || 0,
          total_peer_posts: Number(row.total_peer_posts) || 0,
          total_distress_alerts: Number(row.total_distress_alerts) || 0,
          total_safer_plans: Number(row.total_safer_plans) || 0,
          total_referrals: Number(row.total_referrals) || 0,
          monthly_trend: (row.monthly_trend || []).map((t: any) => ({
            month: t.month,
            checkins: Number(t.checkins) || 0,
            screenings: Number(t.screenings) || 0,
          })),
        });
      }
    } catch {
      // ignore
    }
    setLoading(false);
  };

  useEffect(() => { fetchStats(); }, []);

  const pct = (n: number, total: number) => total > 0 ? Math.round((n / total) * 100) : 0;

  const kpiCards = [
    { icon: Users, label: isEn ? "Total Profiles" : "โปรไฟล์ทั้งหมด", value: stats?.total_profiles ?? 0, color: "text-primary" },
    { icon: ClipboardCheck, label: isEn ? "Check-ins" : "เช็คอิน", value: stats?.total_checkins ?? 0, color: "text-emerald-500" },
    { icon: Search, label: isEn ? "Screenings" : "คัดกรอง", value: stats?.total_screenings ?? 0, color: "text-blue-500" },
    { icon: Package, label: isEn ? "Self-test Requests" : "คำขอชุดตรวจ", value: stats?.total_selftest_requests ?? 0, color: "text-orange-500" },
  ];

  const usageCards = [
    { icon: Bot, label: isEn ? "AI Conversations" : "สนทนา AI", value: stats?.total_ai_conversations ?? 0 },
    { icon: MessageCircle, label: isEn ? "Peer Posts" : "โพสต์ Peer", value: stats?.total_peer_posts ?? 0 },
    { icon: AlertTriangle, label: isEn ? "Distress Alerts" : "แจ้งเตือนวิกฤต", value: stats?.total_distress_alerts ?? 0 },
    { icon: Shield, label: isEn ? "Safer Plans" : "แผนใช้ปลอดภัย", value: stats?.total_safer_plans ?? 0 },
    { icon: ArrowRightLeft, label: isEn ? "Referrals" : "ส่งต่อ", value: stats?.total_referrals ?? 0 },
  ];

  const chartConfig = {
    checkins: { label: isEn ? "Check-ins" : "เช็คอิน", color: "hsl(var(--primary))" },
    screenings: { label: isEn ? "Screenings" : "คัดกรอง", color: "hsl(160, 60%, 45%)" },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">
            {isEn ? "HR Demographics & Usage" : "ข้อมูลประชากร & การใช้งาน HR"}
          </h2>
          <p className="text-xs text-muted-foreground">
            {isEn ? "Aggregated insights from all harm reduction data sources" : "ข้อมูลรวมจากทุกแหล่งข้อมูล harm reduction"}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchStats} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          {isEn ? "Refresh" : "รีเฟรช"}
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpiCards.map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4 text-center">
              <k.icon className={`h-5 w-5 mx-auto mb-1 ${k.color}`} />
              <p className="text-2xl font-bold text-foreground">{k.value.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">{k.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* MSM / MSW badges */}
      {stats && stats.total_profiles > 0 && (
        <div className="flex gap-3 justify-center">
          <Badge variant="secondary" className="text-xs px-3 py-1">
            MSM: {stats.msm_count} ({pct(stats.msm_count, stats.total_profiles)}%)
          </Badge>
          <Badge variant="secondary" className="text-xs px-3 py-1">
            MSW: {stats.msw_count} ({pct(stats.msw_count, stats.total_profiles)}%)
          </Badge>
        </div>
      )}

      {/* HR Usage Overview */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{isEn ? "HR Feature Usage" : "การใช้งานฟีเจอร์ HR"}</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {usageCards.map((u) => (
              <div key={u.label} className="flex flex-col items-center gap-1 rounded-xl border border-border/50 p-3">
                <u.icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-lg font-bold text-foreground">{u.value.toLocaleString()}</span>
                <span className="text-[10px] text-muted-foreground text-center leading-tight">{u.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Monthly Trend */}
      {stats?.monthly_trend && stats.monthly_trend.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              {isEn ? "Monthly Check-ins & Screenings (6 months)" : "เช็คอิน & คัดกรองรายเดือน (6 เดือน)"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
              <BarChart data={stats.monthly_trend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis
                  dataKey="month"
                  tickFormatter={(v: string) => v.slice(5)}
                  className="text-[10px]"
                />
                <YAxis allowDecimals={false} className="text-[10px]" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="checkins" fill="var(--color-checkins)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="screenings" fill="var(--color-screenings)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Demographic Breakdowns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Age */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{isEn ? "Age Distribution" : "กลุ่มอายุ"}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-2">
            {(stats?.age_stats || []).map((a) => (
              <div key={a.range} className="flex items-center justify-between">
                <span className="text-xs text-foreground">{a.range}</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${pct(a.count, stats?.total_profiles || 1)}%` }} />
                  </div>
                  <span className="text-[10px] text-muted-foreground w-8 text-right">{a.count}</span>
                </div>
              </div>
            ))}
            {(!stats?.age_stats || stats.age_stats.length === 0) && (
              <p className="text-xs text-muted-foreground">{isEn ? "No data yet" : "ยังไม่มีข้อมูล"}</p>
            )}
          </CardContent>
        </Card>

        {/* Gender */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{isEn ? "Gender Identity" : "เพศสภาพ"}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-2">
            {(stats?.gender_stats || []).map((g) => (
              <div key={g.identity} className="flex items-center justify-between">
                <span className="text-xs text-foreground">{g.identity}</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${pct(g.count, stats?.total_profiles || 1)}%` }} />
                  </div>
                  <span className="text-[10px] text-muted-foreground w-8 text-right">{g.count}</span>
                </div>
              </div>
            ))}
            {(!stats?.gender_stats || stats.gender_stats.length === 0) && (
              <p className="text-xs text-muted-foreground">{isEn ? "No data yet" : "ยังไม่มีข้อมูล"}</p>
            )}
          </CardContent>
        </Card>

        {/* Behavior */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{isEn ? "Sexual Behavior" : "พฤติกรรมทางเพศ"}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-2">
            {(stats?.behavior_stats || []).map((b) => (
              <div key={b.category} className="flex items-center justify-between">
                <span className="text-xs text-foreground">{b.category}</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${pct(b.count, stats?.total_profiles || 1)}%` }} />
                  </div>
                  <span className="text-[10px] text-muted-foreground w-8 text-right">{b.count}</span>
                </div>
              </div>
            ))}
            {(!stats?.behavior_stats || stats.behavior_stats.length === 0) && (
              <p className="text-xs text-muted-foreground">{isEn ? "No data yet" : "ยังไม่มีข้อมูล"}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-[10px] text-muted-foreground text-center">
        {isEn
          ? "All data is anonymized and aggregated. No personally identifiable information is shown."
          : "ข้อมูลทั้งหมดรวมแบบไม่ระบุตัวตน ไม่แสดงข้อมูลที่ระบุตัวบุคคลได้"}
      </p>
    </div>
  );
}
