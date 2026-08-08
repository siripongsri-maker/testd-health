import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Loader2,
  History,
  Download,
  Eye,
  CheckCircle2,
  RefreshCw,
  Trash2,
} from "lucide-react";

export interface DisavowRunEntry {
  type: "domain" | "url";
  value: string;
  signals?: string[];
}

export interface DisavowRunRow {
  id: string;
  generated_at: string;
  domain_count: number;
  url_count: number;
  entries: DisavowRunEntry[];
  file_content: string;
  file_name: string;
  note: string | null;
  submitted_to_google: boolean;
  submitted_at: string | null;
}

export function formatThaiDateTime(iso: string) {
  return new Date(iso).toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** Records a generated disavow file into the audit history. */
export async function recordDisavowRun(params: {
  fileContent: string;
  fileName: string;
  entries: DisavowRunEntry[];
  domainCount: number;
  urlCount: number;
}) {
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase.from("seo_disavow_runs").insert({
    file_content: params.fileContent,
    file_name: params.fileName,
    entries: params.entries as unknown as never,
    domain_count: params.domainCount,
    url_count: params.urlCount,
    generated_by: userData.user?.id ?? null,
  });
  if (error) toast.error("บันทึกประวัติไม่สำเร็จ: " + error.message);
  return !error;
}

export default function DisavowRunHistory({ refreshKey }: { refreshKey?: number }) {
  const [runs, setRuns] = useState<DisavowRunRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<DisavowRunRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("seo_disavow_runs")
      .select("*")
      .order("generated_at", { ascending: false })
      .limit(100);
    if (error) toast.error("โหลดประวัติไม่สำเร็จ: " + error.message);
    else setRuns((data ?? []) as unknown as DisavowRunRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const redownload = (run: DisavowRunRow) => {
    const blob = new Blob([run.file_content], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = run.file_name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const markSubmitted = async (run: DisavowRunRow) => {
    const submitted = !run.submitted_to_google;
    setRuns((prev) =>
      prev.map((r) =>
        r.id === run.id
          ? {
              ...r,
              submitted_to_google: submitted,
              submitted_at: submitted ? new Date().toISOString() : null,
            }
          : r,
      ),
    );
    const { error } = await supabase
      .from("seo_disavow_runs")
      .update({
        submitted_to_google: submitted,
        submitted_at: submitted ? new Date().toISOString() : null,
      })
      .eq("id", run.id);
    if (error) {
      toast.error("บันทึกไม่สำเร็จ: " + error.message);
      load();
    }
  };

  const removeRun = async (run: DisavowRunRow) => {
    const { error } = await supabase.from("seo_disavow_runs").delete().eq("id", run.id);
    if (error) {
      toast.error("ลบไม่สำเร็จ: " + error.message);
      return;
    }
    setRuns((prev) => prev.filter((r) => r.id !== run.id));
    toast.success("ลบรายการประวัติแล้ว");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-[15px] font-bold flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            ประวัติการสร้างไฟล์ Disavow
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            เก็บทุกครั้งที่สร้างไฟล์ พร้อมรายชื่อโดเมน/URL ที่เลือก และเวลาที่สร้าง (เวลาไทย)
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          รีเฟรช
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : runs.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            ยังไม่มีประวัติ — เมื่อดาวน์โหลดไฟล์ disavow ระบบจะบันทึกไว้ที่นี่อัตโนมัติ
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {runs.map((run) => (
            <Card key={run.id}>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-[14px]">
                      {formatThaiDateTime(run.generated_at)}
                    </CardTitle>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <Badge className="bg-destructive/10 text-destructive border-0 text-[11px]">
                        {run.domain_count} โดเมน
                      </Badge>
                      <Badge className="bg-amber-500/15 text-amber-600 border-0 text-[11px]">
                        {run.url_count} URL
                      </Badge>
                      {run.submitted_to_google && (
                        <Badge className="bg-emerald-500/15 text-emerald-600 border-0 text-[11px]">
                          ส่ง Google แล้ว
                          {run.submitted_at ? ` · ${formatThaiDateTime(run.submitted_at)}` : ""}
                        </Badge>
                      )}
                      <span className="text-[11px] text-muted-foreground font-mono truncate">
                        {run.file_name}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      aria-label="ดูรายละเอียดไฟล์"
                      onClick={() => setViewing(run)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      aria-label="ดาวน์โหลดไฟล์นี้อีกครั้ง"
                      onClick={() => redownload(run)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-9 w-9 ${run.submitted_to_google ? "text-emerald-600" : "text-muted-foreground"}`}
                      aria-label="สลับสถานะส่ง Google แล้ว"
                      onClick={() => markSubmitted(run)}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-muted-foreground hover:text-destructive"
                      aria-label="ลบรายการประวัติ"
                      onClick={() => removeRun(run)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-1">
                  {(run.entries ?? []).slice(0, 8).map((e, i) => (
                    <Badge key={`${e.value}-${i}`} variant="outline" className="text-[11px] max-w-[220px] truncate">
                      {e.type === "domain" ? "domain:" : ""}
                      {e.value}
                    </Badge>
                  ))}
                  {(run.entries?.length ?? 0) > 8 && (
                    <Badge variant="outline" className="text-[11px]">
                      +{run.entries.length - 8} รายการ
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!viewing} onOpenChange={(v) => !v && setViewing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              ไฟล์ที่สร้างเมื่อ {viewing ? formatThaiDateTime(viewing.generated_at) : ""}
            </DialogTitle>
          </DialogHeader>
          <pre className="text-[12px] bg-muted rounded-xl p-3 overflow-auto max-h-[55vh] whitespace-pre-wrap leading-relaxed">
            {viewing?.file_content}
          </pre>
          <div className="flex justify-end">
            <Button size="sm" onClick={() => viewing && redownload(viewing)}>
              <Download className="h-4 w-4 mr-1.5" />
              ดาวน์โหลด
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
