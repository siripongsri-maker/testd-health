import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Landmark, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

export default function MelPolicyContent() {
  const { language } = useLanguage();
  const isTh = language === "th";

  const { data: meetings } = useQuery({
    queryKey: ["mel-meetings"],
    queryFn: async () => {
      const { data } = await supabase.from("engagement_meetings").select("*").order("meeting_date", { ascending: false }).limit(50);
      return data || [];
    },
  });

  const { data: evidence } = useQuery({
    queryKey: ["mel-evidence"],
    queryFn: async () => {
      const { data } = await supabase.from("policy_evidence_logs").select("*").order("evidence_date", { ascending: false }).limit(50);
      return data || [];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">{isTh ? "นโยบายและความร่วมมือ" : "Policy & Engagement"}</h2>
        <p className="text-muted-foreground text-sm">{isTh ? "การประชุม หลักฐานอิทธิพลเชิงนโยบาย" : "Meetings, commitments & policy evidence"}</p>
      </div>

      <Tabs defaultValue="meetings">
        <TabsList>
          <TabsTrigger value="meetings">{isTh ? "การประชุม" : "Meetings"}</TabsTrigger>
          <TabsTrigger value="evidence">{isTh ? "หลักฐาน" : "Evidence"}</TabsTrigger>
        </TabsList>

        <TabsContent value="meetings" className="mt-4 space-y-3">
          <div className="flex justify-end"><Button size="sm" className="gap-2"><Plus className="h-4 w-4" />{isTh ? "เพิ่มประชุม" : "Add Meeting"}</Button></div>
          {meetings?.length === 0 ? (
            <Card className="border-dashed"><CardContent className="flex flex-col items-center py-12"><Landmark className="h-12 w-12 text-muted-foreground/40 mb-4" /><p className="text-muted-foreground">{isTh ? "ยังไม่มีบันทึกการประชุม" : "No meetings logged"}</p></CardContent></Card>
          ) : meetings?.map((m: any) => (
            <Card key={m.id} className="hover:bg-muted/30 transition-colors"><CardContent className="p-4">
              <p className="font-medium text-foreground">{isTh ? m.title_th : m.title_en || m.title_th || "Untitled"}</p>
              <p className="text-xs text-muted-foreground mt-1">{format(new Date(m.meeting_date), "dd MMM yyyy")} · {m.meeting_type} · {m.location || "—"}</p>
            </CardContent></Card>
          ))}
        </TabsContent>

        <TabsContent value="evidence" className="mt-4 space-y-3">
          <div className="flex justify-end"><Button size="sm" className="gap-2"><Plus className="h-4 w-4" />{isTh ? "เพิ่มหลักฐาน" : "Add Evidence"}</Button></div>
          {evidence?.length === 0 ? (
            <Card className="border-dashed"><CardContent className="flex flex-col items-center py-12"><Landmark className="h-12 w-12 text-muted-foreground/40 mb-4" /><p className="text-muted-foreground">{isTh ? "ยังไม่มีหลักฐาน" : "No evidence logged"}</p></CardContent></Card>
          ) : evidence?.map((e: any) => (
            <Card key={e.id}><CardContent className="p-4">
              <p className="font-medium text-foreground">{isTh ? e.title_th : e.title_en || e.title_th || "Untitled"}</p>
              <p className="text-xs text-muted-foreground mt-1 capitalize">{e.evidence_type?.replace(/_/g, " ")} · {e.impact_level} · {e.verified ? "✓ Verified" : "Unverified"}</p>
            </CardContent></Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
