import { useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { PageContainer } from "@/components/PageContainer";
import { HarmReductionHub } from "@/components/harm-reduction/HarmReductionHub";
import { RiskScreening } from "@/components/harm-reduction/RiskScreening";
import { SaferUsePlanner } from "@/components/harm-reduction/SaferUsePlanner";
import { CounselingReferral } from "@/components/harm-reduction/CounselingReferral";
import { AgeGate } from "@/components/harm-reduction/AgeGate";
import { YouthSafePage } from "@/components/harm-reduction/YouthSafePage";
import { PeerSupport } from "@/components/harm-reduction/PeerSupport";
import { AICompanion } from "@/components/harm-reduction/AICompanion";
import { NudgeCard } from "@/components/harm-reduction/NudgeCard";
import { DailyCheckin } from "@/components/harm-reduction/DailyCheckin";
import { HealthProgressTracker } from "@/components/harm-reduction/HealthProgressTracker";
import { getActiveNudges, type Nudge } from "@/lib/SafetyNudges";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BookOpen, ClipboardCheck, Shield, HeartHandshake,
  ArrowLeft, Lock, Phone, RotateCcw, Users, Sparkles,
} from "lucide-react";
import { trackEvent } from "@/hooks/useAnalytics";
import { SEOHead, buildMedicalPageJsonLd } from "@/components/seo";

const AGE_STORAGE_KEY = "hr_age_confirmed";

type AgeState = "pending" | "adult" | "minor";
type Section = "landing" | "learn" | "check" | "plan" | "support" | "peers";

