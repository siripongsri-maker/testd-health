import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Plus, Download, Pencil, Trash2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import ReportingPeriodDrawer from "./ReportingPeriodDrawer";
import MelDeleteDialog from "./MelDeleteDialog";
import MelSOPCard, { MEL_SOPS } from "./MelSOPCard";

function exportToCSV(data: any[], filename: string) {
  if (!data.length) return;
  const BOM = "\uFEFF";
  const keys = Object.keys(data[0]);
  const csv = BOM + [keys.join(","), ...data.map(row => keys.map(k => `"${String(row[k] ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function MelReportingContent() {
  const { language } = useLanguage();
  const isTh = language === "th";
  const qc = useQueryClient();
  const [periodDrawerOpen, setPeriodDrawerOpen] = useState(false);
  const [editPeriod, setEditPeriod] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const { data: periods } = useQuery({
    queryKey: ["mel-reporting-periods"],
    queryFn: async () => { const { data } = await supabase.from("reporting_periods").select("*").order("start_date", { ascending: false }); return data || []; },
  });

  const { data: results } = useQuery({
    queryKey: ["mel-all-indicator-results"],
    queryFn: async () => {
      const { data } = await supabase.from("indicator_results").select("*, indicator_definitions(indicator_code, indicator_name_en, indicator_name_th, target_value, unit, result_level)").order("created_at", { ascending: false }).limit(200);
      return data || [];
    },
  });

  const { data: dqFlags } = useQuery({
    queryKey: ["mel-dq-flags"],
    queryFn: async () => { const { data } = await supabase.from("data_quality_flags").select("*").eq("status", "open").order("created_at", { ascending: false }).limit(50); return data || []; },
  });

  const { data: indicators } = useQuery({
    queryKey: ["mel-indicators"],
    queryFn: async () => { const { data } = await supabase.from("indicator_definitions").select("*").eq("is_active", true).order("display_order"); return data || []; },
  });

  const deletePeriod = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("reporting_periods").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mel-reporting-periods"] }); toast({ title: isTh ? "ลบสำเร็จ" : "Deleted" }); },
    onError: () => { toast({ title: isTh ? "ลบไม่สำเร็จ" : "Delete failed", variant: "destructive" }); },
  });

  const resolveDqFlag = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("data_quality_flags").update({ status: "resolved", resolved_at: new Date().toISOString() }).eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mel-dq-flags"] }); toast({ title: isTh ? "แก้ไขแล้ว" : "Resolved" }); },
    onError: () => { toast({ title: isTh ? "แก้ไขไม่สำเร็จ" : "Failed to resolve", variant: "destructive" }); },
  });

  const handleExportIndicators = () => {
    if (!indicators?.length) return;
    const rows = indicators.map((ind: any) => {
      const indResults = results?.filter((r: any) => r.indicator_id === ind.id) || [];
      const latestValue = indResults.length > 0 ? indResults[0].value : "";
      return { code: ind.indicator_code, name_en: ind.indicator_name_en, name_th: ind.indicator_name_th, result_level: ind.result_level, unit: ind.unit, target: ind.target_value, latest_value: latestValue, progress: ind.target_value ? `${Math.round((Number(latestValue) / ind.target_value) * 100)}%` : "", results_count: indResults.length };
    });
    exportToCSV(rows, `mel-indicator-summary-${new Date().toISOString().split("T")[0]}.csv`);
    toast({ title: isTh ? "ส่งออกสำเร็จ" : "Exported" });
  };

  const handleExportResults = () => {
    if (!results?.length) return;
    const rows = results.map((r: any) => ({ indicator_code: r.indicator_definitions?.indicator_code, indicator_en: r.indicator_definitions?.indicator_name_en, value: r.value, period: r.period_label, disaggregation: r.disaggregation_key, notes: r.notes, verified: r.verified ? "Yes" : "No", created_at: r.created_at }));
    exportToCSV(rows, `mel-results-${new Date().toISOString().split("T")[0]}.csv`);
    toast({ title: isTh ? "ส่งออกสำเร็จ" : "Exported" });
  };

  const indicatorProgress = indicators?.map((ind: any) => {
    const indResults = results?.filter((r: any) => r.indicator_id === ind.id) || [];
    const latestValue = indResults.length > 0 ? indResults[0].value : 0;
    const pct = ind.target_value ? Math.min(Math.round((latestValue / ind.target_value) * 100), 100) : null;
    return { ...ind, latestValue, pct, resultCount: indResults.length };
  }) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{isTh ? "รายงาน MEL" : "MEL Reporting"}</h2>
          <p className="text-muted-foreground text-sm">{isTh ? "รอบรายงาน ผลตัวชี้วัด และคุณภาพข้อมูล" : "Periods, indicator results & data quality"}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExportIndicators}><Download className="h-4 w-4" />{isTh ? "ตัวชี้วัด" : "Indicators"}</Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExportResults}><Download className="h-4 w-4" />{isTh ? "ผลลัพธ์" : "Results"}</Button>
        </div>
      </div>

      <MelSOPCard {...MEL_SOPS.reporting} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{isTh ? "ตัวชี้วัด" : "Indicators"}</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-foreground">{indicators?.length || 0}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{isTh ? "รอบรายงาน" : "Periods"}</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-foreground">{periods?.length || 0}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{isTh ? "ผลบันทึก" : "Results"}</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-foreground">{results?.length || 0}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{isTh ? "ปัญหาคุณภาพ" : "DQ Flags"}</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-destructive">{dqFlags?.length || 0}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="progress">
        <TabsList>
          <TabsTrigger value="progress">{isTh ? "ความคืบหน้า" : "Progress"}</TabsTrigger>
          <TabsTrigger value="periods">{isTh ? "รอบรายงาน" : "Periods"}</TabsTrigger>
          <TabsTrigger value="dq">{isTh ? "คุณภาพข้อมูล" : "Data Quality"}</TabsTrigger>
        </TabsList>

        <TabsContent value="progress" className="mt-4 space-y-3">
          {indicatorProgress.length === 0 ? (
            <Card className="border-dashed"><CardContent className="flex flex-col items-center py-12"><BarChart3 className="h-12 w-12 text-muted-foreground/40 mb-4" /><p className="text-muted-foreground">{isTh ? "ยังไม่มีตัวชี้วัด" : "No indicators to show"}</p></CardContent></Card>
          ) : (
            <Card><CardContent className="p-0"><div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">{isTh ? "รหัส" : "Code"}</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">{isTh ? "ตัวชี้วัด" : "Indicator"}</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">{isTh ? "เป้าหมาย" : "Target"}</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">{isTh ? "ล่าสุด" : "Latest"}</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">{isTh ? "ความคืบหน้า" : "Progress"}</th>
                </tr></thead>
                <tbody>
                  {indicatorProgress.map((ind: any) => (
                    <tr key={ind.id} className="border-b hover:bg-muted/30">
                      <td className="p-3 font-mono text-xs">{ind.indicator_code}</td>
                      <td className="p-3">{isTh ? ind.indicator_name_th : ind.indicator_name_en}</td>
                      <td className="p-3 text-right">{ind.target_value ?? "—"}</td>
                      <td className="p-3 text-right font-semibold">{ind.latestValue || "—"}</td>
                      <td className="p-3 text-right">
                        {ind.pct != null ? (
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${ind.pct >= 80 ? "bg-green-500" : ind.pct >= 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${ind.pct}%` }} />
                            </div>
                            <span className="text-xs w-10 text-right">{ind.pct}%</span>
                          </div>
                        ) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div></CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="periods" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button size="sm" className="gap-2" onClick={() => { setEditPeriod(null); setPeriodDrawerOpen(true); }}><Plus className="h-4 w-4" />{isTh ? "เพิ่มรอบ" : "Add Period"}</Button>
          </div>
          {periods?.length === 0 ? (
            <Card className="border-dashed"><CardContent className="flex flex-col items-center py-12"><BarChart3 className="h-12 w-12 text-muted-foreground/40 mb-4" /><p className="text-muted-foreground">{isTh ? "ยังไม่มีรอบรายงาน" : "No reporting periods yet"}</p></CardContent></Card>
          ) : periods?.map((p: any) => (
            <Card key={p.id} className="hover:bg-muted/30 transition-colors"><CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">{p.period_label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{p.start_date} — {p.end_date} · {p.period_type}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${p.status === "submitted" ? "bg-green-500/10 text-green-600" : p.status === "closed" ? "bg-muted text-muted-foreground" : "bg-blue-500/10 text-blue-600"}`}>{p.status}</span>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditPeriod(p); setPeriodDrawerOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(p)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </CardContent></Card>
          ))}
        </TabsContent>

        <TabsContent value="dq" className="mt-4 space-y-3">
          {dqFlags?.length === 0 ? (
            <Card className="border-dashed"><CardContent className="flex flex-col items-center py-12"><CheckCircle2 className="h-12 w-12 text-green-500/40 mb-4" /><p className="text-muted-foreground">{isTh ? "ไม่พบปัญหาคุณภาพข้อมูล" : "No open data quality issues"}</p></CardContent></Card>
          ) : dqFlags?.map((f: any) => (
            <Card key={f.id} className="hover:bg-muted/30 transition-colors"><CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <AlertCircle className={`h-4 w-4 ${f.severity === "critical" ? "text-red-500" : f.severity === "high" ? "text-amber-500" : "text-muted-foreground"}`} />
                    <p className="font-medium text-foreground">{f.flag_type.replace(/_/g, " ")}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{f.source_table} · {f.description || "—"}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => resolveDqFlag.mutate(f.id)}>{isTh ? "แก้ไข" : "Resolve"}</Button>
              </div>
            </CardContent></Card>
          ))}
        </TabsContent>
      </Tabs>

      <ReportingPeriodDrawer key={editPeriod?.id || "new-p"} open={periodDrawerOpen} onOpenChange={setPeriodDrawerOpen} editItem={editPeriod} />
      <MelDeleteDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }} onConfirm={() => { if (deleteTarget) { deletePeriod.mutate(deleteTarget.id); setDeleteTarget(null); } }} itemLabel={deleteTarget?.period_label} />
    </div>
  );
}
