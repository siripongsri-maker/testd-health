import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Upload, FileText, Download } from "lucide-react";

const VALID_DECISIONS = ["pending", "keep", "disavow_domain", "disavow_url"];

const DECISION_ALIASES: Record<string, string> = {
  "เก็บไว้": "keep",
  "ปฏิเสธทั้งโดเมน": "disavow_domain",
  "ปฏิเสธเฉพาะ url": "disavow_url",
  "รอตรวจ": "pending",
  keep: "keep",
  disavow: "disavow_domain",
  domain: "disavow_domain",
  url: "disavow_url",
};

export interface ParsedCandidate {
  source_domain: string;
  example_url: string | null;
  anchor_sample: string | null;
  authority_score: number | null;
  backlinks_count: number | null;
  spam_signals: string[];
  decision: string;
  notes: string | null;
  duplicate: boolean;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQuotes = false;
      } else cur += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((v) => v.trim());
}

function normalizeDomain(v: string) {
  return v
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/.*$/, "")
    .toLowerCase();
}

function toNumber(v: string | undefined): number | null {
  if (!v) return null;
  const n = Number(v.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function parseCandidateCsv(text: string, existingDomains: string[]): ParsedCandidate[] {
  const existing = new Set(existingDomains.map((d) => d.toLowerCase()));
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);
  if (!lines.length) return [];

  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const hasHeader = header.some((h) =>
    ["domain", "source_domain", "source url", "source_url", "โดเมน", "page_ascore"].includes(h),
  );
  const idx = (...names: string[]) => {
    for (const n of names) {
      const i = header.indexOf(n);
      if (i >= 0) return i;
    }
    return -1;
  };
  const cols = hasHeader
    ? {
        domain: idx("domain", "source_domain", "source url", "source_url", "โดเมน", "referring domain"),
        url: idx("example_url", "url", "source page", "source_page_url", "target url"),
        anchor: idx("anchor", "anchor_sample", "anchor text", "ข้อความลิงก์"),
        authority: idx("authority", "authority_score", "page_ascore", "as", "domain score"),
        backlinks: idx("backlinks", "backlinks_count", "links", "จำนวนลิงก์"),
        signals: idx("spam_signals", "signals", "สัญญาณ"),
        decision: idx("decision", "สถานะ", "action"),
        notes: idx("notes", "note", "บันทึก"),
      }
    : {
        domain: 0,
        url: 1,
        anchor: 2,
        authority: 3,
        backlinks: 4,
        signals: 5,
        decision: 6,
        notes: 7,
      };

  const rows = hasHeader ? lines.slice(1) : lines;
  const seen = new Set<string>();
  const out: ParsedCandidate[] = [];

  for (const line of rows) {
    const cells = splitCsvLine(line);
    const rawUrl = (cols.url >= 0 ? cells[cols.url] : "") ?? "";
    const rawDomain = (cols.domain >= 0 ? cells[cols.domain] : "") ?? "";
    const domain = normalizeDomain(rawDomain || rawUrl);
    if (!domain || !domain.includes(".")) continue;
    if (seen.has(domain)) continue;
    seen.add(domain);

    const rawDecision = ((cols.decision >= 0 ? cells[cols.decision] : "") ?? "").trim();
    const lowered = rawDecision.toLowerCase();
    const decision =
      VALID_DECISIONS.find((d) => d === lowered) ?? DECISION_ALIASES[lowered] ?? "pending";

    const rawSignals = (cols.signals >= 0 ? cells[cols.signals] : "") ?? "";
    const signals = rawSignals
      .split(/[;|]/)
      .map((s) => s.trim())
      .filter(Boolean);

    const authority = toNumber(cols.authority >= 0 ? cells[cols.authority] : undefined);
    const backlinks = toNumber(cols.backlinks >= 0 ? cells[cols.backlinks] : undefined);

    out.push({
      source_domain: domain,
      example_url: rawUrl.trim().startsWith("http") ? rawUrl.trim() : null,
      anchor_sample: ((cols.anchor >= 0 ? cells[cols.anchor] : "") ?? "").trim() || null,
      authority_score:
        authority === null ? null : Math.max(0, Math.min(100, Math.round(authority))),
      backlinks_count: backlinks === null ? null : Math.max(0, Math.round(backlinks)),
      spam_signals: signals,
      decision: decision === "disavow_url" && !rawUrl.trim().startsWith("http") ? "pending" : decision,
      notes: ((cols.notes >= 0 ? cells[cols.notes] : "") ?? "").trim() || null,
      duplicate: existing.has(domain),
    });
  }
  return out;
}

const TEMPLATE = `domain,example_url,anchor,authority,backlinks,spam_signals,decision,notes
spam-example.com,https://spam-example.com/page,"ซื้อ backlink",4,120,pbn_anchor;low_authority,pending,"พบจากรายงาน Semrush"
`;

export default function DisavowCsvImportDialog({
  open,
  onOpenChange,
  existingDomains,
  onImported,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  existingDomains: string[];
  onImported: () => void;
}) {
  const [text, setText] = useState("");
  const [importing, setImporting] = useState(false);

  const parsed = useMemo(
    () => (text.trim() ? parseCandidateCsv(text, existingDomains) : []),
    [text, existingDomains],
  );
  const fresh = parsed.filter((p) => !p.duplicate);
  const dupes = parsed.length - fresh.length;

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setText(await file.text());
  };

  const downloadTemplate = () => {
    const blob = new Blob(["\uFEFF" + TEMPLATE], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "disavow-candidates-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const runImport = async () => {
    if (!fresh.length) {
      toast.error("ไม่มีโดเมนใหม่ให้นำเข้า");
      return;
    }
    setImporting(true);
    const { error } = await supabase.from("seo_disavow_candidates").insert(
      fresh.map((p) => ({
        source_domain: p.source_domain,
        example_url: p.example_url,
        anchor_sample: p.anchor_sample,
        authority_score: p.authority_score,
        backlinks_count: p.backlinks_count,
        spam_signals: p.spam_signals,
        decision: p.decision,
        notes: p.notes,
      })),
    );
    setImporting(false);
    if (error) {
      toast.error("นำเข้าไม่สำเร็จ: " + error.message);
      return;
    }
    toast.success(`นำเข้า ${fresh.length} โดเมนแล้ว`);
    setText("");
    onOpenChange(false);
    onImported();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>นำเข้าลิงก์ต้องสงสัยจาก CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-[12px] text-muted-foreground">
            รองรับไฟล์ส่งออกจาก Semrush/Search Console — คอลัมน์ที่อ่านได้:{" "}
            <code>domain / source_url, example_url, anchor, authority (page_ascore), backlinks, spam_signals, decision, notes</code>{" "}
            (สัญญาณสแปมหลายค่าให้คั่นด้วย <code>;</code>)
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <input
              id="disavow-csv-file"
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => document.getElementById("disavow-csv-file")?.click()}
            >
              <FileText className="h-4 w-4 mr-1.5" />
              เลือกไฟล์ CSV
            </Button>
            <Button variant="ghost" size="sm" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-1.5" />
              ดาวน์โหลดเทมเพลต
            </Button>
          </div>

          <Textarea
            aria-label="ข้อมูล CSV ลิงก์ต้องสงสัย"
            placeholder={"domain,example_url,anchor,authority,backlinks,spam_signals,decision"}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-[140px] text-xs font-mono"
          />

          {parsed.length > 0 && (
            <div className="rounded-lg border p-3 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-emerald-500/15 text-emerald-600 border-0 text-[11px]">
                  พร้อมนำเข้า {fresh.length}
                </Badge>
                {dupes > 0 && (
                  <Badge className="bg-amber-500/15 text-amber-600 border-0 text-[11px]">
                    ซ้ำกับที่มีอยู่ {dupes} (จะข้าม)
                  </Badge>
                )}
              </div>
              <div className="max-h-52 overflow-auto">
                <table className="w-full text-[12px]">
                  <thead className="text-muted-foreground">
                    <tr className="text-left">
                      <th className="py-1 pr-2">โดเมน</th>
                      <th className="py-1 pr-2">AS</th>
                      <th className="py-1 pr-2">ลิงก์</th>
                      <th className="py-1 pr-2">สถานะ</th>
                      <th className="py-1">สัญญาณ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.map((p) => (
                      <tr
                        key={p.source_domain}
                        className={`border-t ${p.duplicate ? "opacity-50" : ""}`}
                      >
                        <td className="py-1 pr-2 font-medium">{p.source_domain}</td>
                        <td className="py-1 pr-2">{p.authority_score ?? "—"}</td>
                        <td className="py-1 pr-2">{p.backlinks_count ?? "—"}</td>
                        <td className="py-1 pr-2">{p.decision}</td>
                        <td className="py-1 truncate max-w-[180px]">
                          {p.spam_signals.join(", ") || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            ยกเลิก
          </Button>
          <Button onClick={runImport} disabled={importing || !fresh.length}>
            {importing ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-1.5" />
            )}
            นำเข้า {fresh.length} โดเมน
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
