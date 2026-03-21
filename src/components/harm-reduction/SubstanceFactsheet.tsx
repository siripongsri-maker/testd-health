import { useState, useCallback, useEffect } from "react";
import { trackEvent } from "@/hooks/useAnalytics";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Clock, Zap, AlertTriangle, CheckCircle2, Phone, Heart,
  Download, ChevronLeft, Shield, ChevronDown, Brain,
  MessageCircle, HeartHandshake, Sparkles, Users, Pill,
} from "lucide-react";
import { SUBSTANCES, RISK_LABELS, type SubstanceData, type BilingualText } from "@/data/substanceData";
import { RiskIcon } from "./factsheet/RiskIcon";
import { ExportModal } from "./factsheet/ExportModal";
import testdLogo from "@/assets/testd-logo.png";
import swingLogo from "@/assets/swing-logo.png";

interface Props {
  onBack?: () => void;
}

function CollapsibleSection({
  icon: Icon,
  title,
  children,
  iconColor,
  bgColor,
  defaultOpen = false,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  iconColor: string;
  bgColor?: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="border border-border/30 overflow-hidden" style={bgColor ? { background: bgColor } : undefined}>
        <CollapsibleTrigger className="w-full">
          <CardContent className="p-3 flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${iconColor}`}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <span className="text-sm font-medium text-foreground flex-1 text-left">{title}</span>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
          </CardContent>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-3 pb-3 pt-0">
            {children}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export function SubstanceFactsheet({ onBack }: Props) {
  const { language } = useLanguage();
  const isEn = language === "en";

  const [selectedId, setSelectedId] = useState(SUBSTANCES[0].id);
  const [exportOpen, setExportOpen] = useState(false);

  const data = SUBSTANCES.find((s) => s.id === selectedId) || SUBSTANCES[0];

  useEffect(() => {
    trackEvent("substance_view", { substance: data.slug });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const c = data.content;

  const txt = useCallback((bi: BilingualText) => (isEn ? bi.en : bi.th), [isEn]);

  const renderBullets = (items: BilingualText[], color?: string) => (
    <ul className="space-y-1.5 ml-10">
      {items.map((item, i) => (
        <li key={i} className="text-xs leading-relaxed flex gap-1.5" style={color ? { color } : undefined}>
          <span className="opacity-50 mt-0.5">•</span>
          <span className={color ? undefined : "text-muted-foreground"}>{txt(item)}</span>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="space-y-3">
      {/* Action bar */}
      <div className="flex items-center justify-between">
        {onBack && (
          <Button variant="ghost" size="sm" className="text-muted-foreground -ml-2" onClick={onBack}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            {isEn ? "Back" : "กลับ"}
          </Button>
        )}
        <div className="flex gap-2 ml-auto">
          <Button
            size="sm"
            className="rounded-full text-xs gap-1.5"
            onClick={() => setExportOpen(true)}
          >
            <Download className="h-3.5 w-3.5" />
            {isEn ? "Export / Share" : "ส่งออก / แชร์"}
          </Button>
        </div>
      </div>

      {/* Substance switcher */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {SUBSTANCES.map((s) => (
          <button
            key={s.id}
            onClick={() => {
              setSelectedId(s.id);
              trackEvent("substance_view", { substance: s.slug });
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
              selectedId === s.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <span>{s.icon}</span>
            <span>{isEn ? s.nameEn : s.nameTh}</span>
          </button>
        ))}
      </div>

      {/* Factsheet card */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "hsl(var(--card))",
          border: "1px solid hsl(var(--border))",
          boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
        }}
      >
        {/* 1. Image-based Header */}
        <div className="relative" style={{ minHeight: 200 }}>
          <img
            src={data.image.cover}
            alt={data.image.alt}
            className="w-full h-48 object-cover"
            loading="lazy"
          />
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(to top, rgba(0,0,0,.75) 0%, rgba(0,0,0,.3) 50%, rgba(0,0,0,.15) 100%)",
            }}
          />
          <div className="absolute inset-0 flex flex-col justify-end px-5 pb-5">
            <div className="flex items-end justify-between">
              <div className="space-y-1.5">
                <span className="text-3xl drop-shadow-lg">{data.icon}</span>
                <h1 className="text-xl font-bold text-white leading-tight drop-shadow-md">
                  {isEn ? data.nameEn : data.nameTh}
                </h1>
                <p className="text-xs text-white/70 font-medium">{isEn ? data.nameTh : data.nameEn}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <span
                  className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
                  style={{ background: "rgba(255,255,255,.2)", color: "#fff", backdropFilter: "blur(8px)" }}
                >
                  {isEn ? data.categoryEn : data.categoryTh}
                </span>
                <span
                  className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
                  style={{ background: "rgba(255,255,255,.25)", color: "#fff", backdropFilter: "blur(8px)" }}
                >
                  {txt(RISK_LABELS[data.riskLevel])}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Quick info */}
        <div className="px-5 py-4 border-b" style={{ borderColor: "hsl(var(--border))" }}>
          <p className="text-sm text-foreground/80 leading-relaxed mb-3">{txt(c.desc)}</p>
          <div className="flex gap-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5 text-primary" />
              <span className="font-medium">{c.duration}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Zap className="h-3.5 w-3.5 text-primary" />
              <span className="font-medium">{txt(c.keyEffect)}</span>
            </div>
          </div>
        </div>

        {/* 3. Risks */}
        <div className="px-5 py-4 border-b" style={{ borderColor: "hsl(var(--border))" }}>
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            {isEn ? "Potential Risks" : "ความเสี่ยงที่อาจเกิดขึ้น"}
          </h3>
          <div className="space-y-2">
            {c.risks.map((r, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="mt-0.5 flex-shrink-0 text-amber-500/70">
                  <RiskIcon name={r.iconName} color="currentColor" />
                </div>
                <p className="text-xs text-foreground/75 leading-relaxed">{txt(r)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 4. Harm Reduction */}
        <div className="px-5 py-4 border-b" style={{ background: "hsl(150 40% 96%)", borderColor: "hsl(var(--border))" }}>
          <h3 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5" style={{ color: "hsl(150 50% 30%)" }}>
            <Shield className="h-3.5 w-3.5" style={{ color: "hsl(150 60% 40%)" }} />
            {isEn ? "Harm Reduction Tips" : "คำแนะนำลดอันตราย"}
          </h3>
          <div className="space-y-2">
            {c.harmReduction.map((tip, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" style={{ color: "hsl(150 60% 40%)" }} />
                <p className="text-xs leading-relaxed" style={{ color: "hsl(150 30% 25%)" }}>{txt(tip)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 5. Emergency */}
        <div className="px-5 py-4 border-b" style={{ background: "hsl(0 60% 97%)", borderColor: "hsl(var(--border))" }}>
          <h3 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5" style={{ color: "hsl(0 60% 40%)" }}>
            <Phone className="h-3.5 w-3.5" style={{ color: "hsl(0 60% 50%)" }} />
            {isEn ? "Seek Help Immediately If…" : "ขอความช่วยเหลือทันทีหาก…"}
          </h3>
          <div className="space-y-2">
            {c.emergencySigns.map((sign, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" style={{ color: "hsl(0 60% 50%)" }} />
                <p className="text-xs font-medium leading-relaxed" style={{ color: "hsl(0 50% 35%)" }}>{txt(sign)}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-xl px-3 py-2 text-center" style={{ background: "hsl(0 60% 93%)" }}>
            <p className="text-xs font-bold" style={{ color: "hsl(0 60% 40%)" }}>
              📞 {isEn ? "Emergency: 1323 or 1669" : "ฉุกเฉิน: 1323 หรือ 1669"}
            </p>
          </div>
        </div>

        {/* 6. Aftercare */}
        <div className="px-5 py-4" style={{ borderColor: "hsl(var(--border))" }}>
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
            <Heart className="h-3.5 w-3.5 text-pink-400" />
            {isEn ? "Aftercare & Recovery" : "การดูแลหลังใช้"}
          </h3>
          <div className="space-y-2">
            {c.aftercare.map((tip, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <Heart className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-pink-300" />
                <p className="text-xs text-foreground/70 leading-relaxed">{txt(tip)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Enhanced Content Sections ─── */}

      {/* Safer Use: Before / During / After */}
      <CollapsibleSection
        icon={Shield}
        title={isEn ? "Safer Use Guide" : "คู่มือใช้อย่างปลอดภัย"}
        iconColor="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
        defaultOpen
      >
        <div className="space-y-3">
          {/* Before */}
          <div>
            <p className="text-[11px] font-semibold text-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 text-[10px]">1</span>
              {isEn ? "Before use" : "ก่อนใช้"}
            </p>
            {renderBullets(c.saferUse.before)}
          </div>
          {/* During */}
          <div>
            <p className="text-[11px] font-semibold text-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 text-[10px]">2</span>
              {isEn ? "During use" : "ระหว่างใช้"}
            </p>
            {renderBullets(c.saferUse.during)}
          </div>
          {/* After */}
          <div>
            <p className="text-[11px] font-semibold text-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-600 dark:text-violet-400 text-[10px]">3</span>
              {isEn ? "After use" : "หลังใช้"}
            </p>
            {renderBullets(c.saferUse.after)}
          </div>
        </div>
      </CollapsibleSection>

      {/* Mixing Risks */}
      <CollapsibleSection
        icon={Pill}
        title={isEn ? "Dangerous Combinations" : "การใช้ร่วมกับสารอื่น"}
        iconColor="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
      >
        <div className="space-y-2 ml-0">
          {c.mixingRisks.map((mix, i) => {
            const sevBg = mix.severity === "critical"
              ? "bg-destructive/10 border-destructive/30"
              : mix.severity === "high"
              ? "bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/30"
              : "bg-muted border-border/30";
            const sevLabel = mix.severity === "critical"
              ? "⛔ CRITICAL"
              : mix.severity === "high"
              ? "⚠️ HIGH"
              : "⚡ MEDIUM";
            return (
              <div key={i} className={`rounded-xl border p-2.5 ${sevBg}`}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold text-foreground">
                    {isEn ? data.nameEn : data.nameTh} + {txt(mix.substance)}
                  </p>
                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${
                    mix.severity === "critical"
                      ? "bg-destructive text-destructive-foreground"
                      : mix.severity === "high"
                      ? "bg-amber-200 text-amber-800 dark:bg-amber-800/30 dark:text-amber-300"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {sevLabel}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{txt(mix.risk)}</p>
              </div>
            );
          })}
        </div>
      </CollapsibleSection>

      {/* Mental & Emotional Care */}
      <CollapsibleSection
        icon={Brain}
        title={isEn ? "Mental & Emotional Care" : "ดูแลจิตใจและอารมณ์"}
        iconColor="bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"
      >
        {renderBullets(c.mentalCare)}
      </CollapsibleSection>

      {/* Real-life Scenarios */}
      <CollapsibleSection
        icon={Users}
        title={isEn ? "Real-life Scenarios" : "สถานการณ์จริง"}
        iconColor="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
      >
        <div className="space-y-3 ml-0">
          {c.scenarios.map((scenario, i) => (
            <div key={i} className="rounded-xl border border-border/30 bg-muted/30 p-3">
              <p className="text-xs font-semibold text-foreground mb-2">{txt(scenario.scenario)}</p>
              <ul className="space-y-1">
                {scenario.tips.map((tip, j) => (
                  <li key={j} className="text-[11px] text-muted-foreground leading-relaxed flex gap-1.5">
                    <CheckCircle2 className="h-3 w-3 mt-0.5 flex-shrink-0 text-primary/60" />
                    <span>{txt(tip)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* Footer */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
        <div className="px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <img src={testdLogo} alt="testD" className="h-5 w-auto" />
              <span className="text-[10px] text-muted-foreground font-medium">×</span>
              <img src={swingLogo} alt="SWING" className="h-5 w-auto" />
            </div>
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center"
              style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}
            >
              <span className="text-[8px] text-muted-foreground font-medium text-center leading-tight">QR<br/>Code</span>
            </div>
          </div>
          <p className="text-[9px] text-muted-foreground/60 leading-relaxed">
            {isEn
              ? "This factsheet is for educational purposes only. It is not medical advice. Always consult a healthcare professional. Content by SWING Thailand."
              : "เอกสารนี้เพื่อการศึกษาเท่านั้น ไม่ใช่คำแนะนำทางการแพทย์ ปรึกษาแพทย์เสมอ เนื้อหาโดย SWING Thailand"}
          </p>
        </div>
      </div>

      {/* Need Support CTA */}
      <Card className="border border-primary/20 bg-primary/5">
        <CardContent className="p-4 text-center space-y-3">
          <Sparkles className="h-5 w-5 mx-auto text-primary/60" />
          <p className="text-sm font-semibold text-foreground">
            {isEn ? "Need support?" : "ต้องการความช่วยเหลือ?"}
          </p>
          <p className="text-xs text-muted-foreground">
            {isEn
              ? "Our team is here for you — confidential, non-judgmental."
              : "ทีมของเราพร้อมช่วยคุณ — เป็นความลับ ไม่ตัดสิน"}
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            <Button size="sm" className="rounded-full text-xs h-8">
              <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
              {isEn ? "Talk to Someone" : "พูดคุยกับเรา"}
            </Button>
            <Button size="sm" variant="outline" className="rounded-full text-xs h-8">
              <HeartHandshake className="h-3.5 w-3.5 mr-1.5" />
              {isEn ? "Mental Health Check" : "ตรวจสุขภาพจิต"}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            {isEn ? "Emergency: 1669 | Mental health: 1323" : "ฉุกเฉิน: 1669 | สุขภาพจิต: 1323"}
          </p>
        </CardContent>
      </Card>

      {/* Export modal */}
      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        initialSubstance={data}
      />
    </div>
  );
}
