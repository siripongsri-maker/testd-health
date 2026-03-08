import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, RefreshCw, CheckCircle, Target } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface Milestone {
  id: string;
  month: string;
  metric_type: string;
  target_value: number;
  current_value: number;
  reward_xp: number;
  reward_ticket: number;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
}

export default function AdminMilestonesContent() {
  const { language } = useLanguage();
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [metricType, setMetricType] = useState("tests_completed");
  const [targetValue, setTargetValue] = useState(1000);
  const [rewardXp, setRewardXp] = useState(50);
  const [rewardTicket, setRewardTicket] = useState(1);

  const fetchMilestones = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("community_milestones")
      .select("*")
      .order("month", { ascending: false })
      .limit(20);
    setMilestones((data as unknown as Milestone[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchMilestones(); }, []);

  const handleCreate = async () => {
    const { error } = await supabase.from("community_milestones").insert({
      month,
      metric_type: metricType,
      target_value: targetValue,
      reward_xp: rewardXp,
      reward_ticket: rewardTicket,
    });
    if (error) {
      if (error.code === "23505") {
        toast.error(language === "th" ? "เป้าหมายเดือนนี้มีอยู่แล้ว" : "Milestone for this month already exists");
      } else {
        toast.error(error.message);
      }
      return;
    }
    toast.success(language === "th" ? "สร้างเป้าหมายสำเร็จ" : "Milestone created");
    fetchMilestones();
  };

  const handleMarkCompleted = async (id: string) => {
    const { error } = await supabase
      .from("community_milestones")
      .update({ is_completed: true, completed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(language === "th" ? "ทำเครื่องหมายสำเร็จ" : "Marked as completed");
    fetchMilestones();
  };

  const handleReset = async (id: string) => {
    const { error } = await supabase
      .from("community_milestones")
      .update({ current_value: 0, is_completed: false, completed_at: null })
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(language === "th" ? "รีเซ็ตสำเร็จ" : "Reset successful");
    fetchMilestones();
  };

  const handleUpdateTarget = async (id: string, newTarget: number) => {
    const { error } = await supabase
      .from("community_milestones")
      .update({ target_value: newTarget })
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(language === "th" ? "อัปเดตเป้าหมายสำเร็จ" : "Target updated");
    fetchMilestones();
  };

  const metricLabels: Record<string, { th: string; en: string }> = {
    tests_completed: { th: "การตรวจสุขภาพ", en: "Health Checks" },
    lessons_completed: { th: "บทเรียนที่เรียนจบ", en: "Lessons Completed" },
    invites_sent: { th: "คำเชิญที่ส่ง", en: "Invites Sent" },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Target className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold">
          {language === "th" ? "เป้าหมายชุมชน" : "Community Milestones"}
        </h2>
      </div>

      {/* Create form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {language === "th" ? "สร้างเป้าหมายใหม่" : "Create New Milestone"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{language === "th" ? "เดือน" : "Month"}</Label>
              <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
            </div>
            <div>
              <Label>{language === "th" ? "ประเภท" : "Metric Type"}</Label>
              <Select value={metricType} onValueChange={setMetricType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(metricLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{language === "th" ? v.th : v.en}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{language === "th" ? "เป้าหมาย" : "Target"}</Label>
              <Input type="number" value={targetValue} onChange={(e) => setTargetValue(Number(e.target.value))} />
            </div>
            <div>
              <Label>Reward XP</Label>
              <Input type="number" value={rewardXp} onChange={(e) => setRewardXp(Number(e.target.value))} />
            </div>
            <div>
              <Label>{language === "th" ? "ตั๋วรางวัล" : "Reward Tickets"}</Label>
              <Input type="number" value={rewardTicket} onChange={(e) => setRewardTicket(Number(e.target.value))} />
            </div>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-1" />
            {language === "th" ? "สร้าง" : "Create"}
          </Button>
        </CardContent>
      </Card>

      {/* Milestones list */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : milestones.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {language === "th" ? "ยังไม่มีเป้าหมาย" : "No milestones yet"}
        </div>
      ) : (
        <div className="space-y-3">
          {milestones.map((m) => {
            const pct = Math.min(Math.round((m.current_value / m.target_value) * 100), 100);
            const label = metricLabels[m.metric_type] || { th: m.metric_type, en: m.metric_type };
            return (
              <Card key={m.id} className={m.is_completed ? "border-emerald-300 dark:border-emerald-700" : ""}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-foreground">{m.month}</span>
                      <span className="ml-2 text-sm text-muted-foreground">
                        {language === "th" ? label.th : label.en}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {m.is_completed && (
                        <span className="text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                          ✅ {language === "th" ? "สำเร็จ" : "Completed"}
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>{m.current_value.toLocaleString()} / {m.target_value.toLocaleString()}</span>
                      <span className="font-bold">{pct}%</span>
                    </div>
                    <Progress value={pct} className="h-2" />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Reward: +{m.reward_xp} XP, +{m.reward_ticket} ticket(s)
                  </div>
                  <div className="flex gap-2">
                    {!m.is_completed && (
                      <Button size="sm" variant="outline" onClick={() => handleMarkCompleted(m.id)}>
                        <CheckCircle className="h-3.5 w-3.5 mr-1" />
                        {language === "th" ? "ทำเครื่องหมายสำเร็จ" : "Mark Completed"}
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => handleReset(m.id)}>
                      <RefreshCw className="h-3.5 w-3.5 mr-1" />
                      {language === "th" ? "รีเซ็ต" : "Reset"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
