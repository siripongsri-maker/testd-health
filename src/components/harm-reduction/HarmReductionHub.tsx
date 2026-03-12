import { useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle, Droplets, Heart, Shield, Pill, Zap,
  CheckCircle2, XCircle, HelpCircle, ChevronRight,
  TestTube, MessageCircle, Package, ClipboardCheck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { trackEvent } from "@/hooks/useAnalytics";

interface Props {
  onNavigate: (tab: string) => void;
}

interface TipCard {
  id: string;
  icon: React.ElementType;
  titleTh: string;
  titleEn: string;
  descTh: string;
  descEn: string;
  category: "before" | "during" | "after" | "emergency";
  type: "tip" | "myth" | "checklist";
}

const TIPS: TipCard[] = [
  // Before
  { id: "b1", icon: Pill, titleTh: "เตรียม PrEP ก่อนออกไป", titleEn: "Take PrEP Before Going Out", descTh: "กินยา PrEP ตามกำหนดเพื่อป้องกัน HIV อย่างมีประสิทธิภาพ", descEn: "Take PrEP as prescribed for effective HIV prevention", category: "before", type: "tip" },
  { id: "b2", icon: Shield, titleTh: "เตรียมถุงยางและเจล", titleEn: "Pack Condoms & Lube", descTh: "พกถุงยางและเจลหล่อลื่นติดตัวเสมอ ใช้เจลสูตรน้ำกับถุงยาง", descEn: "Always carry condoms and water-based lube with you", category: "before", type: "checklist" },
  { id: "b3", icon: Droplets, titleTh: "เตรียมน้ำดื่มให้พร้อม", titleEn: "Prepare Hydration", descTh: "ดื่มน้ำก่อนและระหว่างกิจกรรม หลีกเลี่ยงแอลกอฮอล์มากเกินไป", descEn: "Stay hydrated before and during activities. Avoid excess alcohol", category: "before", type: "tip" },
  { id: "b4", icon: Heart, titleTh: "บอกเพื่อนที่ไว้ใจ", titleEn: "Tell a Trusted Friend", descTh: "แจ้งให้คนที่ไว้ใจรู้ว่าคุณอยู่ที่ไหน เผื่อเหตุฉุกเฉิน", descEn: "Let someone you trust know your plans and location", category: "before", type: "tip" },

  // During
  { id: "d1", icon: Droplets, titleTh: "ดื่มน้ำสม่ำเสมอ", titleEn: "Stay Hydrated", descTh: "ดื่มน้ำทุก 30-60 นาที โดยเฉพาะหากใช้สาร", descEn: "Drink water every 30-60 minutes, especially if using substances", category: "during", type: "tip" },
  { id: "d2", icon: Shield, titleTh: "ใช้ถุงยางทุกครั้ง", titleEn: "Use Condoms Every Time", descTh: "ใช้ถุงยางและเจลหล่อลื่นทุกครั้งที่มีเพศสัมพันธ์", descEn: "Use condoms and lube for every sexual encounter", category: "during", type: "tip" },
  { id: "d3", icon: AlertTriangle, titleTh: "ห้ามผสมสาร", titleEn: "Don't Mix Substances", descTh: "การผสมสารเสพติดหลายชนิดเพิ่มความเสี่ยงอย่างมาก", descEn: "Mixing multiple substances significantly increases risk", category: "during", type: "tip" },

  // After
  { id: "a1", icon: Droplets, titleTh: "พักผ่อนและฟื้นตัว", titleEn: "Rest & Recover", descTh: "นอนพักผ่อนให้เพียงพอ ดื่มน้ำ ทานอาหาร", descEn: "Get enough sleep, stay hydrated, eat well", category: "after", type: "tip" },
  { id: "a2", icon: TestTube, titleTh: "ตรวจ HIV/STI", titleEn: "Get HIV/STI Testing", descTh: "ตรวจ HIV และ STI ภายใน 2-4 สัปดาห์หลังกิจกรรม", descEn: "Get tested for HIV and STIs within 2-4 weeks", category: "after", type: "tip" },

  // Emergency
  { id: "e1", icon: Zap, titleTh: "อาการ Overdose", titleEn: "Signs of Overdose", descTh: "หมดสติ หายใจลำบาก ชัก ตัวเขียว — โทร 1669 ทันที", descEn: "Unconscious, difficulty breathing, seizures, blue skin — call 1669 immediately", category: "emergency", type: "tip" },
  { id: "e2", icon: AlertTriangle, titleTh: "PEP ฉุกเฉิน", titleEn: "Emergency PEP", descTh: "หากสัมผัสเชื้อ HIV ให้เริ่ม PEP ภายใน 72 ชั่วโมง", descEn: "If exposed to HIV, start PEP within 72 hours", category: "emergency", type: "tip" },
];

const MYTHS = [
  { id: "m1", mythTh: "ใช้สารแล้วไม่ต้องใช้ถุงยาง", mythEn: "You don't need condoms when using substances", factTh: "สารเสพติดไม่ได้ป้องกัน STI/HIV ต้องใช้ถุงยางทุกครั้ง", factEn: "Substances don't prevent STIs/HIV. Always use condoms" },
  { id: "m2", mythTh: "Chemsex ไม่อันตราย", mythEn: "Chemsex is not dangerous", factTh: "Chemsex เพิ่มความเสี่ยงต่อ HIV/STI, overdose และปัญหาสุขภาพจิต", factEn: "Chemsex increases risk of HIV/STIs, overdose, and mental health issues" },
  { id: "m3", mythTh: "PrEP ป้องกันทุกอย่าง", mythEn: "PrEP protects against everything", factTh: "PrEP ป้องกัน HIV เท่านั้น ยังต้องใช้ถุงยางป้องกัน STI อื่นๆ", factEn: "PrEP only prevents HIV. You still need condoms for other STIs" },
];

const categoryMeta = {
  before: { labelTh: "ก่อน", labelEn: "Before", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  during: { labelTh: "ระหว่าง", labelEn: "During", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  after: { labelTh: "หลัง", labelEn: "After", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
  emergency: { labelTh: "ฉุกเฉิน", labelEn: "Emergency", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
};

export function HarmReductionHub({ onNavigate }: Props) {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isEn = language === "en";
  const [hubTab, setHubTab] = useState<string>("before");

  const filtered = TIPS.filter(t => t.category === hubTab);

  const handleCTA = (action: string) => {
    trackEvent("hr_cta_click", { action });
    if (action === "screening") onNavigate("screening");
    else if (action === "kit") navigate("/hiv-selftest");
    else if (action === "counselor") onNavigate("support");
  };

  return (
    <div className="space-y-5">
      {/* Category tabs */}
      <Tabs value={hubTab} onValueChange={setHubTab}>
        <TabsList className="grid grid-cols-4 h-auto gap-1 bg-muted/40 p-1 rounded-xl">
          {(Object.keys(categoryMeta) as Array<keyof typeof categoryMeta>).map(cat => (
            <TabsTrigger key={cat} value={cat} className="text-[10px] sm:text-xs py-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
              {isEn ? categoryMeta[cat].labelEn : categoryMeta[cat].labelTh}
            </TabsTrigger>
          ))}
        </TabsList>

        {(Object.keys(categoryMeta) as Array<keyof typeof categoryMeta>).map(cat => (
          <TabsContent key={cat} value={cat} className="mt-3">
            <div className="grid gap-3">
              {TIPS.filter(t => t.category === cat).map(tip => {
                const Icon = tip.icon;
                return (
                  <Card key={tip.id} className="border border-border/40">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${categoryMeta[cat].color}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm text-foreground">
                            {isEn ? tip.titleEn : tip.titleTh}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            {isEn ? tip.descEn : tip.descTh}
                          </p>
                        </div>
                      </div>
                      {/* CTA row */}
                      <div className="flex flex-wrap gap-2 mt-3 pl-12">
                        <Button size="sm" variant="outline" className="h-7 text-[10px] rounded-full" onClick={() => handleCTA("screening")}>
                          <ClipboardCheck className="h-3 w-3 mr-1" />
                          {isEn ? "Risk Check" : "ตรวจความเสี่ยง"}
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-[10px] rounded-full" onClick={() => handleCTA("kit")}>
                          <Package className="h-3 w-3 mr-1" />
                          {isEn ? "HIV Test Kit" : "ชุดตรวจ HIV"}
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-[10px] rounded-full" onClick={() => handleCTA("counselor")}>
                          <MessageCircle className="h-3 w-3 mr-1" />
                          {isEn ? "Counselor" : "ปรึกษา"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Myth vs Fact Section */}
      <div>
        <h2 className="text-lg font-bold text-foreground mb-3">
          {isEn ? "🧠 Myth vs Fact" : "🧠 ความเชื่อ vs ความจริง"}
        </h2>
        <div className="grid gap-3">
          {MYTHS.map(myth => (
            <Card key={myth.id} className="border border-border/40 overflow-hidden">
              <CardContent className="p-0">
                <div className="flex items-start gap-3 p-4 bg-destructive/5">
                  <XCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-destructive">{isEn ? "Myth" : "ความเชื่อผิดๆ"}</p>
                    <p className="text-sm text-foreground">{isEn ? myth.mythEn : myth.mythTh}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-emerald-50/50 dark:bg-emerald-900/10">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-emerald-600">{isEn ? "Fact" : "ความจริง"}</p>
                    <p className="text-sm text-foreground">{isEn ? myth.factEn : myth.factTh}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
