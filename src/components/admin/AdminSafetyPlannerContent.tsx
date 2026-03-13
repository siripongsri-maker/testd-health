import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Shield, BarChart3, Phone, Settings, RefreshCw,
  AlertTriangle, CheckCircle2, Clock, Users,
} from "lucide-react";

interface Scenario {
  id: string;
  slug: string;
  title_th: string;
  title_en: string;
  description_th: string;
  description_en: string;
  icon: string;
  display_order: number;
  is_active: boolean;
}

export default function AdminSafetyPlannerContent() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const [tab, setTab] = useState("scenarios");
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [stats, setStats] = useState({ plans: 0, alerts: 0, referrals: 0, callbacks: 0 });
  const [callbackRequests, setCallbackRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const [scenRes, planRes, alertRes, refRes, cbRes, cbList] = await Promise.all([
      supabase.from("hr_safety_scenarios").select("*").order("display_order"),
      supabase.from("hr_user_safety_plans").select("id", { count: "exact", head: true }),
      supabase.from("hr_safety_alert_events").select("id", { count: "exact", head: true }),
      supabase.from("hr_referral_events").select("id", { count: "exact", head: true }),
      supabase.from("hr_callback_requests").select("id", { count: "exact", head: true }),
      supabase.from("hr_callback_requests").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    if (scenRes.data) setScenarios(scenRes.data as Scenario[]);
    setStats({
      plans: planRes.count || 0,
      alerts: alertRes.count || 0,
      referrals: refRes.count || 0,
      callbacks: cbRes.count || 0,
    });
    if (cbList.data) setCallbackRequests(cbList.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const toggleScenario = async (id: string, active: boolean) => {
    await supabase.from("hr_safety_scenarios").update({ is_active: active }).eq("id", id);
    setScenarios(prev => prev.map(s => s.id === id ? { ...s, is_active: active } : s));
    toast.success(active ? "Enabled" : "Disabled");
  };

  const updateCallbackStatus = async (id: string, status: string) => {
    await supabase.from("hr_callback_requests").update({ callback_status: status, updated_at: new Date().toISOString() }).eq("id", id);
    setCallbackRequests(prev => prev.map(c => c.id === id ? { ...c, callback_status: status } : c));
    toast.success(`Status → ${status}`);
  };

  const statCards = [
    { label: "Plans Created", value: stats.plans, icon: Shield, color: "text-primary" },
    { label: "Safety Alerts", value: stats.alerts, icon: AlertTriangle, color: "text-amber-600" },
    { label: "SWING Referrals", value: stats.referrals, icon: CheckCircle2, color: "text-emerald-600" },
    { label: "Callback Requests", value: stats.callbacks, icon: Phone, color: "text-blue-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Safety Planner Management</h2>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={`h-5 w-5 ${s.color}`} />
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
          <TabsTrigger value="callbacks">Callbacks</TabsTrigger>
          <TabsTrigger value="voice">Voice Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="scenarios" className="mt-4 space-y-3">
          {scenarios.map(s => (
            <Card key={s.id}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">{s.title_en}</p>
                    <Badge variant={s.is_active ? "default" : "secondary"} className="text-[10px]">
                      {s.is_active ? "Active" : "Disabled"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{s.title_th}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">slug: {s.slug} · order: {s.display_order}</p>
                </div>
                <Switch checked={s.is_active} onCheckedChange={(v) => toggleScenario(s.id, v)} />
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="callbacks" className="mt-4 space-y-3">
          {callbackRequests.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No callback requests yet</p>
          )}
          {callbackRequests.map(cb => (
            <Card key={cb.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant={cb.callback_status === "pending" ? "destructive" : "secondary"}>
                    {cb.callback_status}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(cb.created_at).toLocaleString()}
                  </span>
                </div>
                {cb.callback_reason && <p className="text-sm">{cb.callback_reason}</p>}
                <p className="text-xs text-muted-foreground">
                  Language: {cb.preferred_language} · Escalation: {cb.escalation_level}
                </p>
                <div className="flex gap-2">
                  {cb.callback_status === "pending" && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => updateCallbackStatus(cb.id, "contacted")}>
                        Mark Contacted
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => updateCallbackStatus(cb.id, "completed")}>
                        Complete
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="voice" className="mt-4">
          <Card>
            <CardContent className="p-6 text-center space-y-3">
              <Settings className="h-8 w-8 text-muted-foreground mx-auto" />
              <h3 className="font-semibold">Voice Integration (ElevenLabs)</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Voice callback integration is ready for configuration. Enable ElevenLabs provider when API credentials are available.
              </p>
              <Badge variant="secondary">Not yet configured</Badge>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
