import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  ExternalLink,
  Link2,
  Plus,
  Trash2,
  Download,
  Mail,
  Upload,
} from "lucide-react";
import OutreachEmailDialog from "./OutreachEmailDialog";
import ProspectEmailDraft from "./ProspectEmailDraft";
import ProspectFollowupScheduler from "./ProspectFollowupScheduler";
import ProspectMessageLog from "./ProspectMessageLog";
import OutreachFollowupPanel from "./OutreachFollowupPanel";
import ProspectCsvImportDialog from "./ProspectCsvImportDialog";

interface ProspectRow {
  id: string;
  domain: string;
  authority_score: number | null;
  links_to: string | null;
  rationale: string | null;
  contact_url: string | null;
  status: string;
  notes: string | null;
  updated_at: string;
}

const STATUSES = [
  { value: "not_started", labelTh: "ยังไม่เริ่ม", tone: "bg-muted text-muted-foreground" },
  { value: "in_progress", labelTh: "กำลังติดต่อ", tone: "bg-hr-teal/15 text-hr-teal" },
  { value: "replied", labelTh: "ตอบกลับแล้ว", tone: "bg-primary/15 text-primary" },
  { value: "linked", labelTh: "ได้ลิงก์แล้ว", tone: "bg-emerald-500/15 text-emerald-600" },
  { value: "declined", labelTh: "ปฏิเสธ", tone: "bg-destructive/10 text-destructive" },
] as const;

function statusMeta(value: string) {
  return STATUSES.find((s) => s.value === value) ?? STATUSES[0];
}

function authorityTone(score: number | null) {
  if (score === null) return "bg-muted text-muted-foreground";
  if (score >= 25) return "bg-emerald-500/15 text-emerald-600";
  if (score >= 10) return "bg-amber-500/15 text-amber-600";
  return "bg-muted text-muted-foreground";
}

