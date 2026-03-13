import { useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { trackEvent } from "@/hooks/useAnalytics";
import { Shield, X, Info } from "lucide-react";
import type { HrProfile } from "@/hooks/useHrProfile";

interface Props {
  onSave: (data: Partial<HrProfile>) => Promise<void>;
  onDismiss: () => void;
}

const AGE_OPTIONS = [
  { value: "<18", labelTh: "<18", labelEn: "<18" },
  { value: "18-24", labelTh: "18–24", labelEn: "18–24" },
  { value: "25-34", labelTh: "25–34", labelEn: "25–34" },
  { value: "35-44", labelTh: "35–44", labelEn: "35–44" },
  { value: "45+", labelTh: "45+", labelEn: "45+" },
];

const GENDER_OPTIONS = [
  { value: "male", labelTh: "ชาย", labelEn: "Male" },
  { value: "female", labelTh: "หญิง", labelEn: "Female" },
  { value: "non_binary", labelTh: "Non-binary", labelEn: "Non-binary" },
  { value: "other", labelTh: "อื่นๆ", labelEn: "Other" },
  { value: "prefer_not_say", labelTh: "ไม่ต้องการระบุ", labelEn: "Prefer not to say" },
];

const BEHAVIOR_OPTIONS = [
  { value: "msm", labelTh: "MSM", labelEn: "MSM" },
  { value: "msw", labelTh: "MSW (ชายขายบริการ)", labelEn: "MSW (Male sex worker)" },
  { value: "heterosexual", labelTh: "ผู้ชายที่มีเพศสัมพันธ์กับผู้หญิง", labelEn: "Heterosexual" },
  { value: "bisexual", labelTh: "ไบเซ็กชวล", labelEn: "Bisexual" },
  { value: "diverse", labelTh: "หลากหลาย", labelEn: "Diverse" },
  { value: "prefer_not_say", labelTh: "ไม่ต้องการระบุ", labelEn: "Prefer not to say" },
];

export function DemographicCard({ onSave, onDismiss }: Props) {
  const { language } = useLanguage();
  const isEn = language === "en";
  const [age, setAge] = useState<string | null>(null);
  const [gender, setGender] = useState<string | null>(null);
  const [behavior, setBehavior] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      age_range: age || undefined,
      gender_identity: gender || undefined,
      sexual_behavior_category: behavior || undefined,
      consent_profile_use: true,
    });
    trackEvent("hr_demographic_saved", { age, gender, behavior });
    setSaving(false);
  };

  const hasAny = age || gender || behavior;

  return (
    <Card className="border border-primary/20 bg-primary/5">
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary flex-shrink-0" />
            <p className="text-sm font-medium text-foreground">
              {isEn
                ? "Personalize your recommendations"
                : "เพื่อให้คำแนะนำที่เหมาะกับคุณมากขึ้น"}
            </p>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 -mt-1 -mr-1" onClick={onDismiss}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        <p className="text-[11px] text-muted-foreground leading-relaxed">
          {isEn
            ? "Optional — skip anything you prefer. This helps tailor health guidance to your needs."
            : "ไม่จำเป็นต้องตอบ — ข้ามข้อที่ไม่ต้องการได้ ข้อมูลนี้ช่วยปรับคำแนะนำให้เหมาะกับคุณ"}
        </p>

        {/* Age */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-foreground">
            {isEn ? "Age range" : "ช่วงอายุ"}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {AGE_OPTIONS.map((opt) => (
              <Badge
                key={opt.value}
                variant={age === opt.value ? "default" : "outline"}
                className={`cursor-pointer text-xs px-3 py-1 transition-all ${
                  age === opt.value
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-primary/10"
                }`}
                onClick={() => setAge(age === opt.value ? null : opt.value)}
              >
                {isEn ? opt.labelEn : opt.labelTh}
              </Badge>
            ))}
          </div>
        </div>

        {/* Gender */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-foreground">
            {isEn ? "Gender identity" : "เพศสภาพ"}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {GENDER_OPTIONS.map((opt) => (
              <Badge
                key={opt.value}
                variant={gender === opt.value ? "default" : "outline"}
                className={`cursor-pointer text-xs px-3 py-1 transition-all ${
                  gender === opt.value
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-primary/10"
                }`}
                onClick={() => setGender(gender === opt.value ? null : opt.value)}
              >
                {isEn ? opt.labelEn : opt.labelTh}
              </Badge>
            ))}
          </div>
        </div>

        {/* Sexual behavior */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-foreground">
            {isEn ? "Sexual behavior" : "พฤติกรรมทางเพศ"}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {BEHAVIOR_OPTIONS.map((opt) => (
              <Badge
                key={opt.value}
                variant={behavior === opt.value ? "default" : "outline"}
                className={`cursor-pointer text-xs px-3 py-1 transition-all ${
                  behavior === opt.value
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-primary/10"
                }`}
                onClick={() => setBehavior(behavior === opt.value ? null : opt.value)}
              >
                {isEn ? opt.labelEn : opt.labelTh}
              </Badge>
            ))}
          </div>
        </div>

        {/* Privacy tooltip */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 cursor-help">
                <Info className="h-3 w-3 text-muted-foreground" />
                <p className="text-[10px] text-muted-foreground">
                  {isEn
                    ? "This data is used only to improve health recommendations and will not identify you."
                    : "ข้อมูลนี้ใช้เพื่อปรับคำแนะนำด้านสุขภาพให้เหมาะกับคุณ และจะไม่ถูกใช้ระบุตัวตน"}
                </p>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs max-w-[200px]">
                {isEn
                  ? "Your answers are stored anonymously and never linked to your identity. You can skip all questions."
                  : "คำตอบของคุณจัดเก็บแบบไม่ระบุตัวตน ไม่มีการเชื่อมโยงกับข้อมูลส่วนบุคคล คุณสามารถข้ามทุกคำถามได้"}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1 rounded-xl text-xs"
            onClick={handleSave}
            disabled={saving || !hasAny}
          >
            {saving
              ? (isEn ? "Saving..." : "กำลังบันทึก...")
              : (isEn ? "Save & personalize" : "บันทึกและปรับแต่ง")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="rounded-xl text-xs text-muted-foreground"
            onClick={onDismiss}
          >
            {isEn ? "Skip" : "ข้าม"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
