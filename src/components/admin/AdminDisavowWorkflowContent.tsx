import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Loader2,
  RefreshCw,
  ShieldAlert,
  ExternalLink,
  Download,
  Check,
  X,
  Plus,
  Trash2,
  FileWarning,
  ArrowRight,
  History,
  Upload,
} from "lucide-react";
import DisavowRunHistory, { recordDisavowRun, type DisavowRunEntry } from "./DisavowRunHistory";
import DisavowCsvImportDialog from "./DisavowCsvImportDialog";

type Decision = "pending" | "keep" | "disavow_domain" | "disavow_url";

interface CandidateRow {
  id: string;
  source_domain: string;
  example_url: string | null;
  anchor_sample: string | null;
  authority_score: number | null;
  backlinks_count: number | null;
  spam_signals: string[];
  decision: Decision;
  notes: string | null;
  reviewed_at: string | null;
}

const SIGNAL_LABELS: Record<string, string> = {
  pbn_anchor: "แองเคอร์ขาย PBN",
  low_authority: "Authority ต่ำมาก",
  irrelevant_topic: "เนื้อหาไม่เกี่ยวข้อง",
  content_farm: "ฟาร์มคอนเทนต์",
  typosquat_domain: "โดเมนเลียนแบบ",
  spammy_tld: "TLD เสี่ยงสแปม",
  crypto_spam: "สแปมคริปโต",
  link_shortener_farm: "ฟาร์มลิงก์ย่อ",
  paid_link_service: "บริการซื้อลิงก์",
  automated_tool_spam: "สแปมจากเครื่องมืออัตโนมัติ",
  partner_organization: "องค์กรพันธมิตร",
  platform_link: "ลิงก์จากแพลตฟอร์ม",
};

const STEPS = [
  { n: 1, title: "รวบรวมลิงก์ต้องสงสัย", desc: "ตรวจรายชื่อโดเมนที่มีสัญญาณสแปม/PBN" },
  { n: 2, title: "ตัดสินทีละโดเมน", desc: "เลือก เก็บไว้ / ปฏิเสธทั้งโดเมน / ปฏิเสธเฉพาะ URL" },
  { n: 3, title: "ตรวจไฟล์ก่อนส่ง", desc: "ดูตัวอย่างไฟล์ disavow ที่จะได้" },
  { n: 4, title: "ส่งเข้า Google", desc: "อัปโหลดไฟล์ที่ Google Disavow Tool" },
  { n: 5, title: "ประวัติการสร้างไฟล์", desc: "ย้อนดูไฟล์เก่า โดเมนที่เลือก และเวลาที่สร้าง" },
];


function signalTone(signal: string) {
  if (signal === "partner_organization" || signal === "platform_link")
    return "bg-emerald-500/15 text-emerald-600";
  return "bg-destructive/10 text-destructive";
}

