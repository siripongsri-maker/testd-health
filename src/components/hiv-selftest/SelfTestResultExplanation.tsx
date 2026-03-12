import { Info, CheckCircle2, AlertTriangle, XCircle, Shield, ArrowRight, HelpCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import testRefNegative from "@/assets/test-ref-negative.png";
import testRefReactive from "@/assets/test-ref-reactive.png";
import testRefInvalid from "@/assets/test-ref-invalid.png";

interface SelfTestResultExplanationProps {
  result: 'positive' | 'negative' | 'invalid' | 'inconclusive';
  confidence?: string; // 'high' | 'medium' | 'low'
  language: string;
}

export function SelfTestResultExplanation({ result, confidence, language }: SelfTestResultExplanationProps) {
  const isTh = language === 'th';

  // ── Section 1: Confidence Explanation ──
  const confidenceConfig = {
    high: {
      label: isTh ? 'สูง' : 'High',
      color: 'bg-success/15 border-success/30 text-success',
      dotColor: 'bg-success',
      description: isTh
        ? 'ภาพชัดเจน เห็นเส้นควบคุมและพื้นที่อ่านผลชัด ระบบจึงมั่นใจในการอ่านผล'
        : 'Image is clear with visible control line and reading area. System is confident in the reading.',
    },
    medium: {
      label: isTh ? 'ปานกลาง' : 'Medium',
      color: 'bg-amber-500/15 border-amber-500/30 text-amber-600',
      dotColor: 'bg-amber-500',
      description: isTh
        ? 'ภาพอ่านได้ แต่มีปัจจัยบางอย่าง เช่น แสงหรือมุมภาพ อาจทำให้การอ่านผลไม่สมบูรณ์'
        : 'Image is readable but some factors like lighting or angle may affect accuracy.',
    },
    low: {
      label: isTh ? 'ต่ำ' : 'Low',
      color: 'bg-muted border-border text-muted-foreground',
      dotColor: 'bg-muted-foreground',
      description: isTh
        ? 'ภาพไม่ชัดเจน หรือระบบไม่สามารถยืนยันผลได้อย่างมั่นใจ'
        : 'Image is unclear or system cannot confirm the result with confidence.',
    },
  };

  const conf = confidenceConfig[(confidence as keyof typeof confidenceConfig) || 'low'];

  // ── Section 2: Next Step Guidance ──
  const guidanceMap = {
    negative: {
      title: isTh ? 'คำแนะนำถัดไป' : 'Next Steps',
      items: [
        isTh
          ? 'หากมีความเสี่ยงภายในช่วง 3 เดือนที่ผ่านมา ควรตรวจซ้ำอีกครั้งหลังพ้นระยะ window period'
          : 'If you had risk exposure within the past 3 months, consider retesting after the window period.',
        isTh
          ? 'การใช้ถุงยางอนามัย และการตรวจสุขภาพทางเพศอย่างสม่ำเสมอช่วยลดความเสี่ยงได้'
          : 'Using condoms and regular sexual health check-ups can help reduce risk.',
      ],
      icon: Shield,
      accent: 'text-success',
    },
    positive: {
      title: isTh ? 'คำแนะนำถัดไป' : 'Next Steps',
      items: [
        isTh
          ? 'ผลนี้เป็นผลเบื้องต้นจากชุดตรวจด้วยตนเอง ควรไปตรวจยืนยันที่สถานพยาบาลหรือคลินิกโดยเร็วที่สุด'
          : 'This is a preliminary result from a self-test kit. Please visit a clinic or hospital for confirmatory testing as soon as possible.',
        isTh
          ? 'สามารถติดต่อเจ้าหน้าที่ หรือจองนัดตรวจยืนยันผ่านระบบได้'
          : 'You can contact staff or book a confirmatory test appointment through the system.',
      ],
      icon: ArrowRight,
      accent: 'text-destructive',
    },
    inconclusive: {
      title: isTh ? 'คำแนะนำถัดไป' : 'Next Steps',
      items: [
        isTh
          ? 'ระบบไม่สามารถอ่านผลได้อย่างชัดเจน แนะนำให้ถ่ายภาพใหม่ หรือทำการตรวจซ้ำด้วยชุดตรวจใหม่'
          : 'The system could not read the result clearly. Please retake the photo or use a new test kit.',
      ],
      icon: AlertTriangle,
      accent: 'text-amber-500',
    },
    invalid: {
      title: isTh ? 'คำแนะนำถัดไป' : 'Next Steps',
      items: [
        isTh
          ? 'ชุดตรวจอาจทำงานไม่สมบูรณ์ เช่น ไม่พบเส้นควบคุม กรุณาใช้ชุดตรวจใหม่และทำตามขั้นตอนอีกครั้ง'
          : 'The test kit may not have functioned properly (e.g., no control line). Please use a new kit and follow the steps again.',
      ],
      icon: XCircle,
      accent: 'text-amber-500',
    },
  };

  const guidance = guidanceMap[result];
  const GuidanceIcon = guidance.icon;

  // ── Section 3: Visual Reference ──
  const referenceCards = [
    {
      image: testRefNegative,
      label: isTh ? '1 ขีด (Negative)' : '1 Line (Negative)',
      description: isTh
        ? 'พบเฉพาะเส้นควบคุม (C line)\nไม่พบเส้นทดสอบ (T line)'
        : 'Only control line (C) visible.\nNo test line (T) detected.',
      meaning: isTh ? 'ไม่พบเชื้อ HIV' : 'No HIV detected',
      border: 'border-success/40',
    },
    {
      image: testRefReactive,
      label: isTh ? '2 ขีด (Reactive)' : '2 Lines (Reactive)',
      description: isTh
        ? 'พบเส้นควบคุม (C) และเส้นทดสอบ (T)\nแม้เส้น T จะจางก็ถือว่า reactive'
        : 'Control (C) and test (T) lines visible.\nEven a faint T line counts as reactive.',
      meaning: isTh
        ? 'ผลเป็นบวกเบื้องต้น ควรตรวจยืนยันที่สถานพยาบาล'
        : 'Preliminary positive — needs lab confirmation.',
      border: 'border-destructive/40',
    },
    {
      image: testRefInvalid,
      label: isTh ? 'Invalid' : 'Invalid',
      description: isTh
        ? 'ไม่พบเส้นควบคุม (C line)\nหรือชุดตรวจอ่านผลไม่ได้'
        : 'No control line (C) visible\nor test is unreadable.',
      meaning: isTh
        ? 'ผลตรวจไม่สมบูรณ์ ต้องใช้ชุดตรวจใหม่'
        : 'Invalid result — use a new test kit.',
      border: 'border-amber-500/40',
    },
  ];

  return (
    <div className="space-y-4 mt-4">
      {/* ── Confidence Section ── */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <h4 className="font-bold text-foreground text-sm">
            {isTh ? 'ระดับความมั่นใจของระบบ' : 'System Confidence Level'}
          </h4>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground transition-colors">
                  <HelpCircle className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-[280px]">
                <p className="text-xs">
                  {isTh
                    ? 'ระบบ AI อ่านผลจากภาพถ่ายชุดตรวจ โดยตรวจสอบเส้นควบคุม (C) และเส้นทดสอบ (T) ความมั่นใจขึ้นอยู่กับ: ความคมชัดของภาพ, แสงสว่าง, มุมกล้อง, ตำแหน่งเลือด และคุณภาพภาพโดยรวม'
                    : 'AI reads the test strip photo by checking the control (C) and test (T) lines. Confidence depends on: image clarity, lighting, camera angle, blood placement, and overall image quality.'}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Confidence indicator */}
        <div className={cn("flex items-center gap-3 rounded-xl border p-3", conf.color)}>
          <div className={cn("h-3 w-3 rounded-full flex-shrink-0", conf.dotColor)} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">{conf.label}</p>
            <p className="text-xs opacity-80 mt-0.5">{conf.description}</p>
          </div>
        </div>

        {/* All 3 levels reference */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          {(['high', 'medium', 'low'] as const).map((level) => {
            const c = confidenceConfig[level];
            const isActive = (confidence || 'low') === level;
            return (
              <div
                key={level}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg p-2 text-center border transition-all",
                  isActive ? c.color + " ring-1 ring-current" : "border-border/30 opacity-50"
                )}
              >
                <div className={cn("h-2 w-2 rounded-full", c.dotColor)} />
                <span className="text-[10px] font-medium">{c.label}</span>
              </div>
            );
          })}
        </div>

        {/* Low confidence warning */}
        {(confidence === 'low' || !confidence) && result === 'negative' && (
          <div className="mt-3 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <p className="text-xs text-amber-600 font-medium">
              {isTh
                ? '⚠️ ความมั่นใจต่ำ — ผลอาจไม่ถูกต้อง ไม่ควรอ่านเป็น "ไม่พบเชื้อ" แนะนำให้ถ่ายภาพใหม่หรือส่งให้เจ้าหน้าที่ตรวจสอบ'
                : '⚠️ Low confidence — result may not be accurate. Do not treat as confirmed negative. Retake photo or submit for staff review.'}
            </p>
          </div>
        )}
      </Card>

      {/* ── Next Step Guidance ── */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <GuidanceIcon className={cn("h-5 w-5", guidance.accent)} />
          <h4 className="font-bold text-foreground text-sm">{guidance.title}</h4>
        </div>
        <ul className="space-y-3">
          {guidance.items.map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary flex-shrink-0 mt-0.5">
                {i + 1}
              </span>
              <p className="text-sm text-muted-foreground leading-relaxed">{item}</p>
            </li>
          ))}
        </ul>
      </Card>

      {/* ── Visual Reference ── */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Info className="h-5 w-5 text-primary" />
          <h4 className="font-bold text-foreground text-sm">
            {isTh ? 'ตัวอย่างการอ่านผลชุดตรวจ' : 'Test Strip Reading Guide'}
          </h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {referenceCards.map((card, i) => (
            <div key={i} className={cn("rounded-xl border-2 overflow-hidden", card.border)}>
              <div className="bg-muted/30 p-2 flex items-center justify-center">
                <img
                  src={card.image}
                  alt={card.label}
                  className="h-24 w-auto object-contain"
                  loading="lazy"
                />
              </div>
              <div className="p-3 space-y-1.5">
                <p className="text-sm font-bold text-foreground">{card.label}</p>
                <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">
                  {card.description}
                </p>
                <p className="text-xs font-medium text-foreground/80 pt-1 border-t border-border/30">
                  {card.meaning}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
