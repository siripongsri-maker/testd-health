import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Mail, Copy, Download, Sparkles, ExternalLink } from "lucide-react";

export interface OutreachProspect {
  id: string;
  domain: string;
  authority_score: number | null;
  contact_url: string | null;
}

interface DraftEmail {
  prospect_id: string;
  domain: string;
  contact_url: string;
  subject: string;
  body: string;
}

function slugify(domain: string) {
  return domain.replace(/[^a-z0-9.-]/gi, "-").toLowerCase();
}

/** Build an RFC 5322 .eml draft (UTF-8, base64 body so Thai renders correctly). */
function buildEml(draft: DraftEmail) {
  const b64 = btoa(String.fromCharCode(...new TextEncoder().encode(draft.body)));
  const subjectEncoded = `=?UTF-8?B?${btoa(
    String.fromCharCode(...new TextEncoder().encode(draft.subject)),
  )}?=`;
  return [
    "MIME-Version: 1.0",
    `X-Unsent: 1`,
    `To: `,
    `Subject: ${subjectEncoded}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    b64.replace(/(.{76})/g, "$1\r\n"),
  ].join("\r\n");
}

function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function OutreachEmailDialog({
  open,
  onOpenChange,
  prospects,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  prospects: OutreachProspect[];
}) {
  const [language, setLanguage] = useState<"th" | "en">("th");
  const [senderName, setSenderName] = useState("ทีมงาน testD (SWING Thailand)");
  const [loading, setLoading] = useState(false);
  const [drafts, setDrafts] = useState<DraftEmail[]>([]);

  const top5 = prospects.slice(0, 5);

  const generate = async () => {
    if (!top5.length) {
      toast.error("ยังไม่มีโดเมนเป้าหมาย");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("generate-outreach-emails", {
      body: {
        prospectIds: top5.map((p) => p.id),
        language,
        senderName: senderName.trim() || "ทีมงาน testD",
      },
    });
    setLoading(false);
    if (error) {
      let details = error.message;
      try {
        const ctx = (error as unknown as { context?: { text?: () => Promise<string> } }).context;
        if (ctx?.text) details = await ctx.text();
      } catch {
        /* ignore */
      }
      console.error("generate-outreach-emails failed:", details);
      toast.error("สร้างอีเมลไม่สำเร็จ: " + details);
      return;
    }
    if (data?.error) {
      toast.error(data.error);
      return;
    }
    setDrafts((data?.emails ?? []) as DraftEmail[]);
    toast.success(`ร่างอีเมลแล้ว ${data?.emails?.length ?? 0} ฉบับ`);
  };

  const updateDraft = (id: string, patch: Partial<DraftEmail>) =>
    setDrafts((prev) => prev.map((d) => (d.prospect_id === id ? { ...d, ...patch } : d)));

  const copyDraft = async (d: DraftEmail) => {
    await navigator.clipboard.writeText(`${d.subject}\n\n${d.body}`);
    toast.success(`คัดลอกอีเมลถึง ${d.domain} แล้ว`);
  };

  const exportOne = (d: DraftEmail) =>
    downloadBlob(buildEml(d), `outreach-${slugify(d.domain)}.eml`, "message/rfc822");

  const exportAllEml = () => {
    drafts.forEach((d, i) => setTimeout(() => exportOne(d), i * 250));
    toast.success(`กำลังดาวน์โหลด ${drafts.length} ไฟล์ .eml`);
  };

  const exportCsv = () => {
    const lines = [
      ["domain", "contact_url", "subject", "body"].join(","),
      ...drafts.map((d) =>
        [d.domain, d.contact_url, d.subject, d.body]
          .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
          .join(","),
      ),
    ];
    downloadBlob(
      "\uFEFF" + lines.join("\n"),
      `outreach-drafts-${new Date().toISOString().slice(0, 10)}.csv`,
      "text/csv;charset=utf-8;",
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            ร่างอีเมลติดต่อขอลิงก์ (5 อันดับแรก)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <Select value={language} onValueChange={(v) => setLanguage(v as "th" | "en")}>
              <SelectTrigger className="h-9 w-[130px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="th" className="text-xs">ภาษาไทย</SelectItem>
                <SelectItem value="en" className="text-xs">English</SelectItem>
              </SelectContent>
            </Select>
            <Input
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="ชื่อผู้ส่ง"
              className="h-9 text-xs flex-1 min-w-[180px]"
              aria-label="ชื่อผู้ส่ง"
            />
            <Button size="sm" onClick={generate} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-1.5" />
              )}
              {drafts.length ? "สร้างใหม่" : "สร้างอีเมล"}
            </Button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {top5.map((p) => (
              <Badge key={p.id} variant="outline" className="text-[11px]">
                {p.domain} · {p.authority_score ?? "—"}
              </Badge>
            ))}
          </div>

          {loading && !drafts.length && (
            <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-xs">กำลังเขียนอีเมลเฉพาะแต่ละเว็บ…</span>
            </div>
          )}

          {drafts.map((d) => (
            <div key={d.prospect_id} className="rounded-2xl border p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-medium text-sm flex items-center gap-1.5">
                  {d.domain}
                  <a
                    href={d.contact_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`เปิด ${d.domain}`}
                    className="text-muted-foreground hover:text-primary"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
                <div className="flex gap-1.5">
                  <Button variant="outline" size="sm" onClick={() => copyDraft(d)}>
                    <Copy className="h-3.5 w-3.5 mr-1" />
                    คัดลอก
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => exportOne(d)}>
                    <Download className="h-3.5 w-3.5 mr-1" />
                    .eml
                  </Button>
                </div>
              </div>
              <Input
                value={d.subject}
                onChange={(e) => updateDraft(d.prospect_id, { subject: e.target.value })}
                className="text-[13px] font-medium"
                aria-label={`หัวข้ออีเมลถึง ${d.domain}`}
              />
              <Textarea
                value={d.body}
                onChange={(e) => updateDraft(d.prospect_id, { body: e.target.value })}
                className="text-[13px] min-h-[170px] leading-relaxed"
                aria-label={`เนื้อหาอีเมลถึง ${d.domain}`}
              />
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            ปิด
          </Button>
          <Button variant="outline" onClick={exportCsv} disabled={!drafts.length}>
            <Download className="h-4 w-4 mr-1.5" />
            CSV
          </Button>
          <Button onClick={exportAllEml} disabled={!drafts.length}>
            <Download className="h-4 w-4 mr-1.5" />
            ดาวน์โหลดร่างทั้งหมด (.eml)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
