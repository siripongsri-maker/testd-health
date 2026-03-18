import { useState, useRef, useCallback } from "react";
import { trackEvent } from "@/hooks/useAnalytics";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Download, Share2, X, Loader2, Check } from "lucide-react";
import { SUBSTANCES, type SubstanceData } from "@/data/substanceData";
import { FactsheetFullExport } from "./FactsheetFullExport";
import { FactsheetStoryExport } from "./FactsheetStoryExport";
import { FactsheetSquareExport } from "./FactsheetSquareExport";

type ExportLang = "th" | "en" | "bilingual";
type ExportFormat = "full" | "story" | "square";

interface Props {
  open: boolean;
  onClose: () => void;
  initialSubstance?: SubstanceData;
}

const FORMAT_OPTIONS: { value: ExportFormat; labelEn: string; labelTh: string; ratio: string }[] = [
  { value: "story", labelEn: "Story (9:16)", labelTh: "Story (9:16)", ratio: "IG / FB Story" },
  { value: "square", labelEn: "Square (1:1)", labelTh: "สี่เหลี่ยม (1:1)", ratio: "Feed / Post" },
  { value: "full", labelEn: "Full Factsheet", labelTh: "แผ่นข้อมูลเต็ม", ratio: "Mobile / Save" },
];

const LANG_OPTIONS: { value: ExportLang; label: string }[] = [
  { value: "th", label: "ไทย" },
  { value: "en", label: "English" },
  { value: "bilingual", label: "TH + EN" },
];

export function ExportModal({ open, onClose, initialSubstance }: Props) {
  const { language } = useLanguage();
  const isEn = language === "en";

  const [selectedSubstance, setSelectedSubstance] = useState<SubstanceData>(initialSubstance || SUBSTANCES[0]);
  const [exportLang, setExportLang] = useState<ExportLang>(language === "en" ? "en" : "th");
  const [exportFormat, setExportFormat] = useState<ExportFormat>("story");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const exportRef = useRef<HTMLDivElement>(null);

  const generateImage = useCallback(async () => {
    if (!exportRef.current) return null;
    const htmlToImage = await import("html-to-image");
    // Warm-up pass
    await htmlToImage.toPng(exportRef.current, { quality: 0.95, pixelRatio: 2, backgroundColor: "#ffffff" });
    return htmlToImage.toPng(exportRef.current, {
      quality: 0.95,
      pixelRatio: 2,
      backgroundColor: "#ffffff",
      cacheBust: true,
    });
  }, []);

  const handleDownload = useCallback(async () => {
    setLoading(true);
    setDone(false);
    try {
      const dataUrl = await generateImage();
      if (!dataUrl) throw new Error("No image");
      const link = document.createElement("a");
      link.download = `testd-${selectedSubstance.slug}-${exportFormat}-${exportLang}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setDone(true);
      trackEvent("factsheet_export", { substance: selectedSubstance.slug, format: exportFormat, lang: exportLang, method: "download" });
      setTimeout(() => setDone(false), 2000);
    } catch (err) {
      console.error("Export failed:", err);
      const { toast } = await import("sonner");
      toast.error(isEn ? "Export failed. Please try again." : "ส่งออกไม่สำเร็จ กรุณาลองอีกครั้ง");
    } finally {
      setLoading(false);
    }
  }, [generateImage, selectedSubstance, exportFormat, exportLang, isEn]);

  const handleShare = useCallback(async () => {
    setLoading(true);
    try {
      const dataUrl = await generateImage();
      if (!dataUrl) throw new Error("No image");
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `testd-${selectedSubstance.slug}.png`, { type: "image/png" });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `${selectedSubstance.nameEn} — Harm Reduction`,
          text: isEn ? "Learn how to stay safer." : "เรียนรู้วิธีลดอันตราย",
          files: [file],
        });
        trackEvent("factsheet_export", { substance: selectedSubstance.slug, format: exportFormat, lang: exportLang, method: "share" });
      } else {
        // Fallback to download
        handleDownload();
        return;
      }
    } catch {
      /* user cancelled */
    } finally {
      setLoading(false);
    }
  }, [generateImage, selectedSubstance, isEn, handleDownload]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: "rgba(0,0,0,.5)" }}>
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl"
        style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "hsl(var(--border))" }}>
          <h2 className="text-base font-bold text-foreground">
            {isEn ? "Export Factsheet" : "ส่งออกแผ่นข้อมูล"}
          </h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-muted transition-colors">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Substance selector */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
              {isEn ? "Substance" : "สาร"}
            </label>
            <div className="flex flex-wrap gap-2">
              {SUBSTANCES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSubstance(s)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    selectedSubstance.id === s.id
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  <span>{s.icon}</span>
                  <span>{isEn ? s.nameEn : s.nameTh}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Language selector */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
              {isEn ? "Export Language" : "ภาษาที่ส่งออก"}
            </label>
            <div className="flex gap-2">
              {LANG_OPTIONS.map((l) => (
                <button
                  key={l.value}
                  onClick={() => setExportLang(l.value)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                    exportLang === l.value
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {/* Format selector */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
              {isEn ? "Format" : "รูปแบบ"}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {FORMAT_OPTIONS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setExportFormat(f.value)}
                  className={`px-3 py-3 rounded-xl text-center transition-all ${
                    exportFormat === f.value
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  <p className="text-xs font-bold">{isEn ? f.labelEn : f.labelTh}</p>
                  <p className="text-[10px] mt-0.5 opacity-70">{f.ratio}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Preview thumbnail */}
          <div className="rounded-xl overflow-hidden border" style={{ borderColor: "hsl(var(--border))" }}>
            <div className="bg-muted/50 px-3 py-2">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                {isEn ? "Preview" : "ตัวอย่าง"}
              </p>
            </div>
            <div className="flex justify-center p-4 bg-muted/20">
              <div
                style={{
                  transform: exportFormat === "story" ? "scale(0.12)" : exportFormat === "square" ? "scale(0.2)" : "scale(0.45)",
                  transformOrigin: "top center",
                  height: exportFormat === "story" ? 230 : exportFormat === "square" ? 216 : 300,
                }}
              >
                {exportFormat === "story" && (
                  <FactsheetStoryExport ref={exportRef} substance={selectedSubstance} exportLang={exportLang} />
                )}
                {exportFormat === "square" && (
                  <FactsheetSquareExport ref={exportRef} substance={selectedSubstance} exportLang={exportLang} />
                )}
                {exportFormat === "full" && (
                  <FactsheetFullExport ref={exportRef} substance={selectedSubstance} exportLang={exportLang} />
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 rounded-xl gap-2"
              onClick={handleShare}
              disabled={loading}
            >
              <Share2 className="h-4 w-4" />
              {isEn ? "Share" : "แชร์"}
            </Button>
            <Button
              className="flex-1 rounded-xl gap-2"
              onClick={handleDownload}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : done ? (
                <Check className="h-4 w-4" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {loading
                ? (isEn ? "Generating…" : "กำลังสร้าง…")
                : done
                ? (isEn ? "Done!" : "สำเร็จ!")
                : (isEn ? "Download" : "ดาวน์โหลด")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
