import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Target, Plus, Pencil, Trash2, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import IndicatorDrawer from "./IndicatorDrawer";
import IndicatorResultDrawer from "./IndicatorResultDrawer";
import MelDeleteDialog from "./MelDeleteDialog";
import MelSOPCard, { MEL_SOPS } from "./MelSOPCard";

export default function MelIndicatorsContent() {
  const { language } = useLanguage();
  const isTh = language === "th";
  const qc = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editIndicator, setEditIndicator] = useState<any>(null);
  const [resultDrawerOpen, setResultDrawerOpen] = useState(false);
  const [resultIndicator, setResultIndicator] = useState<any>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const { data: indicators, isLoading } = useQuery({
    queryKey: ["mel-indicators"],
    queryFn: async () => {
      const { data, error } = await supabase.from("indicator_definitions").select("*").order("display_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: results } = useQuery({
    queryKey: ["mel-indicator-results", expandedId],
    enabled: !!expandedId,
    queryFn: async () => {
      const { data, error } = await supabase.from("indicator_results").select("*").eq("indicator_id", expandedId!).order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("indicator_definitions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mel-indicators"] }); toast({ title: isTh ? "ลบสำเร็จ" : "Deleted" }); },
    onError: () => { toast({ title: isTh ? "ลบไม่สำเร็จ" : "Delete failed", variant: "destructive" }); },
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const levels = ["impact", "outcome", "intermediate_outcome", "output"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{isTh ? "ตัวชี้วัด" : "Indicators"}</h2>
          <p className="text-muted-foreground text-sm">{isTh ? "นิยามและเป้าหมายตัวชี้วัด MEL" : "MEL indicator definitions & targets"}</p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => { setEditIndicator(null); setDrawerOpen(true); }}>
          <Plus className="h-4 w-4" />{isTh ? "เพิ่มตัวชี้วัด" : "Add Indicator"}
        </Button>
      </div>

      <MelSOPCard {...MEL_SOPS.indicators} />

      {(!indicators || indicators.length === 0) ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Target className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">{isTh ? "ยังไม่มีตัวชี้วัด" : "No indicators defined yet"}</p>
          </CardContent>
        </Card>
      ) : (
        levels.map(level => {
          const levelIndicators = indicators.filter((i: any) => i.result_level === level);
          if (levelIndicators.length === 0) return null;
          return (
            <div key={level} className="space-y-3">
              <h3 className="text-lg font-semibold text-foreground capitalize">{level.replace(/_/g, " ")}</h3>
              <div className="grid gap-3">
                {levelIndicators.map((ind: any) => (
                  <Card key={ind.id} className={expandedId === ind.id ? "ring-2 ring-primary/30" : ""}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 cursor-pointer" onClick={() => setExpandedId(expandedId === ind.id ? null : ind.id)}>
                          <p className="font-medium text-foreground">{isTh ? ind.indicator_name_th : ind.indicator_name_en}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {ind.indicator_code} · {ind.unit} · {ind.collection_frequency}
                            {ind.data_source && ` · ${ind.data_source}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {ind.target_value != null && (
                            <div className="text-right mr-2">
                              <p className="text-xs text-muted-foreground">{isTh ? "เป้าหมาย" : "Target"}</p>
                              <p className="text-lg font-bold text-primary">{ind.target_value}</p>
                            </div>
                          )}
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setResultIndicator(ind); setResultDrawerOpen(true); }} title={isTh ? "บันทึกผล" : "Record result"}>
                            <BarChart3 className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditIndicator(ind); setDrawerOpen(true); }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(ind)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      {expandedId === ind.id && (
                        <div className="mt-4 pt-3 border-t">
                          <p className="text-sm font-medium text-muted-foreground mb-2">{isTh ? "ผลลัพธ์ล่าสุด" : "Recent Results"}</p>
                          {!results || results.length === 0 ? (
                            <p className="text-xs text-muted-foreground/60">{isTh ? "ยังไม่มีผลลัพธ์" : "No results recorded yet"}</p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead><tr className="border-b">
                                  <th className="text-left py-1.5 pr-3 font-medium text-muted-foreground">{isTh ? "ช่วงเวลา" : "Period"}</th>
                                  <th className="text-right py-1.5 pr-3 font-medium text-muted-foreground">{isTh ? "ค่า" : "Value"}</th>
                                  <th className="text-left py-1.5 pr-3 font-medium text-muted-foreground">{isTh ? "กลุ่มย่อย" : "Disagg."}</th>
                                  <th className="text-left py-1.5 font-medium text-muted-foreground">{isTh ? "หมายเหตุ" : "Notes"}</th>
                                </tr></thead>
                                <tbody>
                                  {results.map((r: any) => (
                                    <tr key={r.id} className="border-b border-muted/30">
                                      <td className="py-1.5 pr-3">{r.period_label || "—"}</td>
                                      <td className="py-1.5 pr-3 text-right font-semibold">{r.value}</td>
                                      <td className="py-1.5 pr-3">{r.disaggregation_key || "—"}</td>
                                      <td className="py-1.5 text-muted-foreground truncate max-w-[200px]">{r.notes || "—"}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })
      )}

      <IndicatorDrawer key={editIndicator?.id || "new-ind"} open={drawerOpen} onOpenChange={setDrawerOpen} editIndicator={editIndicator} />
      {resultIndicator && (
        <IndicatorResultDrawer key={resultIndicator.id} open={resultDrawerOpen} onOpenChange={setResultDrawerOpen} indicator={resultIndicator} />
      )}
      <MelDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        onConfirm={() => { if (deleteTarget) { deleteMutation.mutate(deleteTarget.id); setDeleteTarget(null); } }}
        itemLabel={deleteTarget?.indicator_code}
      />
    </div>
  );
}
