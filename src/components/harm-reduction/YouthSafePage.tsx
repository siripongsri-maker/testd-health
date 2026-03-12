import { useLanguage } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Heart, Brain, Phone, AlertTriangle, RotateCcw } from "lucide-react";

interface Props {
  onReset: () => void;
}

export function YouthSafePage({ onReset }: Props) {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isEn = language === "en";

  const resources = [
    {
      icon: Heart,
      titleTh: "สุขภาพทั่วไป",
      titleEn: "General Health",
      descTh: "ข้อมูลสุขภาพทั่วไปที่เป็นประโยชน์สำหรับทุกวัย",
      descEn: "Helpful general health information for all ages",
      color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
    },
    {
      icon: Brain,
      titleTh: "สุขภาพจิต",
      titleEn: "Mental Health",
      descTh: "การดูแลสุขภาพจิตและความเป็นอยู่ที่ดี",
      descEn: "Mental health care and wellbeing support",
      color: "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400",
    },
    {
      icon: Phone,
      titleTh: "ขอคำปรึกษา",
      titleEn: "Talk to Someone",
      descTh: "พูดคุยกับผู้เชี่ยวชาญแบบไม่ตัดสิน",
      descEn: "Speak to a professional without judgment",
      color: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
      action: () => navigate("/support-chat"),
    },
    {
      icon: AlertTriangle,
      titleTh: "ช่วยเหลือฉุกเฉิน",
      titleEn: "Emergency Help",
      descTh: "สายด่วนสุขภาพจิต 1323 / ฉุกเฉิน 1669",
      descEn: "Mental health hotline 1323 / Emergency 1669",
      color: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <Heart className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-xl font-bold text-foreground">
          {isEn ? "Youth Health Support" : "บริการสุขภาพสำหรับเยาวชน"}
        </h1>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          {isEn
            ? "Safe, supportive resources for your health and wellbeing"
            : "แหล่งข้อมูลที่ปลอดภัยและสนับสนุนสุขภาพของคุณ"}
        </p>
      </div>

      {/* Resource cards */}
      <div className="grid gap-3">
        {resources.map((r, i) => {
          const Icon = r.icon;
          return (
            <Card
              key={i}
              className="border border-border/30 cursor-pointer hover:shadow-md transition-shadow"
              onClick={r.action}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${r.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm text-foreground">
                    {isEn ? r.titleEn : r.titleTh}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isEn ? r.descEn : r.descTh}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Reset */}
      <div className="text-center pt-2">
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={onReset}>
          <RotateCcw className="h-3 w-3 mr-1" />
          {isEn ? "Change age selection" : "เปลี่ยนช่วงอายุ"}
        </Button>
      </div>
    </div>
  );
}
