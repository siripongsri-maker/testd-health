import { useState, useRef, useCallback } from "react";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  Clock, Zap, AlertTriangle, CheckCircle2, Phone, Heart,
  Download, Share2, ChevronLeft, Shield, Droplets, Brain,
  Flame, Eye, Activity,
} from "lucide-react";
import testdLogo from "@/assets/testd-logo.png";
import swingLogo from "@/assets/swing-logo.png";

/* ── Sample substance data (Methamphetamine) ────────────────── */

interface FactsheetData {
  nameTh: string;
  nameEn: string;
  icon: string;
  categoryTh: string;
  categoryEn: string;
  riskLevel: "high" | "medium" | "low";
  descTh: string;
  descEn: string;
  duration: string;
  keyEffect: { th: string; en: string };
  risks: { icon: React.ReactNode; th: string; en: string }[];
  harmReduction: { th: string; en: string }[];
  emergencySigns: { th: string; en: string }[];
  aftercare: { th: string; en: string }[];
}

const METH_DATA: FactsheetData = {
  nameTh: "ยาบ้า / ไอซ์",
  nameEn: "Methamphetamine",
  icon: "💎",
  categoryTh: "สารกระตุ้น",
  categoryEn: "Stimulant",
  riskLevel: "high",
  descTh: "สารกระตุ้นออกฤทธิ์แรงที่เพิ่มพลังงาน ความตื่นตัว และความสุข แต่มีความเสี่ยงสูงต่อสุขภาพ",
  descEn: "A potent stimulant that boosts energy, alertness, and euphoria, but carries significant health risks.",
  duration: "4–12 hrs",
  keyEffect: { th: "พลังงาน, ความสุข, ตื่นตัว", en: "Energy, euphoria, alertness" },
  risks: [
    { icon: <Activity className="h-3.5 w-3.5" />, th: "อาจทำให้หัวใจเต้นเร็วและความดันสูง", en: "May cause rapid heart rate and high blood pressure" },
    { icon: <Brain className="h-3.5 w-3.5" />, th: "อาจทำให้วิตกกังวล หวาดระแวง หรือนอนไม่หลับ", en: "May cause anxiety, paranoia, or insomnia" },
    { icon: <Flame className="h-3.5 w-3.5" />, th: "ความเสี่ยงภาวะร่างกายร้อนเกินไป (overheating)", en: "Risk of overheating (hyperthermia)" },
    { icon: <Droplets className="h-3.5 w-3.5" />, th: "อาจทำให้ขาดน้ำอย่างรุนแรง", en: "May cause severe dehydration" },
    { icon: <Eye className="h-3.5 w-3.5" />, th: "ใช้บ่อยอาจส่งผลต่อจิตใจและความจำ", en: "Frequent use may affect mental health and memory" },
  ],
  harmReduction: [
    { th: "เริ่มจากปริมาณน้อย รอดูผลก่อนเพิ่ม", en: "Start with a small amount, wait before taking more" },
    { th: "ดื่มน้ำสม่ำเสมอ (ไม่เกิน 500ml/ชม.)", en: "Stay hydrated (max 500ml/hour)" },
    { th: "หลีกเลี่ยงการใช้ร่วมกับแอลกอฮอล์หรือสารอื่น", en: "Avoid mixing with alcohol or other substances" },
    { th: "พักเป็นระยะ ลดอุณหภูมิร่างกาย", en: "Take breaks, cool down your body temperature" },
    { th: "ใช้กับคนที่ไว้ใจ ในที่ปลอดภัย", en: "Use with trusted people in a safe space" },
    { th: "วางแผนเวลาพัก ตั้งนาฬิกาเตือน", en: "Plan rest time, set alarms as reminders" },
  ],
  emergencySigns: [
    { th: "เจ็บหน้าอก หายใจลำบาก", en: "Chest pain, difficulty breathing" },
    { th: "ชัก หมดสติ ตัวร้อนมาก", en: "Seizures, loss of consciousness, extreme heat" },
    { th: "เห็นภาพหลอน หวาดกลัวรุนแรง", en: "Hallucinations, extreme fear/paranoia" },
  ],
  aftercare: [
    { th: "พักผ่อนอย่างน้อย 8 ชม.", en: "Rest for at least 8 hours" },
    { th: "กินอาหารที่มีประโยชน์ ดื่มน้ำเยอะ", en: "Eat nutritious food, drink plenty of water" },
    { th: "หลีกเลี่ยงคาเฟอีนและสารกระตุ้น", en: "Avoid caffeine and stimulants" },
    { th: "พูดคุยกับคนที่ไว้ใจ หากรู้สึกไม่ดี", en: "Talk to someone you trust if you feel unwell" },
  ],
};

