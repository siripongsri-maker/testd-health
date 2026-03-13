import { useLanguage } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { trackEvent } from "@/hooks/useAnalytics";
import {
  Pill, TestTube, Shield, HeartHandshake, AlertTriangle,
  Phone, Building2, Heart,
} from "lucide-react";

interface Props {
  isMSM: boolean;
  isMSW: boolean;
  isYouth: boolean;
  ageRange?: string;
  onNavigate?: (section: string) => void;
}

interface Recommendation {
  id: string;
  icon: React.ElementType;
  titleTh: string;
  titleEn: string;
  descTh: string;
  descEn: string;
  action?: string;
  priority: number;
  color: string;
}

export function PersonalizedRecommendations({ isMSM, isMSW, isYouth, ageRange, onNavigate }: Props) {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isEn = language === "en";

  const recs: Recommendation[] = [];

  // MSM-specific
  if (isMSM) {
    recs.push({
      id: "prep",
      icon: Pill,
      titleTh: "PrEP ป้องกัน HIV",
      titleEn: "PrEP for HIV Prevention",
      descTh: "PrEP เหมาะสำหรับ MSM — ปรึกษา SWING Clinic เพื่อเริ่มต้น",
      descEn: "PrEP is recommended for MSM — consult SWING Clinic to start",
      action: "clinic",
      priority: 1,
      color: "border-blue-200/60 dark:border-blue-800/30",
    });
    recs.push({
      id: "sti",
      icon: TestTube,
      titleTh: "ตรวจ HIV/STI สม่ำเสมอ",
      titleEn: "Regular HIV/STI Testing",
      descTh: "แนะนำตรวจ HIV ทุก 3 เดือน และ STI ทุก 6 เดือน",
      descEn: "Recommended: HIV test every 3 months, STI every 6 months",
      action: "selftest",
      priority: 2,
      color: "border-emerald-200/60 dark:border-emerald-800/30",
    });
    recs.push({
      id: "chemsex",
      icon: AlertTriangle,
      titleTh: "Chemsex Harm Reduction",
      titleEn: "Chemsex Harm Reduction",
      descTh: "ข้อมูลลดอันตรายจากการใช้สารร่วมกับเพศสัมพันธ์",
      descEn: "Harm reduction info for substance use with sex",
      action: "learn",
      priority: 3,
      color: "border-amber-200/60 dark:border-amber-800/30",
    });
  }

  // MSW-specific
  if (isMSW) {
    recs.push({
      id: "swing-outreach",
      icon: Building2,
      titleTh: "บริการ SWING สำหรับ MSW",
      titleEn: "SWING Outreach for MSW",
      descTh: "SWING มีบริการเฉพาะสำหรับ MSW รวมถึงสุขภาพ กฎหมาย และการดูแล",
      descEn: "SWING offers MSW-specific services: health, legal, and care",
      action: "clinic",
      priority: 1,
      color: "border-violet-200/60 dark:border-violet-800/30",
    });
    recs.push({
      id: "violence-support",
      icon: HeartHandshake,
      titleTh: "ความช่วยเหลือหลังความรุนแรง",
      titleEn: "Violence & Safety Support",
      descTh: "หากเผชิญกับความรุนแรง — ความช่วยเหลือพร้อมอยู่",
      descEn: "Support available if you've experienced violence",
      action: "support",
      priority: 2,
      color: "border-rose-200/60 dark:border-rose-800/30",
    });
    recs.push({
      id: "mental-health",
      icon: Heart,
      titleTh: "สุขภาพจิตและการดูแลตัวเอง",
      titleEn: "Mental Health & Self-Care",
      descTh: "ดูแลสุขภาพจิตเป็นส่วนสำคัญของ harm reduction",
      descEn: "Mental health is a key part of harm reduction",
      action: "support",
      priority: 3,
      color: "border-pink-200/60 dark:border-pink-800/30",
    });
  }

  // Youth-specific
  if (isYouth) {
    recs.push({
      id: "youth-safe",
      icon: Shield,
      titleTh: "ข้อมูลสุขภาพสำหรับเยาวชน",
      titleEn: "Youth Health Information",
      descTh: "ข้อมูลสุขภาพและสุขภาพจิตที่เหมาะกับเยาวชน",
      descEn: "Age-appropriate health and mental health information",
      priority: 1,
      color: "border-sky-200/60 dark:border-sky-800/30",
    });
    recs.push({
      id: "youth-counselor",
      icon: Phone,
      titleTh: "ปรึกษาผู้เชี่ยวชาญ",
      titleEn: "Talk to a Counselor",
      descTh: "ผู้เชี่ยวชาญพร้อมรับฟังอย่างไม่ตัดสิน",
      descEn: "Non-judgmental support from trained professionals",
      action: "support",
      priority: 2,
      color: "border-teal-200/60 dark:border-teal-800/30",
    });
  }

  // Generic fallback if no specific recs
  if (recs.length === 0) {
    recs.push({
      id: "general-test",
      icon: TestTube,
      titleTh: "ตรวจ HIV/STI",
      titleEn: "HIV/STI Testing",
      descTh: "การตรวจเป็นประจำช่วยดูแลสุขภาพของคุณ",
      descEn: "Regular testing helps you stay on top of your health",
      action: "selftest",
      priority: 1,
      color: "border-emerald-200/60 dark:border-emerald-800/30",
    });
  }

  recs.sort((a, b) => a.priority - b.priority);

  const handleAction = (action?: string) => {
    if (!action) return;
    trackEvent("hr_personalized_rec_click", { action });
    if (action === "selftest") navigate("/hiv-selftest");
    else if (action === "clinic") onNavigate?.("support");
    else if (action === "learn") onNavigate?.("learn");
    else if (action === "support") onNavigate?.("support");
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <p className="text-xs font-semibold text-foreground">
          {isEn ? "Recommended for you" : "แนะนำสำหรับคุณ"}
        </p>
        <Badge variant="secondary" className="text-[9px]">
          {isEn ? "Personalized" : "ปรับแต่งแล้ว"}
        </Badge>
      </div>
      {recs.slice(0, 3).map((rec) => {
        const Icon = rec.icon;
        return (
          <Card
            key={rec.id}
            className={`border ${rec.color} cursor-pointer hover:shadow-md transition-all active:scale-[0.98]`}
            onClick={() => handleAction(rec.action)}
          >
            <CardContent className="p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-xs text-foreground">
                  {isEn ? rec.titleEn : rec.titleTh}
                </h3>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                  {isEn ? rec.descEn : rec.descTh}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
