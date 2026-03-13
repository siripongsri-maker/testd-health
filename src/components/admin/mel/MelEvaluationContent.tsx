import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, FileSearch, Plus, AlertTriangle, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function MelEvaluationContent() {
  const { language } = useLanguage();
  const isTh = language === "th";

  const { data: keqs } = useQuery({
    queryKey: ["mel-keqs"],
    queryFn: async () => {
      const { data } = await supabase.from("evaluation_questions").select("*").order("display_order");
      return data || [];
    },
  });

  const { data: risks } = useQuery({
    queryKey: ["mel-eval-risks"],
    queryFn: async () => {
      const { data } = await supabase.from("evaluation_risks").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: timeline } = useQuery({
    queryKey: ["mel-timeline"],
    queryFn: async () => {
      const { data } = await supabase.from("mel_timeline_items").select("*").order("display_order");
      return data || [];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">{isTh ? "การประเมินผล" : "Evaluation Workspace"}</h2>
        <p className="text-muted-foreground text-sm">{isTh ? "KEQs, เมทริกซ์, ความเสี่ยง, และไทม์ไลน์" : "KEQs, matrix, risks & timeline"}</p>
      </div>

      <Tabs defaultValue="keqs">
        <TabsList>
          <TabsTrigger value="keqs">{isTh ? "คำถามหลัก" : "KEQs"}</TabsTrigger>
          <TabsTrigger value="risks">{isTh ? "ความเสี่ยง" : "Risks"}</TabsTrigger>
          <TabsTrigger value="timeline">{isTh ? "ไทม์ไลน์" : "Timeline"}</TabsTrigger>
        </TabsList>

        <TabsContent value="keqs" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button size="sm" className="gap-2"><Plus className="h-4 w-4" />{isTh ? "เพิ่ม KEQ" : "Add KEQ"}</Button>
          </div>
          {keqs?.length === 0 ? (
            <Card className="border-dashed"><CardContent className="flex flex-col items-center py-12"><FileSearch className="h-12 w-12 text-muted-foreground/40 mb-4" /><p className="text-muted-foreground">{isTh ? "ยังไม่มีคำถามหลัก" : "No KEQs defined yet"}</p></CardContent></Card>
          ) : keqs?.map((q: any) => (
            <Card key={q.id}><CardContent className="p-4">
              <p className="font-medium text-foreground">{q.question_text}</p>
              <p className="text-xs text-muted-foreground mt-1">{q.result_area} · {q.methodology || "—"}</p>
            </CardContent></Card>
          ))}
        </TabsContent>

        <TabsContent value="risks" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button size="sm" className="gap-2"><Plus className="h-4 w-4" />{isTh ? "เพิ่มความเสี่ยง" : "Add Risk"}</Button>
          </div>
          {risks?.length === 0 ? (
            <Card className="border-dashed"><CardContent className="flex flex-col items-center py-12"><AlertTriangle className="h-12 w-12 text-muted-foreground/40 mb-4" /><p className="text-muted-foreground">{isTh ? "ยังไม่มีความเสี่ยง" : "No risks logged"}</p></CardContent></Card>
          ) : risks?.map((r: any) => (
            <Card key={r.id}><CardContent className="p-4">
              <p className="font-medium text-foreground">{r.risk_description}</p>
              <p className="text-xs text-muted-foreground mt-1 capitalize">{r.risk_category} · L:{r.likelihood} I:{r.impact} · {r.status}</p>
            </CardContent></Card>
          ))}
        </TabsContent>

        <TabsContent value="timeline" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button size="sm" className="gap-2"><Plus className="h-4 w-4" />{isTh ? "เพิ่มกิจกรรม" : "Add Activity"}</Button>
          </div>
          {timeline?.length === 0 ? (
            <Card className="border-dashed"><CardContent className="flex flex-col items-center py-12"><Calendar className="h-12 w-12 text-muted-foreground/40 mb-4" /><p className="text-muted-foreground">{isTh ? "ยังไม่มีไทม์ไลน์" : "No timeline items"}</p></CardContent></Card>
          ) : timeline?.map((t: any) => (
            <Card key={t.id}><CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">{t.activity_name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t.start_date} — {t.end_date || "ongoing"} · {t.responsible || "—"}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${t.status === "completed" ? "bg-green-500/10 text-green-600" : t.status === "in_progress" ? "bg-blue-500/10 text-blue-600" : "bg-muted text-muted-foreground"}`}>{t.status}</span>
              </div>
            </CardContent></Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
