import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { FileSearch, Plus, AlertTriangle, Calendar, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import KEQDrawer from "./KEQDrawer";
import RiskDrawer from "./RiskDrawer";
import TimelineDrawer from "./TimelineDrawer";
import MelDeleteDialog from "./MelDeleteDialog";
import MelSOPCard, { MEL_SOPS } from "./MelSOPCard";

export default function MelEvaluationContent() {
  const { language } = useLanguage();
  const isTh = language === "th";
  const qc = useQueryClient();

  const [keqDrawerOpen, setKeqDrawerOpen] = useState(false);
  const [editKeq, setEditKeq] = useState<any>(null);
  const [riskDrawerOpen, setRiskDrawerOpen] = useState(false);
  const [editRisk, setEditRisk] = useState<any>(null);
  const [tlDrawerOpen, setTlDrawerOpen] = useState(false);
  const [editTl, setEditTl] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; table: string; label: string } | null>(null);

  const { data: keqs } = useQuery({
    queryKey: ["mel-keqs"],
    queryFn: async () => { const { data } = await supabase.from("evaluation_questions").select("*").order("display_order"); return data || []; },
  });

  const { data: risks } = useQuery({
    queryKey: ["mel-eval-risks"],
    queryFn: async () => { const { data } = await supabase.from("evaluation_risks").select("*").order("created_at", { ascending: false }); return data || []; },
  });

  const { data: timeline } = useQuery({
    queryKey: ["mel-timeline"],
    queryFn: async () => { const { data } = await supabase.from("mel_timeline_items").select("*").order("display_order"); return data || []; },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, table }: { id: string; table: string }) => {
      const { error } = await supabase.from(table as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mel-keqs"] });
      qc.invalidateQueries({ queryKey: ["mel-eval-risks"] });
      qc.invalidateQueries({ queryKey: ["mel-timeline"] });
      toast({ title: isTh ? "ลบสำเร็จ" : "Deleted" });
    },
    onError: () => { toast({ title: isTh ? "ลบไม่สำเร็จ" : "Delete failed", variant: "destructive" }); },
  });

  const riskColor = (level: string) => {
    if (level === "critical" || level === "high") return "text-red-600";
    if (level === "medium") return "text-amber-600";
    return "text-muted-foreground";
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">{isTh ? "การประเมินผล" : "Evaluation Workspace"}</h2>
        <p className="text-muted-foreground text-sm">{isTh ? "KEQs, เมทริกซ์, ความเสี่ยง, และไทม์ไลน์" : "KEQs, matrix, risks & timeline"}</p>
      </div>

      <MelSOPCard {...MEL_SOPS.evaluation} />

      <Tabs defaultValue="keqs">
        <TabsList>
          <TabsTrigger value="keqs">{isTh ? "คำถามหลัก" : "KEQs"} ({keqs?.length || 0})</TabsTrigger>
          <TabsTrigger value="risks">{isTh ? "ความเสี่ยง" : "Risks"} ({risks?.length || 0})</TabsTrigger>
          <TabsTrigger value="timeline">{isTh ? "ไทม์ไลน์" : "Timeline"} ({timeline?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="keqs" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button size="sm" className="gap-2" onClick={() => { setEditKeq(null); setKeqDrawerOpen(true); }}><Plus className="h-4 w-4" />{isTh ? "เพิ่ม KEQ" : "Add KEQ"}</Button>
          </div>
          {keqs?.length === 0 ? (
            <Card className="border-dashed"><CardContent className="flex flex-col items-center py-12"><FileSearch className="h-12 w-12 text-muted-foreground/40 mb-4" /><p className="text-muted-foreground">{isTh ? "ยังไม่มีคำถามหลัก" : "No KEQs defined yet"}</p></CardContent></Card>
          ) : keqs?.map((q: any) => (
            <Card key={q.id} className="hover:bg-muted/30 transition-colors"><CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="font-medium text-foreground">{q.question_text}</p>
                  <p className="text-xs text-muted-foreground mt-1">{q.result_area || "—"} · {q.methodology || "—"} · {q.data_sources || "—"}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditKeq(q); setKeqDrawerOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget({ id: q.id, table: "evaluation_questions", label: q.question_text?.substring(0, 40) })}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </CardContent></Card>
          ))}
        </TabsContent>

        <TabsContent value="risks" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button size="sm" className="gap-2" onClick={() => { setEditRisk(null); setRiskDrawerOpen(true); }}><Plus className="h-4 w-4" />{isTh ? "เพิ่มความเสี่ยง" : "Add Risk"}</Button>
          </div>
          {risks?.length === 0 ? (
            <Card className="border-dashed"><CardContent className="flex flex-col items-center py-12"><AlertTriangle className="h-12 w-12 text-muted-foreground/40 mb-4" /><p className="text-muted-foreground">{isTh ? "ยังไม่มีความเสี่ยง" : "No risks logged"}</p></CardContent></Card>
          ) : risks?.map((r: any) => (
            <Card key={r.id} className="hover:bg-muted/30 transition-colors"><CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="font-medium text-foreground">{r.risk_description}</p>
                  <p className="text-xs text-muted-foreground mt-1 capitalize">
                    {r.risk_category} · <span className={riskColor(r.likelihood)}>L:{r.likelihood}</span> <span className={riskColor(r.impact)}>I:{r.impact}</span> · {r.status}
                  </p>
                  {r.mitigation && <p className="text-xs text-muted-foreground mt-1">↳ {r.mitigation}</p>}
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditRisk(r); setRiskDrawerOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget({ id: r.id, table: "evaluation_risks", label: r.risk_description?.substring(0, 40) })}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </CardContent></Card>
          ))}
        </TabsContent>

        <TabsContent value="timeline" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button size="sm" className="gap-2" onClick={() => { setEditTl(null); setTlDrawerOpen(true); }}><Plus className="h-4 w-4" />{isTh ? "เพิ่มกิจกรรม" : "Add Activity"}</Button>
          </div>
          {timeline?.length === 0 ? (
            <Card className="border-dashed"><CardContent className="flex flex-col items-center py-12"><Calendar className="h-12 w-12 text-muted-foreground/40 mb-4" /><p className="text-muted-foreground">{isTh ? "ยังไม่มีไทม์ไลน์" : "No timeline items"}</p></CardContent></Card>
          ) : timeline?.map((t: any) => (
            <Card key={t.id} className="hover:bg-muted/30 transition-colors"><CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-foreground">{t.activity_name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t.start_date || "—"} — {t.end_date || "ongoing"} · {t.responsible || "—"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${t.status === "completed" ? "bg-green-500/10 text-green-600" : t.status === "in_progress" ? "bg-blue-500/10 text-blue-600" : t.status === "delayed" ? "bg-amber-500/10 text-amber-600" : "bg-muted text-muted-foreground"}`}>{t.status}</span>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditTl(t); setTlDrawerOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget({ id: t.id, table: "mel_timeline_items", label: t.activity_name })}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </CardContent></Card>
          ))}
        </TabsContent>
      </Tabs>

      <KEQDrawer key={editKeq?.id || "new-keq"} open={keqDrawerOpen} onOpenChange={setKeqDrawerOpen} editItem={editKeq} />
      <RiskDrawer key={editRisk?.id || "new-risk"} open={riskDrawerOpen} onOpenChange={setRiskDrawerOpen} editItem={editRisk} />
      <TimelineDrawer key={editTl?.id || "new-tl"} open={tlDrawerOpen} onOpenChange={setTlDrawerOpen} editItem={editTl} />
      <MelDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        onConfirm={() => { if (deleteTarget) { deleteMutation.mutate({ id: deleteTarget.id, table: deleteTarget.table }); setDeleteTarget(null); } }}
        itemLabel={deleteTarget?.label}
      />
    </div>
  );
}
