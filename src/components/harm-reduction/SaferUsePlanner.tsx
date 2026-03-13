import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { trackEvent } from "@/hooks/useAnalytics";
import { DoseTimer } from "./DoseTimer";
import { SwingClinicCard } from "./SwingClinicCard";
import { RecoveryMode } from "./RecoveryMode";
import { SafetyEscalation } from "./SafetyEscalation";
import {
  Shield, Moon, Heart, User, Users, Sunrise, MapPin,
  ArrowRight, ArrowLeft, Droplets, Pill, Car, Phone,
  Bell, CheckCircle2, Save, AlertTriangle, Timer,
} from "lucide-react";

interface Props {
  userId?: string;
  onNavigateSupport?: () => void;
}

type Step = "scenario" | "context" | "plan" | "active" | "recovery" | "escalation";

interface Scenario {
  id: string;
  slug: string;
  title_th: string;
  title_en: string;
  description_th: string;
  description_en: string;
  icon: string;
}

interface PlanItem {
  id: string;
  labelEn: string;
  labelTh: string;
  icon: string;
  enabled: boolean;
  reminderType?: string;
}

const ICON_MAP: Record<string, React.ElementType> = {
  moon: Moon, heart: Heart, user: User, users: Users,
  sunrise: Sunrise, "map-pin": MapPin, shield: Shield,
};

function buildPlanItems(ctx: ContextAnswers, scenario?: Scenario): PlanItem[] {
  const items: PlanItem[] = [];
  if (ctx.sexRelated) {
    items.push({ id: "condoms", labelEn: "Bring condoms and lube", labelTh: "พกถุงยางและเจลหล่อลื่น", icon: "shield", enabled: true });
  }
  if (ctx.substancesSelected.length > 0) {
    items.push({ id: "dose-timer", labelEn: "Set dose spacing timer", labelTh: "ตั้งเวลาเว้นระยะโดส", icon: "timer", enabled: true, reminderType: "dose" });
  }
  items.push({ id: "hydration", labelEn: "Set hydration reminders", labelTh: "ตั้งเตือนดื่มน้ำ", icon: "droplets", enabled: ctx.hydrationReminders, reminderType: "hydration" });
  if (!ctx.usingAlone) {
    items.push({ id: "buddy", labelEn: "Set a buddy / trusted contact", labelTh: "กำหนดเพื่อนที่ไว้ใจ", icon: "heart", enabled: true });
  }
  items.push({ id: "transport", labelEn: "Plan your route home", labelTh: "วางแผนเส้นทางกลับบ้าน", icon: "car", enabled: true });
  items.push({ id: "prep", labelEn: "Take PrEP if applicable", labelTh: "กิน PrEP หากเกี่ยวข้อง", icon: "pill", enabled: ctx.sexRelated });
  items.push({ id: "swing", labelEn: "Save SWING Clinic contact", labelTh: "บันทึกข้อมูลติดต่อ SWING Clinic", icon: "phone", enabled: true });
  items.push({ id: "recovery", labelEn: "Turn on recovery check-in tomorrow", labelTh: "เปิดเช็คอินฟื้นตัวพรุ่งนี้เช้า", icon: "sunrise", enabled: ctx.recoveryCheck, reminderType: "recovery" });
  items.push({ id: "emergency", labelEn: "Save emergency support shortcut", labelTh: "บันทึกช่องทางช่วยเหลือฉุกเฉิน", icon: "alert", enabled: true });
  return items;
}

interface ContextAnswers {
  substancesSelected: string[];
  alcoholInvolved: boolean;
  sexRelated: boolean;
  usingAlone: boolean;
  hydrationReminders: boolean;
  recoveryCheck: boolean;
  emergencyShortcuts: boolean;
}

