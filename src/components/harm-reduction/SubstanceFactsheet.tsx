import { useState, useRef, useCallback } from "react";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  Clock, Zap, AlertTriangle, CheckCircle2, Phone, Heart,
  Download, Share2, ChevronLeft, Shield,
} from "lucide-react";
import { SUBSTANCES, RISK_GRADIENTS, RISK_LABELS, type SubstanceData } from "@/data/substanceData";
import { RiskIcon } from "./factsheet/RiskIcon";
import { ExportModal } from "./factsheet/ExportModal";
import testdLogo from "@/assets/testd-logo.png";
import swingLogo from "@/assets/swing-logo.png";

interface Props {
  onBack?: () => void;
}

export function SubstanceFactsheet({ onBack }: Props) {
  const { language } = useLanguage();
  const isEn = language === "en";

  const [selectedId, setSelectedId] = useState(SUBSTANCES[0].id);
  const [exportOpen, setExportOpen] = useState(false);

  const data = SUBSTANCES.find((s) => s.id === selectedId) || SUBSTANCES[0];
  const c = data.content;

  const txt = (bi: { th: string; en: string }) => (isEn ? bi.en : bi.th);

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
            onClick={() => setSelectedId(s.id)}
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
        {/* 1. Header */}
        <div
          className="relative px-5 pt-6 pb-5"
          style={{ background: RISK_GRADIENTS[data.riskLevel] }}
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <span className="text-3xl">{data.icon}</span>
              <h1 className="text-xl font-bold text-white leading-tight">{isEn ? data.nameEn : data.nameTh}</h1>
              <p className="text-xs text-white/70 font-medium">{isEn ? data.nameTh : data.nameEn}</p>
            </div>
            <div className="flex flex-col items-end gap-1.5 mt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full" style={{ background: "rgba(255,255,255,.2)", color: "#fff", backdropFilter: "blur(4px)" }}>
                {isEn ? data.categoryEn : data.categoryTh}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full" style={{ background: "rgba(255,255,255,.25)", color: "#fff" }}>
                {txt(RISK_LABELS[data.riskLevel])}
              </span>
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
        <div className="px-5 py-4 border-b" style={{ borderColor: "hsl(var(--border))" }}>
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

        {/* 7. Footer */}
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

      {/* Export modal */}
      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        initialSubstance={data}
      />
    </div>
  );
}
