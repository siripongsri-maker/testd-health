import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { AdminStatCard } from "@/components/admin/analytics/AdminStatCard";
import {
  Users, ClipboardCheck, HeartHandshake, Shield, BarChart3,
  Eye, TrendingUp, AlertTriangle,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

export function AdminHarmReductionContent() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalScreenings: 0,
    lowRisk: 0,
    moderateRisk: 0,
    highRisk: 0,
    totalReferrals: 0,
    pendingReferrals: 0,
    totalPlans: 0,
    totalKnowledgeViews: 0,
  });
  const [referrals, setReferrals] = useState<any[]>([]);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const [screeningsRes, referralsRes, plansRes, knowledgeRes] = await Promise.all([
        supabase.from("hr_screenings").select("risk_level", { count: "exact" }),
        supabase.from("hr_referrals").select("*").order("created_at", { ascending: false }).limit(50),
        supabase.from("hr_safer_plans").select("id", { count: "exact" }),
        supabase.from("hr_knowledge_progress").select("id", { count: "exact" }),
      ]);

      const screenings = screeningsRes.data || [];
      const refs = referralsRes.data || [];

      setStats({
        totalScreenings: screeningsRes.count || 0,
        lowRisk: screenings.filter(s => s.risk_level === "low").length,
        moderateRisk: screenings.filter(s => s.risk_level === "moderate").length,
        highRisk: screenings.filter(s => s.risk_level === "high").length,
        totalReferrals: refs.length,
        pendingReferrals: refs.filter(r => r.status === "requested" || r.status === "contacted").length,
        totalPlans: plansRes.count || 0,
        totalKnowledgeViews: knowledgeRes.count || 0,
      });
      setReferrals(refs);
    } catch (err) {
      console.error("Failed to load HR stats:", err);
    } finally {
      setLoading(false);
    }
  };

  const riskPieData = [
    { name: isEn ? "Low" : "ต่ำ", value: stats.lowRisk, color: "hsl(142, 76%, 36%)" },
    { name: isEn ? "Moderate" : "ปานกลาง", value: stats.moderateRisk, color: "hsl(38, 92%, 50%)" },
    { name: isEn ? "High" : "สูง", value: stats.highRisk, color: "hsl(0, 72%, 50%)" },
  ].filter(d => d.value > 0);

  const statusColors: Record<string, string> = {
    requested: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    contacted: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    scheduled: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
    completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  };

  const updateReferralStatus = async (id: string, status: string) => {
    const updates: any = { status };
    if (status === "completed") updates.completed_at = new Date().toISOString();
    await supabase.from("hr_referrals").update(updates).eq("id", id);
    loadStats();
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-foreground">
        {isEn ? "Harm Reduction M&E" : "ติดตามผล Harm Reduction"}
      </h2>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <AdminStatCard label={isEn ? "Screenings" : "การประเมิน"} value={stats.totalScreenings} icon={ClipboardCheck} loading={loading} />
        <AdminStatCard label={isEn ? "Referrals" : "ส่งต่อ"} value={stats.totalReferrals} icon={HeartHandshake} loading={loading} />
        <AdminStatCard label={isEn ? "Safety Plans" : "แผนความปลอดภัย"} value={stats.totalPlans} icon={Shield} loading={loading} />
        <AdminStatCard label={isEn ? "Hub Views" : "เข้าชม Hub"} value={stats.totalKnowledgeViews} icon={Eye} loading={loading} />
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid grid-cols-2 w-full max-w-sm">
          <TabsTrigger value="overview">{isEn ? "Overview" : "ภาพรวม"}</TabsTrigger>
          <TabsTrigger value="referrals">{isEn ? "Referrals" : "ส่งต่อ"}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Risk distribution */}
            <Card className="border border-border/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{isEn ? "Risk Level Distribution" : "การกระจายระดับความเสี่ยง"}</CardTitle>
              </CardHeader>
              <CardContent>
                {riskPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={riskPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                        {riskPieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">{isEn ? "No data yet" : "ยังไม่มีข้อมูล"}</p>
                )}
              </CardContent>
            </Card>

            {/* Pending alerts */}
            <Card className="border border-border/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  {isEn ? "Pending Actions" : "รอดำเนินการ"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/50 dark:bg-amber-900/10">
                    <span className="text-sm">{isEn ? "Pending referrals" : "คำขอรอดำเนินการ"}</span>
                    <Badge variant="secondary">{stats.pendingReferrals}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-destructive/5">
                    <span className="text-sm">{isEn ? "High risk screenings" : "ประเมินความเสี่ยงสูง"}</span>
                    <Badge variant="destructive">{stats.highRisk}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="referrals" className="mt-4">
          <Card className="border border-border/40">
            <CardContent className="p-4">
              {referrals.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">{isEn ? "No referrals yet" : "ยังไม่มีคำขอส่งต่อ"}</p>
              ) : (
                <div className="space-y-2">
                  {referrals.map(ref => (
                    <div key={ref.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border/30">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium capitalize">{ref.referral_type}</span>
                          <Badge className={`text-[10px] ${statusColors[ref.status] || ""}`}>{ref.status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{ref.notes || (isEn ? "No notes" : "ไม่มีหมายเหตุ")}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">{new Date(ref.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex gap-1">
                        {ref.status !== "completed" && (
                          <select
                            className="text-xs border rounded-lg px-2 py-1 bg-background"
                            value={ref.status}
                            onChange={e => updateReferralStatus(ref.id, e.target.value)}
                          >
                            <option value="requested">{isEn ? "Requested" : "รอ"}</option>
                            <option value="contacted">{isEn ? "Contacted" : "ติดต่อแล้ว"}</option>
                            <option value="scheduled">{isEn ? "Scheduled" : "นัดแล้ว"}</option>
                            <option value="completed">{isEn ? "Completed" : "เสร็จ"}</option>
                          </select>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
