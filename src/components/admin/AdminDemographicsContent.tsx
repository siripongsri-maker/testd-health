import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Users, BarChart3, RefreshCw } from "lucide-react";

interface DemoStats {
  total_profiles: number;
  msm_count: number;
  msw_count: number;
  age_stats: Array<{ range: string; count: number }>;
  gender_stats: Array<{ identity: string; count: number }>;
  behavior_stats: Array<{ category: string; count: number }>;
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
        });
      }
    } catch {
      // ignore
    }
    setLoading(false);
  };

  useEffect(() => { fetchStats(); }, []);

  const pct = (n: number, total: number) => total > 0 ? Math.round((n / total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">
            {isEn ? "HR Demographics" : "ข้อมูลประชากร HR"}
          </h2>
          <p className="text-xs text-muted-foreground">
            {isEn ? "Anonymous aggregated insights from harm reduction profiles" : "ข้อมูลรวมแบบไม่ระบุตัวตนจากโปรไฟล์ harm reduction"}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchStats} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          {isEn ? "Refresh" : "รีเฟรช"}
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{stats?.total_profiles ?? 0}</p>
            <p className="text-[10px] text-muted-foreground">{isEn ? "Total Profiles" : "โปรไฟล์ทั้งหมด"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{stats?.msm_count ?? 0}</p>
            <p className="text-[10px] text-muted-foreground">MSM</p>
            {stats && stats.total_profiles > 0 && (
              <Badge variant="secondary" className="text-[9px] mt-1">{pct(stats.msm_count, stats.total_profiles)}%</Badge>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{stats?.msw_count ?? 0}</p>
            <p className="text-[10px] text-muted-foreground">MSW</p>
            {stats && stats.total_profiles > 0 && (
              <Badge variant="secondary" className="text-[9px] mt-1">{pct(stats.msw_count, stats.total_profiles)}%</Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Breakdown tables */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Age distribution */}
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
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${pct(a.count, stats?.total_profiles || 1)}%` }}
                    />
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

        {/* Gender distribution */}
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
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${pct(g.count, stats?.total_profiles || 1)}%` }}
                    />
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

        {/* Behavior distribution */}
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
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${pct(b.count, stats?.total_profiles || 1)}%` }}
                    />
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
