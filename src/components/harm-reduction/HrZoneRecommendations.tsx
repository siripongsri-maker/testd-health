import { useLanguage } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trackEvent } from "@/hooks/useAnalytics";
import { useNavigate } from "react-router-dom";
import {
  Pill, TestTube, AlertTriangle, HeartHandshake, Building2,
  Heart, Shield, Phone, Sparkles, ChevronRight,
} from "lucide-react";

interface Props {
  isMSM: boolean;
  isMSW: boolean;
  isYouth: boolean;
  ageRange?: string;
  hasPlanner?: boolean;
  hasDistress?: boolean;
  onNavigate: (section: string) => void;
}

interface Rec {
  id: string;
  icon: React.ElementType;
  titleTh: string;
  titleEn: string;
  descTh: string;
  descEn: string;
  action: string;
  accent: string;
  iconBg: string;
}

export default function HrZoneRecommendations({
  isMSM, isMSW, isYouth, ageRange, hasPlanner, hasDistress, onNavigate,
}: Props) {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isEn = language === "en";

  const recs: Rec[] = [];

  if (hasDistress) {
    recs.push({
      id: "talk",
      icon: Phone,
      titleTh: "พูดคุยกับผู้เชี่ยวชาญ",
      titleEn: "Talk to someone",
      descTh: "มีคนพร้อมรับฟังคุณ — ไม่ตัดสิน",
      descEn: "Someone is ready to listen — non-judgmental",
      action: "support",
      accent: "border-rose-200/60",
      iconBg: "bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400",
    });
  }

  if (isMSM) {
    recs.push(
      {
        id: "prep",
        icon: Pill,
        titleTh: "PrEP ป้องกัน HIV",
        titleEn: "PrEP for HIV prevention",
        descTh: "ปรึกษา SWING Clinic เพื่อเริ่มต้นใช้ PrEP",
        descEn: "Consult SWING Clinic to start PrEP",
        action: "clinic",
        accent: "border-blue-200/60",
        iconBg: "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400",
      },
      {
        id: "sti",
        icon: TestTube,
        titleTh: "ตรวจ HIV/STI สม่ำเสมอ",
        titleEn: "Regular HIV/STI testing",
        descTh: "แนะนำตรวจทุก 3 เดือน",
        descEn: "Recommended every 3 months",
        action: "selftest",
        accent: "border-emerald-200/60",
        iconBg: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400",
      },
      {
        id: "chemsex",
        icon: AlertTriangle,
        titleTh: "ความปลอดภัย Chemsex",
        titleEn: "Chemsex safety",
        descTh: "เช็กปฏิกิริยาข้ามสารและเคล็ดลับ",
        descEn: "Check mix risks and safety tips",
        action: "learn",
        accent: "border-amber-200/60",
        iconBg: "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400",
      }
    );
  }

  if (isMSW) {
    recs.push(
      {
        id: "swing-msw",
        icon: Building2,
        titleTh: "บริการ SWING สำหรับ MSW",
        titleEn: "SWING services for MSW",
        descTh: "สุขภาพ กฎหมาย และการดูแลเฉพาะ",
        descEn: "Health, legal, and specialized care",
        action: "clinic",
        accent: "border-violet-200/60",
        iconBg: "bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400",
      },
      {
        id: "violence",
        icon: HeartHandshake,
        titleTh: "ช่วยเหลือหลังความรุนแรง",
        titleEn: "Violence & safety support",
        descTh: "ความช่วยเหลือพร้อมอยู่",
        descEn: "Support is available",
        action: "support",
        accent: "border-rose-200/60",
        iconBg: "bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400",
      },
      {
        id: "mental",
        icon: Heart,
        titleTh: "สุขภาพจิตและการดูแลตัวเอง",
        titleEn: "Mental health & self-care",
        descTh: "ส่วนสำคัญของ harm reduction",
        descEn: "A key part of harm reduction",
        action: "support",
        accent: "border-pink-200/60",
        iconBg: "bg-pink-100 text-pink-600 dark:bg-pink-900/40 dark:text-pink-400",
      }
    );
  }

  if (isYouth) {
    recs.push({
      id: "youth",
      icon: Shield,
      titleTh: "ข้อมูลสุขภาพสำหรับเยาวชน",
      titleEn: "Youth health information",
      descTh: "ข้อมูลที่เหมาะกับเยาวชน",
      descEn: "Age-appropriate health info",
      action: "support",
      accent: "border-sky-200/60",
      iconBg: "bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400",
    });
  }

  if (hasPlanner) {
    recs.push({
      id: "recovery",
      icon: Heart,
      titleTh: "โหมดฟื้นตัว",
      titleEn: "Recovery mode",
      descTh: "เช็กอินหลังปาร์ตี้",
      descEn: "Post-session check-in",
      action: "plan",
      accent: "border-teal-200/60",
      iconBg: "bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-400",
    });
  }

  if (recs.length === 0) {
    recs.push({
      id: "general-test",
      icon: TestTube,
      titleTh: "ตรวจ HIV/STI",
      titleEn: "HIV/STI testing",
      descTh: "ตรวจเป็นประจำช่วยดูแลสุขภาพ",
      descEn: "Regular testing supports your health",
      action: "selftest",
      accent: "border-emerald-200/60",
      iconBg: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400",
    });
  }

  const handleAction = (action: string) => {
    trackEvent("hr_rec_click", { action });
    if (action === "selftest") navigate("/hiv-selftest");
    else if (action === "clinic") onNavigate("clinic");
    else onNavigate(action);
  };

  const displayRecs = recs.slice(0, 4);

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h2 className="text-base font-semibold text-foreground">
          {isEn ? "Recommended for you" : "แนะนำสำหรับคุณ"}
        </h2>
        <Badge variant="secondary" className="text-[9px] rounded-full px-2">
          {isEn ? "Personalized" : "ปรับแต่ง"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {displayRecs.map((rec) => {
          const Icon = rec.icon;
          return (
            <Card
              key={rec.id}
              className={`border ${rec.accent} cursor-pointer hover:shadow-md transition-all active:scale-[0.98]`}
              onClick={() => handleAction(rec.action)}
            >
              <CardContent className="p-3.5 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${rec.iconBg}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm text-foreground">
                    {isEn ? rec.titleEn : rec.titleTh}
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    {isEn ? rec.descEn : rec.descTh}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/30 shrink-0" />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
