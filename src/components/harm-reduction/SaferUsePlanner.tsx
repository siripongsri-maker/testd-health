import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { trackEvent } from "@/hooks/useAnalytics";
import {
  Shield, Plus, Bell, Check, Droplets, Pill, Car, Heart,
  Clock, Trash2, Save,
} from "lucide-react";

interface Props {
  userId?: string;
}

interface ChecklistItem {
  id: string;
  label: string;
  labelTh: string;
  checked: boolean;
  icon: string;
}

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { id: "prep", label: "PrEP taken", labelTh: "กิน PrEP แล้ว", checked: false, icon: "pill" },
  { id: "condom", label: "Condoms ready", labelTh: "เตรียมถุงยางแล้ว", checked: false, icon: "shield" },
  { id: "lube", label: "Lube ready", labelTh: "เตรียมเจลหล่อลื่นแล้ว", checked: false, icon: "droplets" },
  { id: "water", label: "Hydration plan", labelTh: "วางแผนเรื่องน้ำดื่มแล้ว", checked: false, icon: "droplets" },
  { id: "transport", label: "Safe transport home", labelTh: "จัดเรื่องรถกลับบ้านแล้ว", checked: false, icon: "car" },
  { id: "friend", label: "Trusted friend notified", labelTh: "แจ้งเพื่อนที่ไว้ใจแล้ว", checked: false, icon: "heart" },
  { id: "phone", label: "Phone charged", labelTh: "ชาร์จโทรศัพท์แล้ว", checked: false, icon: "check" },
];

interface Reminder {
  id: string;
  title: string;
  type: string;
  scheduledAt: string;
  isNew?: boolean;
}

