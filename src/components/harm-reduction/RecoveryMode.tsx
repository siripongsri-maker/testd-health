import { useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trackEvent } from "@/hooks/useAnalytics";
import { SwingClinicCard } from "./SwingClinicCard";
import {
  Sunrise, Droplets, Moon, Wind, Heart, TestTube,
  MessageCircle, CheckCircle2,
} from "lucide-react";

interface Props {
  userId?: string;
  onNavigateSupport: () => void;
}

interface CheckItem {
  id: string;
  icon: React.ElementType;
  labelEn: string;
  labelTh: string;
  done: boolean;
}

const INITIAL_CHECKS: CheckItem[] = [
  { id: "water", icon: Droplets, labelEn: "Drink a full glass of water", labelTh: "ดื่มน้ำหนึ่งแก้วเต็ม", done: false },
  { id: "eat", icon: Sunrise, labelEn: "Eat something light", labelTh: "ทานอาหารเบาๆ", done: false },
  { id: "rest", icon: Moon, labelEn: "Rest or take a nap", labelTh: "พักผ่อนหรืองีบหลับ", done: false },
  { id: "breathe", icon: Wind, labelEn: "Do 5 slow deep breaths", labelTh: "หายใจลึกๆ ช้าๆ 5 ครั้ง", done: false },
  { id: "feelings", icon: Heart, labelEn: "Check in with your feelings", labelTh: "สำรวจความรู้สึกของตัวเอง", done: false },
];

export function RecoveryMode({ userId, onNavigateSupport }: Props) {
  const { language } = useLanguage();
  const isEn = language === "en";
  const [checks, setChecks] = useState<CheckItem[]>(INITIAL_CHECKS);
  const [mood, setMood] = useState<string | null>(null);

  const toggle = (id: string) => {
    setChecks(prev => prev.map(c => c.id === id ? { ...c, done: !c.done } : c));
    trackEvent("hr_recovery_check", { item: id });
  };

  const doneCount = checks.filter(c => c.done).length;
  const moodOptions = [
    { value: "ok", emoji: "😊", labelEn: "I'm okay", labelTh: "ฉันโอเค" },
    { value: "tired", emoji: "😴", labelEn: "Tired", labelTh: "เหนื่อย" },
    { value: "anxious", emoji: "😰", labelEn: "Anxious", labelTh: "กังวล" },
    { value: "low", emoji: "😔", labelEn: "Feeling low", labelTh: "รู้สึกไม่ดี" },
    { value: "need-help", emoji: "🆘", labelEn: "Need support", labelTh: "ต้องการความช่วยเหลือ" },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center space-y-2 py-2">
        <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto">
          <Sunrise className="h-7 w-7 text-amber-600 dark:text-amber-400" />
        </div>
        <h2 className="text-lg font-bold text-foreground">
          {isEn ? "Recovery Check-in" : "เช็คอินการฟื้นตัว"}
        </h2>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          {isEn ? "Take it easy. Here are some simple steps to help you recover." : "ค่อยๆ มา นี่คือขั้นตอนง่ายๆ เพื่อช่วยคุณฟื้นตัว"}
        </p>
      </div>

      {/* Recovery checklist */}
      <Card className="border border-border/40">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold text-foreground">
              {isEn ? "Recovery steps" : "ขั้นตอนฟื้นตัว"}
            </p>
            <Badge variant="secondary" className="text-[10px]">{doneCount}/{checks.length}</Badge>
          </div>
          {checks.map(item => {
            const Icon = item.icon;
            return (
              <div key={item.id}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${item.done ? "border-primary/30 bg-primary/5" : "border-border/40"}`}
                onClick={() => toggle(item.id)}
              >
                {item.done
                  ? <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                  : <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                }
                <span className={`text-sm ${item.done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                  {isEn ? item.labelEn : item.labelTh}
                </span>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Mood check */}
      <Card className="border border-border/40">
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground">
            {isEn ? "How are you feeling?" : "ตอนนี้รู้สึกอย่างไร?"}
          </p>
          <div className="flex flex-wrap gap-2">
            {moodOptions.map(opt => (
              <Button key={opt.value} variant={mood === opt.value ? "default" : "outline"}
                size="sm" className="rounded-xl text-xs h-9"
                onClick={() => { setMood(opt.value); trackEvent("hr_recovery_mood", { mood: opt.value }); }}
              >
                <span className="mr-1">{opt.emoji}</span>
                {isEn ? opt.labelEn : opt.labelTh}
              </Button>
            ))}
          </div>
          {(mood === "anxious" || mood === "low" || mood === "need-help") && (
            <div className="space-y-2 pt-1">
              <p className="text-xs text-muted-foreground">
                {isEn ? "Support is available if you need it." : "มีความช่วยเหลือพร้อมอยู่หากคุณต้องการ"}
              </p>
              <Button size="sm" className="rounded-xl text-xs w-full" onClick={onNavigateSupport}>
                <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
                {isEn ? "Talk to someone" : "พูดคุยกับคนที่พร้อมช่วย"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Follow-up */}
      <Card className="border border-border/40">
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground">
            {isEn ? "Follow-up reminders" : "การนัดติดตาม"}
          </p>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
            <TestTube className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground flex-1">
              {isEn ? "Consider HIV/STI testing in 2–4 weeks" : "พิจารณาตรวจ HIV/STI ใน 2–4 สัปดาห์"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* SWING referral */}
      <SwingClinicCard userId={userId} sourceContext="recovery_mode" />
    </div>
  );
}
