import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, BarChart3, Plus, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MelReportingContent() {
  const { language } = useLanguage();
  const isTh = language === "th";

  const { data: periods } = useQuery({
    queryKey: ["mel-reporting-periods"],
    queryFn: async () => {
      const { data } = await supabase.from("reporting_periods").select("*").order("start_date", { ascending: false });
      return data || [];
    },
  });

  const { data: results } = useQuery({
    queryKey: ["mel-indicator-results"],
    queryFn: async () => {
      const { data } = await supabase
        .from("indicator_results")
        .select("*, indicator_definitions(indicator_code, indicator_name_en, indicator_name_th)")
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  const { data: dqFlags } = useQuery({
    queryKey: ["mel-dq-flags"],
    queryFn: async () => {
      const { data } = await supabase.from("data_quality_flags").select("*").eq("status", "open").order("created_at", { ascending: false }).limit(20);
      return data || [];
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{isTh ? "รายงาน MEL" : "MEL Reporting"}</h2>
          <p className="text-muted-foreground text-sm">{isTh ? "รอบรายงาน ผลตัวชี้วัด และคุณภาพข้อมูล" : "Periods, indicator results & data quality"}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2"><Download className="h-4 w-4" />{isTh ? "ส่งออก" : "Export"}</Button>
          <Button size="sm" className="gap-2"><Plus className="h-4 w-4" />{isTh ? "เพิ่มรอบ" : "Add Period"}</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{isTh ? "รอบรายงาน" : "Periods"}</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-foreground">{periods?.length || 0}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{isTh ? "ผลตัวชี้วัด" : "Results Entered"}</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-foreground">{results?.length || 0}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{isTh ? "ปัญหาคุณภาพ" : "DQ Flags"}</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-primary">{dqFlags?.length || 0}</p></CardContent></Card>
      </div>

      {periods?.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <BarChart3 className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">{isTh ? "ยังไม่มีรอบรายงาน" : "No reporting periods yet"}</p>
            <p className="text-muted-foreground/60 text-sm mt-1">{isTh ? "สร้างรอบรายงานเพื่อเริ่มบันทึกผลตัวชี้วัด" : "Create a period to start entering indicator results"}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {periods?.map((p: any) => (
            <Card key={p.id} className="hover:bg-muted/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{p.period_label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{p.start_date} — {p.end_date} · {p.period_type}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${p.status === "submitted" ? "bg-green-500/10 text-green-600" : p.status === "closed" ? "bg-muted text-muted-foreground" : "bg-blue-500/10 text-blue-600"}`}>{p.status}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