const SUBSTANCE_OPTIONS = [
  { id: "meth", labelEn: "Crystal meth", labelTh: "ไอซ์ / เมท" },
  { id: "ghb", labelEn: "GHB / G", labelTh: "GHB / G" },
  { id: "mdma", labelEn: "MDMA / Ecstasy", labelTh: "MDMA / Ecstasy" },
  { id: "ketamine", labelEn: "Ketamine", labelTh: "คีตามีน" },
  { id: "poppers", labelEn: "Poppers", labelTh: "Poppers" },
  { id: "cannabis", labelEn: "Cannabis", labelTh: "กัญชา" },
  { id: "benzos", labelEn: "Benzodiazepines", labelTh: "ยากล่อมประสาท" },
  { id: "other", labelEn: "Other", labelTh: "อื่นๆ" },
];

export function SaferUsePlanner({ userId, onNavigateSupport }: Props) {
  const { language } = useLanguage();
  const isEn = language === "en";
  const [step, setStep] = useState<Step>("scenario");
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [ctx, setCtx] = useState<ContextAnswers>({
    substancesSelected: [], alcoholInvolved: false, sexRelated: false,
    usingAlone: false, hydrationReminders: true, recoveryCheck: true, emergencyShortcuts: true,
  });
  const [planItems, setPlanItems] = useState<PlanItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    supabase.from("hr_safety_scenarios").select("*").eq("is_active", true).order("display_order")
      .then(({ data }) => { if (data) setScenarios(data as Scenario[]); });
  }, []);

  useEffect(() => {
    if ("Notification" in window) setNotificationsEnabled(Notification.permission === "granted");
  }, []);

  const requestNotifications = async () => {
    if ("Notification" in window) {
      const result = await Notification.requestPermission();
      setNotificationsEnabled(result === "granted");
      if (result === "granted") toast.success(isEn ? "Notifications enabled!" : "เปิดการแจ้งเตือนแล้ว!");
    }
  };

  const handleScenarioSelect = (s: Scenario) => {
    setSelectedScenario(s);
    trackEvent("hr_scenario_selected", { scenario: s.slug });
    // Pre-fill context based on scenario
    if (s.slug === "recovery") { setStep("recovery"); return; }
    if (s.slug === "sex-substances") setCtx(prev => ({ ...prev, sexRelated: true }));
    if (s.slug === "using-alone") setCtx(prev => ({ ...prev, usingAlone: true }));
    setStep("context");
  };

  const handleContextDone = () => {
    const items = buildPlanItems(ctx, selectedScenario || undefined);
    setPlanItems(items);
    setStep("plan");
  };

  const togglePlanItem = (id: string) => {
    setPlanItems(prev => prev.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p));
  };

  const scheduleReminder = (title: string, delayMs: number) => {
    if (notificationsEnabled && delayMs > 0) {
      setTimeout(() => {
        new Notification(title, { body: isEn ? "Harm Reduction Reminder" : "เตือนความจำ Harm Reduction" });
      }, delayMs);
    }
  };

  const handleSavePlan = async () => {
    setSaving(true);
    try {
      const anonToken = userId ? undefined : `anon-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const enabledItems = planItems.filter(p => p.enabled);

      const { data: plan, error } = await supabase.from("hr_user_safety_plans").insert({
        user_id: userId || null,
        anonymous_token: anonToken || null,
        scenario_id: selectedScenario?.id || null,
        substances_selected: ctx.substancesSelected,
        sex_related: ctx.sexRelated,
        using_alone: ctx.usingAlone,
        alcohol_involved: ctx.alcoholInvolved,
        buddy_enabled: enabledItems.some(p => p.id === "buddy"),
        hydration_enabled: enabledItems.some(p => p.id === "hydration"),
        dose_timer_enabled: enabledItems.some(p => p.id === "dose-timer"),
        recovery_check_enabled: enabledItems.some(p => p.id === "recovery"),
        swing_referral_enabled: enabledItems.some(p => p.id === "swing"),
        emergency_shortcuts_enabled: enabledItems.some(p => p.id === "emergency"),
        saved_plan_json: enabledItems as any,
      }).select().single();

      if (error) throw error;

      // Schedule reminders
      const hydration = enabledItems.find(p => p.id === "hydration");
      if (hydration) {
        [30, 60, 90, 120].forEach(min => scheduleReminder(
          isEn ? "💧 Time for water" : "💧 ถึงเวลาดื่มน้ำ", min * 60000
        ));
      }
      const recovery = enabledItems.find(p => p.id === "recovery");
      if (recovery) {
        const tomorrow9am = new Date();
        tomorrow9am.setDate(tomorrow9am.getDate() + 1);
        tomorrow9am.setHours(9, 0, 0, 0);
        const delay = tomorrow9am.getTime() - Date.now();
        if (delay > 0) scheduleReminder(isEn ? "☀️ Recovery check-in" : "☀️ เช็คอินฟื้นตัว", delay);
      }

      trackEvent("hr_plan_saved", { scenario: selectedScenario?.slug, items: enabledItems.length });
      toast.success(isEn ? "Plan activated!" : "เปิดใช้แผนแล้ว!");
      setStep("active");
    } catch {
      toast.error(isEn ? "Failed to save" : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  const PLAN_ICON_MAP: Record<string, React.ElementType> = {
    shield: Shield, droplets: Droplets, pill: Pill, car: Car,
    phone: Phone, heart: Heart, sunrise: Sunrise, alert: AlertTriangle,
    timer: Timer, bell: Bell,
  };

  // ── Recovery mode ──
  if (step === "recovery") {
    return <RecoveryMode userId={userId} onNavigateSupport={onNavigateSupport || (() => {})} />;
  }

  // ── Escalation ──
  if (step === "escalation") {
    return <SafetyEscalation userId={userId} onNavigateSupport={onNavigateSupport || (() => {})} />;
  }

  // ── Active plan ──
  if (step === "active") {
    const enabledItems = planItems.filter(p => p.enabled);
    return (
      <div className="space-y-4">
        <div className="text-center space-y-2 py-2">
          <CheckCircle2 className="h-12 w-12 text-primary mx-auto" />
          <h2 className="text-lg font-bold text-foreground">{isEn ? "Your Plan is Active" : "แผนของคุณเปิดใช้งานแล้ว"}</h2>
          <p className="text-sm text-muted-foreground">{isEn ? "Stay safe. Support is always available." : "ดูแลตัวเอง ความช่วยเหลือพร้อมอยู่เสมอ"}</p>
        </div>

        <Card className="border border-border/40">
          <CardContent className="p-4 space-y-2">
            <p className="text-sm font-semibold text-foreground mb-1">{isEn ? "Your safer plan" : "แผนความปลอดภัยของคุณ"}</p>
            {enabledItems.map(item => {
              const Icon = PLAN_ICON_MAP[item.icon] || Shield;
              return (
                <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-primary/5 border border-primary/10">
                  <Icon className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="text-sm text-foreground">{isEn ? item.labelEn : item.labelTh}</span>
                  {item.reminderType && <Badge variant="secondary" className="text-[9px] ml-auto">{isEn ? "Reminder set" : "ตั้งเตือนแล้ว"}</Badge>}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {enabledItems.some(p => p.id === "dose-timer") && <DoseTimer />}

        <SwingClinicCard userId={userId} sourceContext="active_plan" compact />

        {/* Warning sign button */}
        <Button variant="outline" className="w-full rounded-xl border-amber-300 text-amber-700 dark:text-amber-400"
          onClick={() => setStep("escalation")}>
          <AlertTriangle className="h-4 w-4 mr-2" />
          {isEn ? "Report warning signs" : "รายงานอาการเตือน"}
        </Button>

        <Button variant="ghost" className="w-full rounded-xl text-muted-foreground text-xs"
          onClick={() => setStep("recovery")}>
          <Sunrise className="h-3.5 w-3.5 mr-1.5" />
          {isEn ? "Enter Recovery Mode" : "เข้าสู่โหมดฟื้นตัว"}
        </Button>
      </div>
    );
  }

  // ── Step 3: Build plan ──
  if (step === "plan") {
    const enabledCount = planItems.filter(p => p.enabled).length;
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" onClick={() => setStep("context")}>
          <ArrowLeft className="h-4 w-4 mr-1" />{isEn ? "Back" : "กลับ"}
        </Button>

        <div className="space-y-1">
          <h2 className="text-lg font-bold text-foreground">{isEn ? "Your Safer Plan" : "แผนความปลอดภัยของคุณ"}</h2>
          <p className="text-xs text-muted-foreground">{isEn ? "Toggle the items you want in your plan." : "เลือกสิ่งที่ต้องการในแผนของคุณ"}</p>
        </div>

        {/* Notification permission */}
        {!notificationsEnabled && (
          <Card className="border border-primary/20 bg-primary/5">
            <CardContent className="p-3 flex items-center gap-3">
              <Bell className="h-5 w-5 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground">{isEn ? "Enable notifications for reminders" : "เปิดการแจ้งเตือนสำหรับรีมายเดอร์"}</p>
              </div>
              <Button size="sm" variant="outline" className="rounded-xl text-xs h-7" onClick={requestNotifications}>
                {isEn ? "Enable" : "เปิด"}
              </Button>
            </CardContent>
          </Card>
        )}

        <Card className="border border-border/40">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-semibold">{isEn ? "Plan items" : "รายการแผน"}</p>
              <Badge variant="secondary" className="text-[10px]">{enabledCount}/{planItems.length}</Badge>
            </div>
            {planItems.map(item => {
              const Icon = PLAN_ICON_MAP[item.icon] || Shield;
              return (
                <div key={item.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${item.enabled ? "border-primary/30 bg-primary/5" : "border-border/40"}`}
                  onClick={() => togglePlanItem(item.id)}
                >
                  <Checkbox checked={item.enabled} className="pointer-events-none" />
                  <Icon className={`h-4 w-4 ${item.enabled ? "text-primary" : "text-muted-foreground"}`} />
                  <span className={`text-sm flex-1 ${item.enabled ? "text-foreground" : "text-muted-foreground"}`}>
                    {isEn ? item.labelEn : item.labelTh}
                  </span>
                  {item.reminderType && item.enabled && (
                    <Bell className="h-3 w-3 text-primary/60" />
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Button className="w-full rounded-2xl" onClick={handleSavePlan} disabled={saving || enabledCount === 0}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? (isEn ? "Saving..." : "กำลังบันทึก...") : (isEn ? "Activate Plan" : "เปิดใช้แผน")}
        </Button>
      </div>
    );
  }

  // ── Step 2: Context questions ──
  if (step === "context") {
    const toggleSubstance = (id: string) => {
      setCtx(prev => ({
        ...prev,
        substancesSelected: prev.substancesSelected.includes(id)
          ? prev.substancesSelected.filter(s => s !== id)
          : [...prev.substancesSelected, id],
      }));
    };

    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" onClick={() => setStep("scenario")}>
          <ArrowLeft className="h-4 w-4 mr-1" />{isEn ? "Back" : "กลับ"}
        </Button>

        <div className="space-y-1">
          <h2 className="text-lg font-bold text-foreground">{isEn ? "A few quick questions" : "คำถามสั้นๆ"}</h2>
          <p className="text-xs text-muted-foreground">{isEn ? "Help us personalize your plan. Skip anything you prefer." : "ช่วยให้เราปรับแผนให้เหมาะกับคุณ ข้ามข้อที่ไม่ต้องการได้"}</p>
        </div>

        {/* Substances */}
        <Card className="border border-border/40">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-semibold text-foreground">{isEn ? "Which substances may be involved?" : "อาจมีสารอะไรเกี่ยวข้อง?"}</p>
            <div className="flex flex-wrap gap-2">
              {SUBSTANCE_OPTIONS.map(s => (
                <Button key={s.id} variant={ctx.substancesSelected.includes(s.id) ? "default" : "outline"}
                  size="sm" className="rounded-xl text-xs h-8"
                  onClick={() => toggleSubstance(s.id)}>
                  {isEn ? s.labelEn : s.labelTh}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Toggle questions */}
        {[
          { key: "alcoholInvolved" as const, labelEn: "Will alcohol be involved?", labelTh: "จะมีแอลกอฮอล์เกี่ยวข้องไหม?" },
          { key: "sexRelated" as const, labelEn: "Will sex be part of the situation?", labelTh: "จะมีเพศสัมพันธ์เกี่ยวข้องไหม?" },
          { key: "usingAlone" as const, labelEn: "Will you be alone?", labelTh: "คุณจะอยู่คนเดียวไหม?" },
          { key: "hydrationReminders" as const, labelEn: "Want hydration reminders?", labelTh: "ต้องการเตือนดื่มน้ำไหม?" },
          { key: "recoveryCheck" as const, labelEn: "Want a recovery check-in tomorrow?", labelTh: "ต้องการเช็คอินฟื้นตัวพรุ่งนี้ไหม?" },
          { key: "emergencyShortcuts" as const, labelEn: "Want emergency shortcuts visible?", labelTh: "ต้องการปุ่มช่วยเหลือฉุกเฉินไหม?" },
        ].map(q => (
          <div key={q.key}
            className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${ctx[q.key] ? "border-primary/30 bg-primary/5" : "border-border/40"}`}
            onClick={() => setCtx(prev => ({ ...prev, [q.key]: !prev[q.key] }))}
          >
            <Checkbox checked={ctx[q.key]} className="pointer-events-none" />
            <span className="text-sm text-foreground">{isEn ? q.labelEn : q.labelTh}</span>
          </div>
        ))}

        <Button className="w-full rounded-2xl" onClick={handleContextDone}>
          {isEn ? "Build my plan" : "สร้างแผนของฉัน"}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    );
  }

  // ── Step 1: Scenario selection ──
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-lg font-bold text-foreground">{isEn ? "What's your situation?" : "สถานการณ์ของคุณคืออะไร?"}</h2>
        <p className="text-sm text-muted-foreground">
          {isEn
            ? "Start with a situation so we can build a safer plan around your needs."
            : "เลือกสถานการณ์เพื่อให้เราสร้างแผนความปลอดภัยที่เหมาะกับคุณ"}
        </p>
      </div>

      <div className="grid gap-2.5">
        {scenarios.map(s => {
          const Icon = ICON_MAP[s.icon] || Shield;
          return (
            <Card key={s.id} className="border border-border/40 cursor-pointer hover:shadow-md transition-all active:scale-[0.98]"
              onClick={() => handleScenarioSelect(s)}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm text-foreground">{isEn ? s.title_en : s.title_th}</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{isEn ? s.description_en : s.description_th}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Warning sign shortcut */}
      <Button variant="outline" className="w-full rounded-xl border-amber-300 text-amber-700 dark:text-amber-400"
        onClick={() => setStep("escalation")}>
        <AlertTriangle className="h-4 w-4 mr-2" />
        {isEn ? "Seeing warning signs? Get help now" : "พบอาการเตือน? ขอความช่วยเหลือเดี๋ยวนี้"}
      </Button>

      <p className="text-[10px] text-center text-muted-foreground">
        {isEn
          ? "Your plan data stays on your device. Support is available if you want it."
          : "ข้อมูลแผนของคุณเก็บในเครื่อง ความช่วยเหลือพร้อมอยู่หากต้องการ"}
      </p>
    </div>
  );
}