/* ── Risk gradient map ──────────────────────────────────────── */

const RISK_GRADIENTS: Record<string, string> = {
  high: "linear-gradient(135deg, hsl(340 60% 45%), hsl(270 50% 40%))",
  medium: "linear-gradient(135deg, hsl(30 80% 50%), hsl(45 90% 55%))",
  low: "linear-gradient(135deg, hsl(150 50% 40%), hsl(170 60% 45%))",
};

const RISK_LABELS: Record<string, { th: string; en: string }> = {
  high: { th: "ความเสี่ยงสูง", en: "High Risk" },
  medium: { th: "ความเสี่ยงปานกลาง", en: "Medium Risk" },
  low: { th: "ความเสี่ยงต่ำ", en: "Lower Risk" },
};

/* ── Component ──────────────────────────────────────────────── */

interface Props {
  onBack?: () => void;
}

export function SubstanceFactsheet({ onBack }: Props) {
  const { language } = useLanguage();
  const isEn = language === "en";
  const factsheetRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const data = METH_DATA;

  const handleDownload = useCallback(async () => {
    if (!factsheetRef.current) return;
    setDownloading(true);
    try {
      const htmlToImage = await import("html-to-image");
      // Run toPng twice — first call warms up fonts/images for reliable render
      await htmlToImage.toPng(factsheetRef.current, { quality: 0.95, pixelRatio: 2, backgroundColor: "#ffffff" });
      const dataUrl = await htmlToImage.toPng(factsheetRef.current, {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        cacheBust: true,
      });
      const link = document.createElement("a");
      link.download = `testd-factsheet-${data.nameEn.toLowerCase().replace(/\s+/g, "-")}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Download failed:", err);
      const { toast } = await import("sonner");
      toast.error(isEn ? "Download failed. Please try again." : "ดาวน์โหลดไม่สำเร็จ กรุณาลองอีกครั้ง");
    } finally {
      setDownloading(false);
    }
  }, [data.nameEn, isEn]);

  const handleShare = useCallback(async () => {
    if (!factsheetRef.current) return;
    try {
      const htmlToImage = await import("html-to-image");
      await htmlToImage.toPng(factsheetRef.current, { quality: 0.95, pixelRatio: 2, backgroundColor: "#ffffff" });
      const dataUrl = await htmlToImage.toPng(factsheetRef.current, {
        quality: 0.95, pixelRatio: 2, backgroundColor: "#ffffff", cacheBust: true,
      });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], "testd-factsheet.png", { type: "image/png" });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `${data.nameEn} — Harm Reduction Factsheet`,
          text: isEn ? "Learn how to stay safer. From testD × SWING." : "เรียนรู้วิธีลดอันตราย จาก testD × SWING",
          files: [file],
        });
      } else if (navigator.share) {
        await navigator.share({
          title: `${data.nameEn} — Harm Reduction Factsheet`,
          text: isEn ? "Learn how to stay safer. From testD × SWING." : "เรียนรู้วิธีลดอันตราย จาก testD × SWING",
          url: window.location.href,
        });
      } else {
        // Fallback to download
        const link = document.createElement("a");
        link.download = "testd-factsheet.png";
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch {
      /* user cancelled or unsupported */
    }
  }, [data.nameEn, isEn]);

  return (
    <div className="space-y-3">
      {/* ── Action bar ── */}
      <div className="flex items-center justify-between">
        {onBack && (
          <Button variant="ghost" size="sm" className="text-muted-foreground -ml-2" onClick={onBack}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            {isEn ? "Back" : "กลับ"}
          </Button>
        )}
        <div className="flex gap-2 ml-auto">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full text-xs gap-1.5 border-border/50"
            onClick={handleShare}
          >
            <Share2 className="h-3.5 w-3.5" />
            {isEn ? "Share" : "แชร์"}
          </Button>
          <Button
            size="sm"
            className="rounded-full text-xs gap-1.5"
            style={{ background: "hsl(var(--primary))" }}
            onClick={handleDownload}
            disabled={downloading}
          >
            <Download className="h-3.5 w-3.5" />
            {downloading ? (isEn ? "Saving…" : "กำลังบันทึก…") : (isEn ? "Download" : "ดาวน์โหลด")}
          </Button>
        </div>
      </div>

      {/* ── Factsheet card ── */}
      <div
        ref={factsheetRef}
        className="rounded-2xl overflow-hidden"
        style={{
          background: "hsl(var(--card))",
          border: "1px solid hsl(var(--border))",
          boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
        }}
      >
        {/* ── 1. Header (Hero) ── */}
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
              <span
                className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
                style={{ background: "rgba(255,255,255,.2)", color: "#fff", backdropFilter: "blur(4px)" }}
              >
                {isEn ? data.categoryEn : data.categoryTh}
              </span>
              <span
                className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
                style={{ background: "rgba(255,255,255,.25)", color: "#fff" }}
              >
                {isEn ? RISK_LABELS[data.riskLevel].en : RISK_LABELS[data.riskLevel].th}
              </span>
            </div>
          </div>
        </div>

        {/* ── 2. Quick info ── */}
        <div className="px-5 py-4 border-b" style={{ borderColor: "hsl(var(--border))" }}>
          <p className="text-sm text-foreground/80 leading-relaxed mb-3">
            {isEn ? data.descEn : data.descTh}
          </p>
          <div className="flex gap-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5 text-primary" />
              <span className="font-medium">{data.duration}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Zap className="h-3.5 w-3.5 text-primary" />
              <span className="font-medium">{isEn ? data.keyEffect.en : data.keyEffect.th}</span>
            </div>
          </div>
        </div>

        {/* ── 3. Risks ── */}
        <div className="px-5 py-4 border-b" style={{ borderColor: "hsl(var(--border))" }}>
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            {isEn ? "Potential Risks" : "ความเสี่ยงที่อาจเกิดขึ้น"}
          </h3>
          <div className="space-y-2">
            {data.risks.map((r, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="mt-0.5 flex-shrink-0 text-amber-500/70">{r.icon}</div>
                <p className="text-xs text-foreground/75 leading-relaxed">{isEn ? r.en : r.th}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── 4. Harm Reduction (highlighted) ── */}
        <div
          className="px-5 py-4 border-b"
          style={{
            background: "hsl(150 40% 96%)",
            borderColor: "hsl(var(--border))",
          }}
        >
          <h3 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5" style={{ color: "hsl(150 50% 30%)" }}>
            <Shield className="h-3.5 w-3.5" style={{ color: "hsl(150 60% 40%)" }} />
            {isEn ? "Harm Reduction Tips" : "คำแนะนำลดอันตราย"}
          </h3>
          <div className="space-y-2">
            {data.harmReduction.map((tip, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" style={{ color: "hsl(150 60% 40%)" }} />
                <p className="text-xs leading-relaxed" style={{ color: "hsl(150 30% 25%)" }}>
                  {isEn ? tip.en : tip.th}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── 5. Emergency Signs ── */}
        <div
          className="px-5 py-4 border-b"
          style={{
            background: "hsl(0 60% 97%)",
            borderColor: "hsl(var(--border))",
          }}
        >
          <h3 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5" style={{ color: "hsl(0 60% 40%)" }}>
            <Phone className="h-3.5 w-3.5" style={{ color: "hsl(0 60% 50%)" }} />
            {isEn ? "Seek Help Immediately If…" : "ขอความช่วยเหลือทันทีหาก…"}
          </h3>
          <div className="space-y-2">
            {data.emergencySigns.map((sign, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" style={{ color: "hsl(0 60% 50%)" }} />
                <p className="text-xs font-medium leading-relaxed" style={{ color: "hsl(0 50% 35%)" }}>
                  {isEn ? sign.en : sign.th}
                </p>
              </div>
            ))}
          </div>
          <div
            className="mt-3 rounded-xl px-3 py-2 text-center"
            style={{ background: "hsl(0 60% 93%)" }}
          >
            <p className="text-xs font-bold" style={{ color: "hsl(0 60% 40%)" }}>
              📞 {isEn ? "Emergency: 1323 or 1669" : "ฉุกเฉิน: 1323 หรือ 1669"}
            </p>
          </div>
        </div>

        {/* ── 6. Aftercare ── */}
        <div className="px-5 py-4 border-b" style={{ borderColor: "hsl(var(--border))" }}>
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
            <Heart className="h-3.5 w-3.5 text-pink-400" />
            {isEn ? "Aftercare & Recovery" : "การดูแลหลังใช้"}
          </h3>
          <div className="space-y-2">
            {data.aftercare.map((tip, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <Heart className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-pink-300" />
                <p className="text-xs text-foreground/70 leading-relaxed">{isEn ? tip.en : tip.th}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── 7. Footer ── */}
        <div className="px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <img src={testdLogo} alt="testD" className="h-5 w-auto" />
              <span className="text-[10px] text-muted-foreground font-medium">×</span>
              <img src={swingLogo} alt="SWING" className="h-5 w-auto" />
            </div>
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center"
              style={{
                background: "hsl(var(--muted))",
                border: "1px solid hsl(var(--border))",
              }}
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
    </div>
  );
}
