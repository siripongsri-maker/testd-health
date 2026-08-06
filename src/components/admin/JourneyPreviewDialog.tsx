import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Download, Loader2, RefreshCw, AlertTriangle, Check } from "lucide-react";
import { fetchJourneyLiveStats, journeyVersionLabel, type JourneyLiveStats } from "@/lib/journeyPdfRebuild";

export interface JourneyPreviewDoc {
  id: string;
  file: string;
  pngDir: string;
  pages: number;
  name: string;
  nameTh: string;
  description: string;
  descriptionTh: string;
}

const pngPath = (dir: string, page: number) => `${dir}/page-${String(page).padStart(2, "0")}.png`;

interface Props {
  doc: JourneyPreviewDoc | null;
  isTh: boolean;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDownload: (doc: JourneyPreviewDoc) => void;
  downloading: boolean;
  progressLabel?: string | null;
}

export function JourneyPreviewDialog({ doc, isTh, open, onOpenChange, onDownload, downloading, progressLabel }: Props) {
  const [page, setPage] = useState(1);
  const [stats, setStats] = useState<JourneyLiveStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [missing, setMissing] = useState<number[]>([]);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!open || !doc) return;
    setPage(1);
    setLoadingStats(true);
    fetchJourneyLiveStats()
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoadingStats(false));

    let cancelled = false;
    setChecking(true);
    (async () => {
      const results = await Promise.all(
        Array.from({ length: doc.pages }, (_, i) => i + 1).map(async p => {
          try {
            const res = await fetch(`${pngPath(doc.pngDir, p)}?t=${Date.now()}`, { method: "HEAD", cache: "no-store" });
            return res.ok ? null : p;
          } catch {
            return p;
          }
        })
      );
      if (!cancelled) {
        setMissing(results.filter((v): v is number => v !== null));
        setChecking(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, doc?.id]);

  if (!doc) return null;

  const src = `${pngPath(doc.pngDir, page)}?t=${open ? "preview" : ""}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">
            {isTh ? `ตัวอย่าง: ${doc.nameTh}` : `Preview: ${doc.name}`}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {isTh ? doc.descriptionTh : doc.description}
          </DialogDescription>
        </DialogHeader>

        {/* Completeness check */}
        <div className="flex flex-wrap items-center gap-2">
          {checking ? (
            <Badge variant="secondary" className="gap-1 text-[11px]">
              <Loader2 className="h-3 w-3 animate-spin" />
              {isTh ? "กำลังตรวจความครบถ้วน…" : "Checking completeness…"}
            </Badge>
          ) : missing.length === 0 ? (
            <Badge className="gap-1 text-[11px]">
              <Check className="h-3 w-3" />
              {isTh ? `ข้อมูลครบ ${doc.pages} หน้า` : `All ${doc.pages} pages present`}
            </Badge>
          ) : (
            <Badge variant="destructive" className="gap-1 text-[11px]">
              <AlertTriangle className="h-3 w-3" />
              {isTh ? `ขาด ${missing.length} หน้า: ` : `${missing.length} missing pages: `}
              {missing.join(", ")}
            </Badge>
          )}
          {stats && (
            <Badge variant="outline" className="text-[11px]">
              {isTh ? "เวอร์ชันที่จะสร้าง" : "Version to generate"} · {journeyVersionLabel(stats.generatedAt)}
            </Badge>
          )}
        </div>

        {/* Live data snapshot */}
        <div className="rounded-xl border border-border/50 p-3">
          <p className="text-xs font-semibold text-foreground mb-2">
            {isTh ? "ข้อมูลล่าสุดที่จะใส่ในหน้าปก" : "Live data that will appear on the cover"}
          </p>
          {loadingStats ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              {isTh ? "กำลังดึงข้อมูล…" : "Fetching…"}
            </div>
          ) : stats ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {stats.rows.map(r => (
                <div key={r.label} className="rounded-lg bg-muted/40 px-2 py-1.5">
                  <p className="text-[11px] text-muted-foreground">{isTh ? r.labelTh : r.label}</p>
                  <p className="text-sm font-semibold text-foreground">{r.value}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">{isTh ? "ดึงข้อมูลไม่สำเร็จ" : "Could not fetch data"}</p>
          )}
        </div>

        {/* Page viewer */}
        <div className="rounded-xl border border-border/50 overflow-hidden bg-muted/20">
          <img
            key={page}
            src={src}
            alt={`${isTh ? doc.nameTh : doc.name} — ${isTh ? "หน้า" : "page"} ${page}`}
            className="w-full max-h-[55vh] object-contain bg-background"
          />
          <div className="flex items-center justify-between gap-2 p-2 border-t border-border/50">
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-3 w-3" />
              {isTh ? "ก่อนหน้า" : "Prev"}
            </Button>
            <span className="text-xs text-muted-foreground">
              {isTh ? "หน้า" : "Page"} {page} / {doc.pages}
            </span>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" disabled={page >= doc.pages} onClick={() => setPage(p => p + 1)}>
              {isTh ? "ถัดไป" : "Next"}
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 justify-end">
          <Button asChild variant="outline" size="sm" className="h-8 text-xs gap-1">
            <a href={doc.file} download target="_blank" rel="noopener noreferrer">
              <Download className="h-3 w-3" />
              {isTh ? "ดาวน์โหลดไฟล์เดิม" : "Download published PDF"}
            </a>
          </Button>
          <Button size="sm" className="h-8 text-xs gap-1" disabled={downloading} onClick={() => onDownload(doc)}>
            {downloading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            {downloading
              ? progressLabel || (isTh ? "กำลังสร้าง…" : "Generating…")
              : (isTh ? "สร้าง PDF ใหม่แล้วดาวน์โหลด" : "Generate fresh PDF & download")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
