import { useLanguage } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/hooks/useAnalytics";
import {
  ClipboardCheck, Shield, HeartHandshake, Building2,
  Lock, ChevronRight,
} from "lucide-react";

interface Props {
  onNavigate: (section: string) => void;
}

export default function HrZoneHero({ onNavigate }: Props) {
  const { language } = useLanguage();
  const isEn = language === "en";

  const quickActions = [
    {
      id: "check",
      icon: ClipboardCheck,
      labelTh: "เช็กความเสี่ยง",
      labelEn: "Check risk",
      section: "check",
    },
    {
      id: "plan",
      icon: Shield,
      labelTh: "วางแผนให้ปลอดภัย",
      labelEn: "Make a plan",
      section: "plan",
    },
    {
      id: "support",
      icon: HeartHandshake,
      labelTh: "ขอความช่วยเหลือ",
      labelEn: "Get support",
      section: "support",
    },
    {
      id: "clinic",
      icon: Building2,
      labelTh: "SWING Clinic",
      labelEn: "SWING Clinic",
      section: "clinic",
    },
  ];

  return (
    <section className="space-y-5">
      {/* Hero headline */}
      <div className="space-y-2.5">
        <h1 className="text-2xl font-bold text-foreground leading-tight">
          {isEn
            ? "Take better care of yourself"
            : "ดูแลตัวเองได้อย่างปลอดภัยมากขึ้น"}
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
          {isEn
            ? "A space for information, self-assessment, and connecting to services."
            : "พื้นที่สำหรับข้อมูล การประเมินตนเอง และการเชื่อมต่อบริการ"}
        </p>
      </div>

      {/* Quick actions - horizontal scroll on mobile */}
      <div className="grid grid-cols-2 gap-2.5">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              onClick={() => {
                trackEvent("hr_quick_action", { action: action.id });
                onNavigate(action.section);
              }}
              className="flex items-center gap-3 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/50 p-3.5 text-left transition-all hover:shadow-md active:scale-[0.97] group"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground leading-tight">
                {isEn ? action.labelEn : action.labelTh}
              </span>
            </button>
          );
        })}
      </div>

      {/* Privacy reassurance */}
      <div className="flex items-center gap-2 px-1">
        <Lock className="h-3 w-3 text-muted-foreground/60 shrink-0" />
        <p className="text-[11px] text-muted-foreground/70">
          {isEn
            ? "Non-judgmental. You choose what to share."
            : "ไม่ตัดสิน และเลือกได้ว่าจะแชร์ข้อมูลแค่ไหน"}
        </p>
      </div>
    </section>
  );
}
