import { useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { trackEvent } from "@/hooks/useAnalytics";
import { Shield, X, Info, ChevronDown, ChevronUp } from "lucide-react";
import type { HrProfile } from "@/hooks/useHrProfile";

interface Props {
  onSave: (data: Partial<HrProfile>) => Promise<void>;
  onDismiss: () => void;
}

const AGE_OPTIONS = [
  { value: "<18", labelTh: "ต่ำกว่า 18 ปี", labelEn: "Under 18" },
  { value: "18-24", labelTh: "18–24", labelEn: "18–24" },
  { value: "25-34", labelTh: "25–34", labelEn: "25–34" },
  { value: "35-44", labelTh: "35–44", labelEn: "35–44" },
  { value: "45+", labelTh: "45+", labelEn: "45+" },
  { value: "prefer_not_say", labelTh: "ไม่ต้องการระบุ", labelEn: "Prefer not to say" },
];

const GENDER_OPTIONS = [
  { value: "male", labelTh: "ชาย", labelEn: "Male" },
  { value: "female", labelTh: "หญิง", labelEn: "Female" },
  { value: "trans", labelTh: "ทรานส์ / Trans", labelEn: "Trans" },
  { value: "non_binary", labelTh: "Non-binary", labelEn: "Non-binary" },
  { value: "other", labelTh: "อื่น ๆ", labelEn: "Other" },
  { value: "prefer_not_say", labelTh: "ไม่ต้องการระบุ", labelEn: "Prefer not to say" },
];

const CONTEXT_OPTIONS = [
  { value: "msm", labelTh: "ชายที่มีเพศสัมพันธ์กับชาย (MSM)", labelEn: "Men who have sex with men (MSM)" },
  { value: "msw", labelTh: "พนักงานบริการทางเพศ", labelEn: "Sex worker (SW)" },
  { value: "lgbtq", labelTh: "LGBTQ+", labelEn: "LGBTQ+" },
  { value: "chemsex", labelTh: "คนที่ใช้สารร่วมกับเซ็กซ์", labelEn: "People who use substances with sex" },
  { value: "general", labelTh: "คนที่ต้องการข้อมูลทั่วไป", labelEn: "General information" },
  { value: "prefer_not_say", labelTh: "ไม่ต้องการระบุ", labelEn: "Prefer not to say" },
];

export default function HrZonePersonalize({ onSave, onDismiss }: Props) {
  const { language } = useLanguage();
  const isEn = language === "en";
  const [expanded, setExpanded] = useState(false);
  const [age, setAge] = useState<string | null>(null);
  const [gender, setGender] = useState<string | null>(null);
  const [contexts, setContexts] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const toggleContext = (value: string) => {
    setContexts((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const hasAny = age || gender || contexts.length > 0;

  const handleSave = async () => {
    setSaving(true);
    const primaryBehavior = contexts.includes("msm")
      ? "msm"
      : contexts.includes("msw")
      ? "msw"
      : contexts[0] || undefined;

    await onSave({
      age_range: age || undefined,
      gender_identity: gender || undefined,
      sexual_behavior_category: primaryBehavior,
      is_msm: contexts.includes("msm"),
      is_msw: contexts.includes("msw"),
      consent_profile_use: true,
    });
    trackEvent("hr_demographic_saved", { age, gender, contexts });
    setSaving(false);
  };

  const ChipSelect = ({
    options,
    selected,
    onSelect,
    multi = false,
  }: {
    options: { value: string; labelTh: string; labelEn: string }[];
    selected: string | string[] | null;
    onSelect: (value: string) => void;
    multi?: boolean;
  }) => (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const isSelected = multi
          ? (selected as string[])?.includes(opt.value)
          : selected === opt.value;
        return (
          <Badge
            key={opt.value}
            variant={isSelected ? "default" : "outline"}
            className={`cursor-pointer text-xs px-3 py-1.5 rounded-full transition-all ${
              isSelected
                ? "bg-primary text-primary-foreground shadow-sm"
                : "hover:bg-primary/10 border-border/60"
            }`}
            onClick={() => onSelect(opt.value)}
          >
            {isEn ? opt.labelEn : opt.labelTh}
          </Badge>
        );
      })}
    </div>
  );

  return (
    <section>
      <Card className="border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden">
        <CardContent className="p-0">
          {/* Header - always visible */}
          <button
            className="w-full p-4 flex items-center gap-3 text-left"
            onClick={() => setExpanded(!expanded)}
          >
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Shield className="h-4.5 w-4.5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                {isEn
                  ? "Help us recommend what's right for you"
                  : "ช่วยให้เราแนะนำสิ่งที่เหมาะกับคุณ"}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {isEn
                  ? "Optional — no need to answer everything"
                  : "ไม่จำเป็นต้องตอบทุกข้อ"}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onDismiss(); }}>
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
              {expanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </button>

          {/* Expandable content */}
          {expanded && (
            <div className="px-4 pb-4 space-y-4 border-t border-border/30 pt-4">
              {/* Age */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-foreground">
                  {isEn ? "Age range" : "ช่วงอายุ"}
                </p>
                <ChipSelect
                  options={AGE_OPTIONS}
                  selected={age}
                  onSelect={(v) => setAge(age === v ? null : v)}
                />
              </div>

              {/* Gender */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-foreground">
                  {isEn ? "Gender identity" : "เพศสภาพ"}
                </p>
                <ChipSelect
                  options={GENDER_OPTIONS}
                  selected={gender}
                  onSelect={(v) => setGender(gender === v ? null : v)}
                />
              </div>

              {/* Context — multi-select */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-foreground">
                  {isEn
                    ? "What kind of content would be most useful?"
                    : "คุณรู้สึกว่าเนื้อหาแบบไหนจะเหมาะกับคุณมากกว่า"}
                </p>
                <ChipSelect
                  options={CONTEXT_OPTIONS}
                  selected={contexts}
                  onSelect={toggleContext}
                  multi
                />
              </div>

              {/* Privacy */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5 cursor-help">
                      <Info className="h-3 w-3 text-muted-foreground/60" />
                      <p className="text-[10px] text-muted-foreground/70">
                        {isEn
                          ? "Used only to improve recommendations. Never linked to your identity."
                          : "ใช้เพื่อปรับคำแนะนำเท่านั้น ไม่มีการเชื่อมโยงกับตัวตนของคุณ"}
                      </p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs max-w-[220px]">
                      {isEn
                        ? "Stored anonymously. You can skip all questions."
                        : "จัดเก็บแบบไม่ระบุตัวตน คุณสามารถข้ามทุกคำถามได้"}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 rounded-full text-xs h-9"
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
                  className="rounded-full text-xs text-muted-foreground h-9"
                  onClick={onDismiss}
                >
                  {isEn ? "Maybe later" : "ไว้ทีหลัง"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