export default function AdminLinkProspectsContent() {
  const [rows, setRows] = useState<ProspectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [newAuthority, setNewAuthority] = useState("");
  const [newRationale, setNewRationale] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("seo_link_prospects")
      .select("*")
      .order("authority_score", { ascending: false, nullsFirst: false });
    if (error) {
      toast.error("โหลดข้อมูลไม่สำเร็จ: " + error.message);
    } else {
      setRows((data ?? []) as ProspectRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const patchRow = async (id: string, patch: Partial<ProspectRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    setSavingId(id);
    const { error } = await supabase
      .from("seo_link_prospects")
      .update({ ...patch, updated_by: (await supabase.auth.getUser()).data.user?.id })
      .eq("id", id);
    setSavingId(null);
    if (error) {
      toast.error("บันทึกไม่สำเร็จ: " + error.message);
      load();
    }
  };

  const addProspect = async () => {
    const domain = newDomain.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!domain) {
      toast.error("กรุณาใส่โดเมน");
      return;
    }
    const { error } = await supabase.from("seo_link_prospects").insert({
      domain,
      authority_score: newAuthority ? Number(newAuthority) : null,
      rationale: newRationale.trim() || null,
      contact_url: `https://${domain}`,
    });
    if (error) {
      toast.error("เพิ่มไม่สำเร็จ: " + error.message);
      return;
    }
    toast.success("เพิ่มโดเมนแล้ว");
    setAddOpen(false);
    setNewDomain("");
    setNewAuthority("");
    setNewRationale("");
    load();
  };

  const removeProspect = async (id: string, domain: string) => {
    const { error } = await supabase.from("seo_link_prospects").delete().eq("id", id);
    if (error) {
      toast.error("ลบไม่สำเร็จ: " + error.message);
      return;
    }
    toast.success(`ลบ ${domain} แล้ว`);
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const filtered = useMemo(
    () => (statusFilter === "all" ? rows : rows.filter((r) => r.status === statusFilter)),
    [rows, statusFilter],
  );

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of rows) map[r.status] = (map[r.status] ?? 0) + 1;
    return map;
  }, [rows]);

  const exportCsv = () => {
    const header = ["domain", "authority", "links_to", "status", "rationale", "notes"];
    const lines = [
      header.join(","),
      ...filtered.map((r) =>
        [
          r.domain,
          r.authority_score ?? "",
          r.links_to ?? "",
          statusMeta(r.status).labelTh,
          r.rationale ?? "",
          r.notes ?? "",
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(","),
      ),
    ];
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `link-prospects-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            รายชื่อเว็บเป้าหมายขอลิงก์ (Link Prospecting)
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            เว็บสุขภาพทางเพศ/HIV ที่ลิงก์หาองค์กรใกล้เคียงอยู่แล้ว — ติดตามสถานะการติดต่อได้ที่นี่
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            รีเฟรช
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!filtered.length}>
            <Download className="h-4 w-4 mr-1.5" />
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEmailOpen(true)}
            disabled={!rows.length}
          >
            <Mail className="h-4 w-4 mr-1.5" />
            ร่างอีเมล 5 อันดับแรก
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            เพิ่มโดเมน
          </Button>
        </div>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {STATUSES.map((s) => (
          <button
            key={s.value}
            onClick={() => setStatusFilter(statusFilter === s.value ? "all" : s.value)}
            className={`rounded-2xl p-3 text-left transition ${
              statusFilter === s.value ? "ring-2 ring-primary" : ""
            } ${s.tone}`}
          >
            <div className="text-xl font-bold">{counts[s.value] ?? 0}</div>
            <div className="text-[11px] font-medium">{s.labelTh}</div>
          </button>
        ))}
      </div>

      <OutreachFollowupPanel domains={rows.map((r) => r.domain)} />

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            ยังไม่มีโดเมนในสถานะนี้
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((row) => (
            <Card key={row.id}>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-[15px] flex items-center gap-2 flex-wrap">
                      {row.domain}
                      <a
                        href={row.contact_url ?? `https://${row.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`เปิด ${row.domain} ในแท็บใหม่`}
                        className="text-muted-foreground hover:text-primary"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </CardTitle>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <Badge className={`${authorityTone(row.authority_score)} border-0 text-[11px]`}>
                        Authority {row.authority_score ?? "—"}/100
                      </Badge>
                      {row.links_to && (
                        <Badge variant="outline" className="text-[11px]">
                          ลิงก์หา {row.links_to} อยู่แล้ว
                        </Badge>
                      )}
                      {savingId === row.id && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={row.status}
                      onValueChange={(v) => patchRow(row.id, { status: v })}
                    >
                      <SelectTrigger className="h-9 w-[150px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s.value} value={s.value} className="text-xs">
                            {s.labelTh}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-muted-foreground hover:text-destructive"
                      aria-label={`ลบ ${row.domain}`}
                      onClick={() => removeProspect(row.id, row.domain)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {row.rationale && (
                  <p className="text-[13px] text-muted-foreground leading-relaxed">
                    <span className="font-medium text-foreground">เหตุผลที่เหมาะ: </span>
                    {row.rationale}
                  </p>
                )}
                <ProspectEmailDraft prospectId={row.id} domain={row.domain} />
                <ProspectFollowupScheduler domain={row.domain} status={row.status} />
                <ProspectMessageLog domain={row.domain} />
                <div>
                  <label
                    htmlFor={`notes-${row.id}`}
                    className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider"
                  >
                    บันทึกการติดต่อ
                  </label>
                  <Textarea
                    id={`notes-${row.id}`}
                    defaultValue={row.notes ?? ""}
                    placeholder="เช่น ส่งอีเมลวันที่… / ติดต่อผ่านเพจ… / รอตอบกลับ"
                    className="mt-1 text-[13px] min-h-[68px]"
                    onBlur={(e) => {
                      const v = e.target.value.trim() || null;
                      if (v !== (row.notes ?? null)) patchRow(row.id, { notes: v });
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>เพิ่มโดเมนเป้าหมาย</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="example.org"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
            />
            <Input
              type="number"
              placeholder="Authority score (0–100)"
              value={newAuthority}
              onChange={(e) => setNewAuthority(e.target.value)}
            />
            <Textarea
              placeholder="เหตุผลที่เหมาะกับเรา"
              value={newRationale}
              onChange={(e) => setNewRationale(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={addProspect}>เพิ่ม</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <OutreachEmailDialog
        open={emailOpen}
        onOpenChange={setEmailOpen}
        prospects={rows.map((r) => ({
          id: r.id,
          domain: r.domain,
          authority_score: r.authority_score,
          contact_url: r.contact_url,
        }))}
      />
    </div>
  );
}
