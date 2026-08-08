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

const VALID_STATUSES = ["not_started", "in_progress", "replied", "linked", "declined"];

const STATUS_ALIASES: Record<string, string> = {
  "ยังไม่เริ่ม": "not_started",
  "กำลังติดต่อ": "in_progress",
  "ตอบกลับแล้ว": "replied",
  "ได้ลิงก์แล้ว": "linked",
  "ปฏิเสธ": "declined",
};

export interface ParsedProspect {
  domain: string;
  authority_score: number | null;
  rationale: string | null;
  status: string;
  contact_url: string;
  duplicate: boolean;
}

/** Minimal RFC4180-ish CSV line splitter (handles quotes and embedded commas). */
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

export function parseProspectCsv(text: string, existingDomains: string[]): ParsedProspect[] {
  const existing = new Set(existingDomains.map((d) => d.toLowerCase()));
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);
  if (!lines.length) return [];

  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const hasHeader = header.some((h) => ["domain", "โดเมน", "website", "url"].includes(h));
  const idx = (...names: string[]) => {
    for (const n of names) {
      const i = header.indexOf(n);
      if (i >= 0) return i;
    }
    return -1;
  };
  const cols = hasHeader
    ? {
        domain: idx("domain", "โดเมน", "website", "url"),
        authority: idx("authority", "authority_score", "as", "คะแนน"),
        rationale: idx("rationale", "reason", "เหตุผล"),
        status: idx("status", "สถานะ"),
        contact: idx("contact_url", "contact", "ติดต่อ"),
      }
    : { domain: 0, authority: 1, rationale: 2, status: 3, contact: 4 };

  const rows = hasHeader ? lines.slice(1) : lines;
  const seen = new Set<string>();
  const out: ParsedProspect[] = [];

  for (const line of rows) {
    const cells = splitCsvLine(line);
    const domain = normalizeDomain(cells[cols.domain] ?? "");
    if (!domain || !domain.includes(".")) continue;
    if (seen.has(domain)) continue;
    seen.add(domain);

    const rawAuthority = cols.authority >= 0 ? cells[cols.authority] : "";
    const authority = rawAuthority && !Number.isNaN(Number(rawAuthority)) ? Number(rawAuthority) : null;
    const rawStatus = (cols.status >= 0 ? cells[cols.status] : "") ?? "";
    const status =
      VALID_STATUSES.find((s) => s === rawStatus.toLowerCase()) ??
      STATUS_ALIASES[rawStatus.trim()] ??
      "not_started";
    const contact = (cols.contact >= 0 ? cells[cols.contact] : "") || `https://${domain}`;

    out.push({
      domain,
      authority_score:
        authority === null ? null : Math.max(0, Math.min(100, Math.round(authority))),
      rationale: (cols.rationale >= 0 ? cells[cols.rationale] : "")?.trim() || null,
      status,
      contact_url: contact,
      duplicate: existing.has(domain),
    });
  }
  return out;
}

const TEMPLATE = `domain,authority,rationale,status
example.org,32,"เว็บสุขภาพทางเพศที่ลิงก์หาองค์กรใกล้เคียง",not_started
`;

export default function ProspectCsvImportDialog({
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
    () => (text.trim() ? parseProspectCsv(text, existingDomains) : []),
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
    a.download = "link-prospects-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const runImport = async () => {
    if (!fresh.length) {
      toast.error("ไม่มีโดเมนใหม่ให้นำเข้า");
      return;
    }
    setImporting(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("seo_link_prospects").insert(
      fresh.map((p) => ({
        domain: p.domain,
        authority_score: p.authority_score,
        rationale: p.rationale,
        status: p.status,
        contact_url: p.contact_url,
        updated_by: userData.user?.id ?? null,
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
          <DialogTitle>นำเข้าโดเมนเป้าหมายจาก CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-[12px] text-muted-foreground">
            คอลัมน์ที่รองรับ: <code>domain, authority, rationale, status</code> — สถานะใช้ได้ทั้ง
            not_started / in_progress / replied / linked / declined หรือชื่อภาษาไทย
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <input
              id="prospect-csv-file"
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => document.getElementById("prospect-csv-file")?.click()}
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
            aria-label="ข้อมูล CSV"
            placeholder={"domain,authority,rationale,status\nexample.org,32,เหตุผล,not_started"}
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
                      <th className="py-1 pr-2">Authority</th>
                      <th className="py-1 pr-2">สถานะ</th>
                      <th className="py-1">เหตุผล</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.map((p) => (
                      <tr
                        key={p.domain}
                        className={`border-t ${p.duplicate ? "opacity-50" : ""}`}
                      >
                        <td className="py-1 pr-2 font-medium">{p.domain}</td>
                        <td className="py-1 pr-2">{p.authority_score ?? "—"}</td>
                        <td className="py-1 pr-2">{p.status}</td>
                        <td className="py-1 truncate max-w-[220px]">{p.rationale ?? "—"}</td>
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