export function SaferUsePlanner({ userId }: Props) {
  const { language } = useLanguage();
  const isEn = language === "en";
  const [checklist, setChecklist] = useState<ChecklistItem[]>(DEFAULT_CHECKLIST);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [newReminderTitle, setNewReminderTitle] = useState("");
  const [newReminderTime, setNewReminderTime] = useState("");
  const [newReminderType, setNewReminderType] = useState("hydration");
  const [saving, setSaving] = useState(false);

  const completedCount = checklist.filter(c => c.checked).length;
  const totalCount = checklist.length;

  const toggleCheck = (id: string) => {
    setChecklist(prev => prev.map(c => c.id === id ? { ...c, checked: !c.checked } : c));
  };

  const handleSavePlan = async () => {
    if (!userId) {
      toast.info(isEn ? "Sign in to save your plan" : "เข้าสู่ระบบเพื่อบันทึกแผน");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("hr_safer_plans").insert({
        user_id: userId,
        plan_name: isEn ? "My Safety Plan" : "แผนความปลอดภัยของฉัน",
        checklist: checklist as any,
        plan_date: new Date().toISOString().split("T")[0],
        is_active: true,
      });
      if (error) throw error;

      // Save reminders
      for (const rem of reminders.filter(r => r.isNew)) {
        await supabase.from("hr_reminders").insert({
          user_id: userId,
          reminder_type: rem.type,
          title: rem.title,
          scheduled_at: rem.scheduledAt,
        });
      }

      toast.success(isEn ? "Plan saved!" : "บันทึกแผนแล้ว!");
      trackEvent("hr_plan_saved", { checklist_completed: completedCount });
    } catch (err) {
      toast.error(isEn ? "Failed to save" : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  const addReminder = () => {
    if (!newReminderTitle.trim() || !newReminderTime) return;
    const reminder: Reminder = {
      id: `rem-${Date.now()}`,
      title: newReminderTitle,
      type: newReminderType,
      scheduledAt: new Date(newReminderTime).toISOString(),
      isNew: true,
    };
    setReminders(prev => [...prev, reminder]);
    setNewReminderTitle("");
    setNewReminderTime("");

    // Schedule browser notification
    if ("Notification" in window && Notification.permission === "granted") {
      const delay = new Date(newReminderTime).getTime() - Date.now();
      if (delay > 0) {
        setTimeout(() => {
          new Notification(reminder.title, { body: isEn ? "Harm Reduction Reminder" : "เตือนความจำ Harm Reduction" });
        }, delay);
      }
    }
  };

  const removeReminder = (id: string) => {
    setReminders(prev => prev.filter(r => r.id !== id));
  };

  const requestNotificationPermission = async () => {
    if ("Notification" in window) {
      const result = await Notification.requestPermission();
      if (result === "granted") toast.success(isEn ? "Notifications enabled!" : "เปิดการแจ้งเตือนแล้ว!");
    }
  };

  const iconMap: Record<string, React.ElementType> = { pill: Pill, shield: Shield, droplets: Droplets, car: Car, heart: Heart, check: Check };

  return (
    <div className="space-y-5">
      {/* Safety Checklist */}
      <Card className="border border-border/40">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              {isEn ? "Safety Checklist" : "เช็คลิสต์ความปลอดภัย"}
            </h2>
            <Badge variant="secondary" className="text-xs">
              {completedCount}/{totalCount}
            </Badge>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 bg-muted rounded-full mb-4 overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${(completedCount / totalCount) * 100}%` }} />
          </div>

          <div className="space-y-2">
            {checklist.map(item => {
              const Icon = iconMap[item.icon] || Check;
              return (
                <div key={item.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${item.checked ? "border-primary/30 bg-primary/5" : "border-border/40"}`}
                  onClick={() => toggleCheck(item.id)}>
                  <Checkbox checked={item.checked} className="pointer-events-none" />
                  <Icon className={`h-4 w-4 ${item.checked ? "text-primary" : "text-muted-foreground"}`} />
                  <span className={`text-sm flex-1 ${item.checked ? "line-through text-muted-foreground" : "text-foreground"}`}>
                    {isEn ? item.label : item.labelTh}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Reminders */}
      <Card className="border border-border/40">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              {isEn ? "Reminders" : "การเตือนความจำ"}
            </h2>
            <Button size="sm" variant="ghost" onClick={requestNotificationPermission} className="text-xs">
              <Bell className="h-3 w-3 mr-1" />
              {isEn ? "Enable" : "เปิดแจ้งเตือน"}
            </Button>
          </div>

          {/* Add reminder */}
          <div className="space-y-2 mb-4">
            <select value={newReminderType} onChange={e => setNewReminderType(e.target.value)}
              className="w-full rounded-xl border border-border/40 bg-background px-3 py-2 text-sm">
              <option value="hydration">{isEn ? "💧 Hydration" : "💧 น้ำดื่ม"}</option>
              <option value="dose">{isEn ? "💊 Dose timer" : "💊 เวลายา"}</option>
              <option value="recovery">{isEn ? "🛌 Recovery" : "🛌 พักฟื้น"}</option>
              <option value="test">{isEn ? "🧪 HIV Test" : "🧪 ตรวจ HIV"}</option>
            </select>
            <Input placeholder={isEn ? "Reminder title..." : "หัวข้อเตือน..."} value={newReminderTitle} onChange={e => setNewReminderTitle(e.target.value)} className="rounded-xl" />
            <Input type="datetime-local" value={newReminderTime} onChange={e => setNewReminderTime(e.target.value)} className="rounded-xl" />
            <Button onClick={addReminder} className="w-full rounded-xl" variant="outline" disabled={!newReminderTitle.trim() || !newReminderTime}>
              <Plus className="h-4 w-4 mr-1" />
              {isEn ? "Add Reminder" : "เพิ่มการเตือน"}
            </Button>
          </div>

          {/* Reminder list */}
          {reminders.length > 0 && (
            <div className="space-y-2">
              {reminders.map(rem => (
                <div key={rem.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{rem.title}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(rem.scheduledAt).toLocaleString()}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => removeReminder(rem.id)} className="h-7 w-7 p-0">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save button */}
      <Button onClick={handleSavePlan} className="w-full rounded-2xl" disabled={saving}>
        <Save className="h-4 w-4 mr-2" />
        {saving ? (isEn ? "Saving..." : "กำลังบันทึก...") : (isEn ? "Save Plan" : "บันทึกแผน")}
      </Button>
    </div>
  );
}