export default function HarmReduction() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isEn = language === "en";

  const [ageState, setAgeState] = useState<AgeState>(() => {
    const stored = localStorage.getItem(AGE_STORAGE_KEY);
    if (stored === "adult") return "adult";
    if (stored === "minor") return "minor";
    return "pending";
  });

  const [section, setSection] = useState<Section>("landing");
  const [nudges, setNudges] = useState<Nudge[]>(() => getActiveNudges());

  const handleAgeConfirm = (isAdult: boolean) => {
    const state = isAdult ? "adult" : "minor";
    localStorage.setItem(AGE_STORAGE_KEY, state);
    setAgeState(state);
    trackEvent("hr_age_gate", { result: state });
  };

  const resetAge = () => {
    localStorage.removeItem(AGE_STORAGE_KEY);
    setAgeState("pending");
  };

  const dismissNudge = (id: string) => {
    setNudges((prev) => prev.filter((n) => n.id !== id));
  };

  // Age gate
  if (ageState === "pending") {
    return (
      <PageContainer className="pb-24">
        <AgeGate onConfirm={handleAgeConfirm} />
      </PageContainer>
    );
  }

  // Youth safe page
  if (ageState === "minor") {
    return (
      <PageContainer className="pb-24">
        <YouthSafePage onReset={resetAge} />
      </PageContainer>
    );
  }

  // Section views
  if (section !== "landing") {
    return (
      <PageContainer className="pb-24">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 -ml-2 text-muted-foreground"
          onClick={() => setSection("landing")}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          {isEn ? "Back" : "กลับ"}
        </Button>

        {section === "learn" && <HarmReductionHub onNavigate={(tab) => setSection(tab as Section)} />}
        {section === "check" && <RiskScreening userId={user?.id} onNavigateSupport={() => setSection("support")} />}
        {section === "plan" && <SaferUsePlanner userId={user?.id} />}
        {section === "support" && <CounselingReferral userId={user?.id} />}
        {section === "peers" && <PeerSupport />}

        <AICompanion />
      </PageContainer>
    );
  }

  // Landing page
  const mainCards: {
    id: Section;
    icon: React.ElementType;
    titleTh: string;
    titleEn: string;
    descTh: string;
    descEn: string;
    color: string;
    iconBg: string;
  }[] = [
    {
      id: "learn",
      icon: BookOpen,
      titleTh: "เรียนรู้",
      titleEn: "Learn",
      descTh: "ข้อมูลความปลอดภัยก่อน ระหว่าง และหลัง",
      descEn: "Safety info before, during & after",
      color: "border-blue-200/60 dark:border-blue-800/30",
      iconBg: "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400",
    },
    {
      id: "check",
      icon: ClipboardCheck,
      titleTh: "ประเมิน",
      titleEn: "Check",
      descTh: "ตรวจความเสี่ยงและสุขภาพจิต",
      descEn: "Risk & mental health self-check",
      color: "border-amber-200/60 dark:border-amber-800/30",
      iconBg: "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400",
    },
    {
      id: "plan",
      icon: Shield,
      titleTh: "วางแผน",
      titleEn: "Plan",
      descTh: "เตรียมตัวให้ปลอดภัยและตั้งเตือน",
      descEn: "Safer-use planning & reminders",
      color: "border-emerald-200/60 dark:border-emerald-800/30",
      iconBg: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400",
    },
    {
      id: "support",
      icon: HeartHandshake,
      titleTh: "ขอความช่วยเหลือ",
      titleEn: "Support",
      descTh: "ปรึกษา นัดหมาย หรือขอความช่วยเหลือเร่งด่วน",
      descEn: "Counseling, referral & urgent help",
      color: "border-rose-200/60 dark:border-rose-800/30",
      iconBg: "bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400",
    },
    {
      id: "peers",
      icon: Users,
      titleTh: "เพื่อนช่วยเพื่อน",
      titleEn: "Peers",
      descTh: "พื้นที่แชร์ประสบการณ์แบบไม่ระบุตัวตน",
      descEn: "Anonymous peer support space",
      color: "border-violet-200/60 dark:border-violet-800/30",
      iconBg: "bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400",
    },
  ];

  return (
    <PageContainer className="pb-24">
      {/* Hero */}
      <div className="mb-6 space-y-2">
        <h1 className="text-2xl font-bold text-foreground">
          {isEn ? "Harm Reduction" : "Harm Reduction"}
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
          {isEn
            ? "Take care of yourself — before, during, and after. A safe space for information, self-assessment, and connecting to services."
            : "ดูแลตัวเองอย่างปลอดภัยขึ้น ก่อน ระหว่าง และหลังปาร์ตี้ — พื้นที่ปลอดภัยสำหรับข้อมูล การประเมินตนเอง และการเชื่อมต่อบริการ"}
        </p>
      </div>

      {/* Safety Nudges */}
      {nudges.length > 0 && (
        <div className="space-y-2 mb-4">
          {nudges.map((nudge) => (
            <NudgeCard key={nudge.id} nudge={nudge} onDismiss={() => dismissNudge(nudge.id)} />
          ))}
        </div>
      )}

      {/* Daily Check-in */}
      <div className="mb-4">
        <DailyCheckin />
      </div>

      {/* Main Cards — 2-col grid, last card spans full if odd */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {mainCards.map((card, idx) => {
          const Icon = card.icon;
          const isLast = idx === mainCards.length - 1 && mainCards.length % 2 !== 0;
          return (
            <Card
              key={card.id}
              className={`border ${card.color} cursor-pointer hover:shadow-lg transition-all active:scale-[0.98] ${isLast ? "col-span-2" : ""}`}
              onClick={() => {
                setSection(card.id);
                trackEvent("hr_section_enter", { section: card.id });
              }}
            >
              <CardContent className={`p-4 flex ${isLast ? "flex-row items-center" : "flex-col items-start"} gap-3 ${isLast ? "" : "min-h-[120px]"}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.iconBg}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-foreground">
                    {isEn ? card.titleEn : card.titleTh}
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    {isEn ? card.descEn : card.descTh}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Health Progress */}
      <div className="mb-4">
        <HealthProgressTracker userId={user?.id} />
      </div>

      {/* Emergency shortcut */}
      <Card className="border border-red-200/50 dark:border-red-800/30 mb-4">
        <CardContent className="p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
            <Phone className="h-4 w-4 text-red-600 dark:text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground">
              {isEn ? "Emergency? Call 1669" : "เหตุฉุกเฉิน? โทร 1669"}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {isEn ? "Mental health hotline: 1323" : "สายด่วนสุขภาพจิต: 1323"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Safety notice */}
      <div className="rounded-2xl bg-muted/40 p-4 space-y-1">
        <div className="flex items-center gap-2">
          <Lock className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-[11px] font-medium text-muted-foreground">
            {isEn ? "Safe & Private" : "ปลอดภัยและเป็นส่วนตัว"}
          </p>
        </div>
        <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
          {isEn
            ? "This content is created for harm reduction and health care. We don't judge your behavior, and your information is used safely and privately."
            : "เนื้อหานี้จัดทำเพื่อการลดอันตรายและการดูแลสุขภาพ เราไม่ตัดสินพฤติกรรมของคุณ และข้อมูลของคุณจะถูกใช้อย่างปลอดภัยและเป็นส่วนตัว"}
        </p>
      </div>

      {/* Reset age */}
      <div className="text-center mt-4">
        <Button variant="ghost" size="sm" className="text-[11px] text-muted-foreground/50" onClick={resetAge}>
          <RotateCcw className="h-3 w-3 mr-1" />
          {isEn ? "Change age selection" : "เปลี่ยนช่วงอายุ"}
        </Button>
      </div>

      {/* Floating AI Companion */}
      <AICompanion />
    </PageContainer>
  );
}
