import { useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle, Droplets, Heart, Shield, Pill, Zap,
  CheckCircle2, XCircle, TestTube, MessageCircle, Package,
  ClipboardCheck, BookOpen, Grid3X3,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { trackEvent } from "@/hooks/useAnalytics";
import { SubstanceLibrary } from "./SubstanceLibrary";
import { InteractionMatrix } from "./InteractionMatrix";

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
}

const TIPS: TipCard[] = [
  { id: "b1", icon: Pill, titleTh: "เตรียม PrEP ก่อนออกไป", titleEn: "Take PrEP Before Going Out", descTh: "กินยา PrEP ตามกำหนดเพื่อป้องกัน HIV อย่างมีประสิทธิภาพ", descEn: "Take PrEP as prescribed for effective HIV prevention", category: "before" },
  { id: "b2", icon: Shield, titleTh: "เตรียมถุงยางและเจล", titleEn: "Pack Condoms & Lube", descTh: "พกถุงยางและเจลหล่อลื่นติดตัวเสมอ ใช้เจลสูตรน้ำกับถุงยาง", descEn: "Always carry condoms and water-based lube with you", category: "before" },
  { id: "b3", icon: Droplets, titleTh: "เตรียมน้ำดื่มให้พร้อม", titleEn: "Prepare Hydration", descTh: "ดื่มน้ำก่อนและระหว่างกิจกรรม หลีกเลี่ยงแอลกอฮอล์มากเกินไป", descEn: "Stay hydrated before and during activities. Avoid excess alcohol", category: "before" },
  { id: "b4", icon: Heart, titleTh: "บอกเพื่อนที่ไว้ใจ", titleEn: "Tell a Trusted Friend", descTh: "แจ้งให้คนที่ไว้ใจรู้ว่าคุณอยู่ที่ไหน เผื่อเหตุฉุกเฉิน", descEn: "Let someone you trust know your plans and location", category: "before" },
  { id: "d1", icon: Droplets, titleTh: "ดื่มน้ำสม่ำเสมอ", titleEn: "Stay Hydrated", descTh: "ดื่มน้ำทุก 30-60 นาที โดยเฉพาะหากใช้สาร", descEn: "Drink water every 30-60 minutes, especially if using substances", category: "during" },
  { id: "d2", icon: Shield, titleTh: "ใช้ถุงยางทุกครั้ง", titleEn: "Use Condoms Every Time", descTh: "ใช้ถุงยางและเจลหล่อลื่นทุกครั้งที่มีเพศสัมพันธ์", descEn: "Use condoms and lube for every sexual encounter", category: "during" },
  { id: "d3", icon: AlertTriangle, titleTh: "หลีกเลี่ยงการผสมสาร", titleEn: "Avoid Mixing Substances", descTh: "การใช้สารออกฤทธิ์หลายชนิดร่วมกันอาจเพิ่มความเสี่ยงต่อสุขภาพอย่างมาก", descEn: "Using multiple substances together can significantly increase health risks", category: "during" },
  { id: "a1", icon: Droplets, titleTh: "พักผ่อนและฟื้นตัว", titleEn: "Rest & Recover", descTh: "นอนพักผ่อนให้เพียงพอ ดื่มน้ำ ทานอาหาร", descEn: "Get enough sleep, stay hydrated, eat well", category: "after" },
  { id: "a2", icon: TestTube, titleTh: "ตรวจ HIV/STI", titleEn: "Get HIV/STI Testing", descTh: "ตรวจ HIV และ STI ภายใน 2-4 สัปดาห์หลังกิจกรรม", descEn: "Get tested for HIV and STIs within 2-4 weeks", category: "after" },
  { id: "e1", icon: Zap, titleTh: "อาการ Overdose", titleEn: "Signs of Overdose", descTh: "หมดสติ หายใจลำบาก ชัก ตัวเขียว — โทร 1669 ทันที", descEn: "Unconscious, difficulty breathing, seizures, blue skin — call 1669 immediately", category: "emergency" },
  { id: "e2", icon: AlertTriangle, titleTh: "PEP ฉุกเฉิน", titleEn: "Emergency PEP", descTh: "หากสัมผัสเชื้อ HIV ให้เริ่ม PEP ภายใน 72 ชั่วโมง", descEn: "If exposed to HIV, start PEP within 72 hours", category: "emergency" },
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
  const [hubTab, setHubTab] = useState<string>("substances");

  return (
    <div className="space-y-6">
      {/* Top-level Learn tabs: Substance Library | Safety Tips | Myth vs Fact */}
      <Tabs value={hubTab} onValueChange={(v) => { setHubTab(v); trackEvent("hr_learn_tab", { tab: v }); }}>
        <TabsList className="grid grid-cols-4 h-auto gap-1 bg-muted/40 p-1 rounded-xl">
          <TabsTrigger value="substances" className="text-[10px] sm:text-xs py-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <BookOpen className="h-3 w-3 mr-1 hidden sm:inline" />
            {isEn ? "Substances" : "ความรู้สาร"}
          </TabsTrigger>
          <TabsTrigger value="interactions" className="text-[10px] sm:text-xs py-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Grid3X3 className="h-3 w-3 mr-1 hidden sm:inline" />
            {isEn ? "Mix Risk" : "ปฏิกิริยา"}
          </TabsTrigger>
          <TabsTrigger value="tips" className="text-[10px] sm:text-xs py-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            {isEn ? "Safety Tips" : "เคล็ดลับ"}
          </TabsTrigger>
          <TabsTrigger value="myths" className="text-[10px] sm:text-xs py-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            {isEn ? "Myth vs Fact" : "ความเชื่อ"}
          </TabsTrigger>
        </TabsList>

        {/* Substance Library */}
        <TabsContent value="substances" className="mt-3">
          <SubstanceLibrary onNavigate={onNavigate} />
        </TabsContent>

        {/* Interaction Matrix */}
        <TabsContent value="interactions" className="mt-3">
          <InteractionMatrix onNavigate={onNavigate} />
        </TabsContent>

        {/* Safety Tips - existing content */}
        <TabsContent value="tips" className="mt-3 space-y-4">
          <Tabs defaultValue="before">
        <TabsList className="grid grid-cols-4 h-auto gap-1 bg-muted/40 p-1 rounded-xl">
          {(Object.keys(categoryMeta) as Array<keyof typeof categoryMeta>).map(cat => (
            <TabsTrigger key={cat} value={cat} className="text-[10px] sm:text-xs py-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
              {isEn ? categoryMeta[cat].labelEn : categoryMeta[cat].labelTh}
            </TabsTrigger>
          ))}
        </TabsList>

        {(Object.keys(categoryMeta) as Array<keyof typeof categoryMeta>).map(cat => (
          <TabsContent key={cat} value={cat} className="mt-3">
            <div className="grid gap-2.5">
              {TIPS.filter(t => t.category === cat).map(tip => {
                const Icon = tip.icon;
                return (
                  <Card key={tip.id} className="border border-border/30">
                    <CardContent className="p-3.5">
                      <div className="flex items-start gap-3">
                        <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${categoryMeta[cat].color}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm text-foreground">
                            {isEn ? tip.titleEn : tip.titleTh}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                            {isEn ? tip.descEn : tip.descTh}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        ))}
          </Tabs>

          {/* Single CTA row */}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="h-8 text-xs rounded-full" onClick={() => { trackEvent("hr_cta_click", { action: "screening" }); onNavigate("check"); }}>
              <ClipboardCheck className="h-3.5 w-3.5 mr-1.5" />
              {isEn ? "Start Risk Check" : "ตรวจความเสี่ยง"}
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs rounded-full" onClick={() => { trackEvent("hr_cta_click", { action: "kit" }); navigate("/hiv-selftest"); }}>
              <Package className="h-3.5 w-3.5 mr-1.5" />
              {isEn ? "HIV Test Kit" : "ชุดตรวจ HIV"}
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs rounded-full" onClick={() => { trackEvent("hr_cta_click", { action: "counselor" }); onNavigate("support"); }}>
              <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
              {isEn ? "Talk to Counselor" : "ปรึกษา"}
            </Button>
          </div>
        </TabsContent>

        {/* Myth vs Fact */}
        <TabsContent value="myths" className="mt-3">
          <div className="grid gap-3">
            {MYTHS.map(myth => (
              <Card key={myth.id} className="border border-border/30 overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex items-start gap-3 p-3.5 bg-destructive/5">
                    <XCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-medium text-destructive uppercase tracking-wide">{isEn ? "Myth" : "ความเชื่อผิดๆ"}</p>
                      <p className="text-sm text-foreground mt-0.5">{isEn ? myth.mythEn : myth.mythTh}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3.5 bg-emerald-50/50 dark:bg-emerald-900/10">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-medium text-emerald-600 uppercase tracking-wide">{isEn ? "Fact" : "ความจริง"}</p>
                      <p className="text-sm text-foreground mt-0.5">{isEn ? myth.factEn : myth.factTh}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