export default function AdminDisavowWorkflowContent() {
  const [rows, setRows] = useState<CandidateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newAnchor, setNewAnchor] = useState("");
  const [historyKey, setHistoryKey] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("seo_disavow_candidates")
      .select("*")
      .order("decision", { ascending: true })
      .order("backlinks_count", { ascending: false, nullsFirst: false });
    if (error) toast.error("โหลดข้อมูลไม่สำเร็จ: " + error.message);
    else setRows((data ?? []) as CandidateRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const patchRow = async (id: string, patch: Partial<CandidateRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    setSavingId(id);
    const uid = (await supabase.auth.getUser()).data.user?.id ?? null;
    const { error } = await supabase
      .from("seo_disavow_candidates")
      .update({ ...patch, reviewed_by: uid, reviewed_at: new Date().toISOString() })
      .eq("id", id);
    setSavingId(null);
    if (error) {
      toast.error("บันทึกไม่สำเร็จ: " + error.message);
      load();
    }
  };

  const addCandidate = async () => {
    const domain = newDomain
      .trim()
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "");
    if (!domain) {
      toast.error("กรุณาใส่โดเมน");
      return;
    }
    const { error } = await supabase.from("seo_disavow_candidates").insert({
      source_domain: domain,
      example_url: newUrl.trim() || null,
      anchor_sample: newAnchor.trim() || null,
      spam_signals: [],
    });
    if (error) {
      toast.error("เพิ่มไม่สำเร็จ: " + error.message);
      return;
    }
    toast.success("เพิ่มโดเมนแล้ว");
    setAddOpen(false);
    setNewDomain("");
    setNewUrl("");
    setNewAnchor("");
    load();
  };

  const removeCandidate = async (id: string, domain: string) => {
    const { error } = await supabase.from("seo_disavow_candidates").delete().eq("id", id);
    if (error) {
      toast.error("ลบไม่สำเร็จ: " + error.message);
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
    toast.success(`ลบ ${domain} แล้ว`);
  };

  const counts = useMemo(() => {
    const c = { pending: 0, keep: 0, disavow_domain: 0, disavow_url: 0 };
    for (const r of rows) c[r.decision] = (c[r.decision] ?? 0) + 1;
    return c;
  }, [rows]);

  const disavowFile = useMemo(() => {
    const domainRows = rows.filter((r) => r.decision === "disavow_domain");
    const urlRows = rows.filter((r) => r.decision === "disavow_url" && r.example_url);
    const lines: string[] = [
      "# Disavow file for testd.website",
      `# Generated ${new Date().toISOString().slice(0, 10)} by testD Console`,
      `# ${domainRows.length} domains, ${urlRows.length} URLs`,
      "",
    ];
    for (const r of domainRows) {
      if (r.spam_signals.length) {
        lines.push(`# ${r.spam_signals.map((s) => SIGNAL_LABELS[s] ?? s).join(", ")}`);
      }
      lines.push(`domain:${r.source_domain}`);
    }
    if (urlRows.length) {
      lines.push("", "# Individual URLs");
      for (const r of urlRows) lines.push(r.example_url!);
    }
    return lines.join("\n");
  }, [rows]);

  const disavowCount = counts.disavow_domain + counts.disavow_url;

  const runEntries: DisavowRunEntry[] = useMemo(
    () => [
      ...rows
        .filter((r) => r.decision === "disavow_domain")
        .map((r) => ({ type: "domain" as const, value: r.source_domain, signals: r.spam_signals })),
      ...rows
        .filter((r) => r.decision === "disavow_url" && r.example_url)
        .map((r) => ({ type: "url" as const, value: r.example_url! })),
    ],
    [rows],
  );

  const downloadFile = async () => {
    const fileName = `disavow-testd-website-${new Date().toISOString().slice(0, 10)}.txt`;
    const blob = new Blob([disavowFile], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success("ดาวน์โหลดไฟล์ disavow แล้ว");
    const ok = await recordDisavowRun({
      fileContent: disavowFile,
      fileName,
      entries: runEntries,
      domainCount: counts.disavow_domain,
      urlCount: counts.disavow_url,
    });
    if (ok) setHistoryKey((k) => k + 1);
  };


  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            ตรวจสอบลิงก์สแปม/PBN และสร้างไฟล์ Disavow
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            ทำตาม 4 ขั้นตอน แล้วดาวน์โหลดไฟล์ .txt เพื่ออัปโหลดที่ Google Disavow Tool
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            รีเฟรช
          </Button>
          <Button variant="outline" size="sm" onClick={() => setStep(5)}>
            <History className="h-4 w-4 mr-1.5" />
            ประวัติ
          </Button>
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-1.5" />
            นำเข้า CSV
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            เพิ่มโดเมน
          </Button>
        </div>
      </div>

      {/* Step rail */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
        {STEPS.map((s) => (
          <button
            key={s.n}
            onClick={() => setStep(s.n)}
            className={`rounded-2xl p-3 text-left transition border ${
              step === s.n
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border hover:bg-muted/50"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span
                className={`h-5 w-5 rounded-full text-[11px] font-bold grid place-items-center ${
                  step >= s.n ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {s.n}
              </span>
              <span className="text-[13px] font-semibold">{s.title}</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{s.desc}</p>
          </button>
        ))}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="rounded-2xl p-3 bg-muted">
          <div className="text-xl font-bold">{counts.pending}</div>
          <div className="text-[11px]">รอตรวจ</div>
        </div>
        <div className="rounded-2xl p-3 bg-emerald-500/15 text-emerald-600">
          <div className="text-xl font-bold">{counts.keep}</div>
          <div className="text-[11px]">เก็บไว้</div>
        </div>
        <div className="rounded-2xl p-3 bg-destructive/10 text-destructive">
          <div className="text-xl font-bold">{counts.disavow_domain}</div>
          <div className="text-[11px]">ปฏิเสธทั้งโดเมน</div>
        </div>
        <div className="rounded-2xl p-3 bg-amber-500/15 text-amber-600">
          <div className="text-xl font-bold">{counts.disavow_url}</div>
          <div className="text-[11px]">ปฏิเสธเฉพาะ URL</div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : step <= 2 ? (
        <div className="space-y-3">
          {step === 1 && (
            <Card className="border-amber-500/40 bg-amber-500/5">
              <CardContent className="py-3 text-[13px] text-muted-foreground flex gap-2">
                <FileWarning className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  ใช้ disavow เฉพาะลิงก์ที่เป็นสแปมจริงหรือลิงก์ที่ซื้อมาเท่านั้น การปฏิเสธลิงก์ดี
                  อาจทำให้อันดับแย่ลง — ถ้าไม่แน่ใจ ให้เลือก “เก็บไว้”
                </span>
              </CardContent>
            </Card>
          )}
          {(step === 1 ? rows : rows.filter((r) => r.decision === "pending")).length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                {step === 2 ? "ตรวจครบทุกโดเมนแล้ว 🎉" : "ยังไม่มีโดเมนในรายการ"}
              </CardContent>
            </Card>
          ) : (
            (step === 1 ? rows : rows.filter((r) => r.decision === "pending")).map((row) => (
              <Card key={row.id}>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-[15px] flex items-center gap-2">
                        {row.source_domain}
                        <a
                          href={row.example_url ?? `https://${row.source_domain}`}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          aria-label={`เปิด ${row.source_domain} ในแท็บใหม่`}
                          className="text-muted-foreground hover:text-primary"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </CardTitle>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <Badge variant="outline" className="text-[11px]">
                          Authority {row.authority_score ?? "—"}/100
                        </Badge>
                        <Badge variant="outline" className="text-[11px]">
                          {row.backlinks_count ?? 0} ลิงก์
                        </Badge>
                        {row.spam_signals.map((s) => (
                          <Badge key={s} className={`${signalTone(s)} border-0 text-[11px]`}>
                            {SIGNAL_LABELS[s] ?? s}
                          </Badge>
                        ))}
                        {savingId === row.id && (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-muted-foreground hover:text-destructive"
                      aria-label={`ลบ ${row.source_domain}`}
                      onClick={() => removeCandidate(row.id, row.source_domain)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  {row.anchor_sample && (
                    <p className="text-[12px] text-muted-foreground leading-relaxed break-words">
                      <span className="font-medium text-foreground">ข้อความลิงก์: </span>“
                      {row.anchor_sample}”
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      size="sm"
                      variant={row.decision === "keep" ? "default" : "outline"}
                      onClick={() => patchRow(row.id, { decision: "keep" })}
                    >
                      <Check className="h-3.5 w-3.5 mr-1" />
                      เก็บไว้
                    </Button>
                    <Button
                      size="sm"
                      variant={row.decision === "disavow_domain" ? "destructive" : "outline"}
                      onClick={() => patchRow(row.id, { decision: "disavow_domain" })}
                    >
                      <X className="h-3.5 w-3.5 mr-1" />
                      ปฏิเสธทั้งโดเมน
                    </Button>
                    <Button
                      size="sm"
                      variant={row.decision === "disavow_url" ? "secondary" : "outline"}
                      disabled={!row.example_url}
                      title={row.example_url ? undefined : "ต้องมี URL ตัวอย่างก่อน"}
                      onClick={() => patchRow(row.id, { decision: "disavow_url" })}
                    >
                      ปฏิเสธเฉพาะ URL
                    </Button>
                    {row.decision !== "pending" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => patchRow(row.id, { decision: "pending" })}
                      >
                        ยกเลิกการตัดสิน
                      </Button>
                    )}
                  </div>
                  <div>
                    <label
                      htmlFor={`dz-notes-${row.id}`}
                      className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider"
                    >
                      เหตุผล / บันทึก
                    </label>
                    <Textarea
                      id={`dz-notes-${row.id}`}
                      defaultValue={row.notes ?? ""}
                      placeholder="เช่น หน้าเว็บขายบริการ backlink, ไม่เกี่ยวกับสุขภาพ"
                      className="mt-1 text-[13px] min-h-[56px]"
                      onBlur={(e) => {
                        const v = e.target.value.trim() || null;
                        if (v !== (row.notes ?? null)) patchRow(row.id, { notes: v });
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setStep(step === 1 ? 2 : 3)}>
              {step === 1 ? "เริ่มตัดสินทีละโดเมน" : "ไปดูตัวอย่างไฟล์"}
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </div>
        </div>
      ) : step === 3 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-[15px]">ตัวอย่างไฟล์ disavow</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {disavowCount === 0 ? (
              <p className="text-sm text-muted-foreground">
                ยังไม่มีโดเมนที่เลือก “ปฏิเสธ” — กลับไปขั้นตอนที่ 2 ก่อน
              </p>
            ) : (
              <pre className="text-[12px] bg-muted rounded-xl p-3 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                {disavowFile}
              </pre>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setStep(2)}>
                กลับไปแก้
              </Button>
              <Button size="sm" onClick={downloadFile} disabled={disavowCount === 0}>
                <Download className="h-4 w-4 mr-1.5" />
                ดาวน์โหลด .txt
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setStep(4)} disabled={disavowCount === 0}>
                ขั้นตอนถัดไป
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : step === 5 ? (
        <DisavowRunHistory refreshKey={historyKey} />
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-[15px]">ส่งไฟล์เข้า Google</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-[13px] text-muted-foreground">
            <ol className="list-decimal ms-5 space-y-1.5">
              <li>ดาวน์โหลดไฟล์ .txt จากขั้นตอนที่ 3</li>
              <li>
                เปิด{" "}
                <a
                  href="https://search.google.com/search-console/disavow-links"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  Google Disavow Links Tool
                </a>{" "}
                แล้วเลือก property <span className="font-medium text-foreground">testd.website</span>
              </li>
              <li>อัปโหลดไฟล์ (ไฟล์ใหม่จะแทนที่ไฟล์เดิมทั้งหมด จึงต้องรวมทุกโดเมนไว้ในไฟล์เดียว)</li>
              <li>รอ Google ประมวลผลราว 2–6 สัปดาห์ แล้วกลับมาตรวจโปรไฟล์ลิงก์อีกครั้ง</li>
              <li>บันทึกวันที่ส่งไว้ในช่อง “เหตุผล / บันทึก” ของแต่ละโดเมน</li>
            </ol>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setStep(3)}>
                กลับ
              </Button>
              <Button size="sm" onClick={downloadFile} disabled={disavowCount === 0}>
                <Download className="h-4 w-4 mr-1.5" />
                ดาวน์โหลดอีกครั้ง
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>เพิ่มโดเมนต้องสงสัย</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="spam-domain.com"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
            />
            <Input
              placeholder="URL ตัวอย่างที่ลิงก์มา (ถ้ามี)"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
            />
            <Textarea
              placeholder="ข้อความลิงก์ (anchor text)"
              value={newAnchor}
              onChange={(e) => setNewAnchor(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={addCandidate}>เพิ่ม</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DisavowCsvImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        existingDomains={rows.map((r) => r.source_domain)}
        onImported={load}
      />
    </div>
  );
}
