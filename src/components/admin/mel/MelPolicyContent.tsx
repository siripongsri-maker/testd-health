import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Landmark, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import MeetingDrawer from "./MeetingDrawer";
import EvidenceDrawer from "./EvidenceDrawer";
import MelDeleteDialog from "./MelDeleteDialog";
import MelSOPCard, { MEL_SOPS } from "./MelSOPCard";

export default function MelPolicyContent() {
  const { language } = useLanguage();
  const isTh = language === "th";
  const qc = useQueryClient();

  const [meetDrawerOpen, setMeetDrawerOpen] = useState(false);
  const [editMeeting, setEditMeeting] = useState<any>(null);
  const [evidDrawerOpen, setEvidDrawerOpen] = useState(false);
  const [editEvidence, setEditEvidence] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; table: string; label: string } | null>(null);

  const { data: meetings } = useQuery({
    queryKey: ["mel-meetings"],
    queryFn: async () => { const { data } = await supabase.from("engagement_meetings").select("*").order("meeting_date", { ascending: false }).limit(100); return data || []; },
  });

  const { data: evidence } = useQuery({
    queryKey: ["mel-evidence"],
    queryFn: async () => { const { data } = await supabase.from("policy_evidence_logs").select("*").order("evidence_date", { ascending: false }).limit(100); return data || []; },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, table }: { id: string; table: string }) => {
      const { error } = await supabase.from(table as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mel-meetings"] });
      qc.invalidateQueries({ queryKey: ["mel-evidence"] });
      toast({ title: isTh ? "ลบสำเร็จ" : "Deleted" });
    },
    onError: () => { toast({ title: isTh ? "ลบไม่สำเร็จ" : "Delete failed", variant: "destructive" }); },
  });

  const verifiedCount = evidence?.filter((e: any) => e.verified).length || 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">{isTh ? "นโยบายและความร่วมมือ" : "Policy & Engagement"}</h2>
        <p className="text-muted-foreground text-sm">{isTh ? "การประชุม หลักฐานอิทธิพลเชิงนโยบาย" : "Meetings, commitments & policy evidence"}</p>
      </div>

      <MelSOPCard {...MEL_SOPS.policy} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{isTh ? "การประชุม" : "Meetings"}</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-foreground">{meetings?.length || 0}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{isTh ? "หลักฐาน" : "Evidence"}</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-foreground">{evidence?.length || 0}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{isTh ? "ยืนยันแล้ว" : "Verified"}</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-foreground">{verifiedCount}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="meetings">
        <TabsList>
          <TabsTrigger value="meetings">{isTh ? "การประชุม" : "Meetings"} ({meetings?.length || 0})</TabsTrigger>
          <TabsTrigger value="evidence">{isTh ? "หลักฐาน" : "Evidence"} ({evidence?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="meetings" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button size="sm" className="gap-2" onClick={() => { setEditMeeting(null); setMeetDrawerOpen(true); }}><Plus className="h-4 w-4" />{isTh ? "เพิ่มประชุม" : "Add Meeting"}</Button>
          </div>
          {meetings?.length === 0 ? (
            <Card className="border-dashed"><CardContent className="flex flex-col items-center py-12"><Landmark className="h-12 w-12 text-muted-foreground/40 mb-4" /><p className="text-muted-foreground">{isTh ? "ยังไม่มีบันทึกการประชุม" : "No meetings logged"}</p></CardContent></Card>
          ) : meetings?.map((m: any) => (
            <Card key={m.id} className="hover:bg-muted/30 transition-colors"><CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="font-medium text-foreground">{isTh ? m.title_th : m.title_en || m.title_th || "Untitled"}</p>
                  <p className="text-xs text-muted-foreground mt-1">{format(new Date(m.meeting_date), "dd MMM yyyy")} · {m.meeting_type || "—"} · {m.location || "—"}</p>
                  {m.outcomes && <p className="text-xs text-muted-foreground mt-1">↳ {m.outcomes}</p>}
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditMeeting(m); setMeetDrawerOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget({ id: m.id, table: "engagement_meetings", label: isTh ? m.title_th : m.title_en })}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </CardContent></Card>
          ))}
        </TabsContent>

        <TabsContent value="evidence" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button size="sm" className="gap-2" onClick={() => { setEditEvidence(null); setEvidDrawerOpen(true); }}><Plus className="h-4 w-4" />{isTh ? "เพิ่มหลักฐาน" : "Add Evidence"}</Button>
          </div>
          {evidence?.length === 0 ? (
            <Card className="border-dashed"><CardContent className="flex flex-col items-center py-12"><Landmark className="h-12 w-12 text-muted-foreground/40 mb-4" /><p className="text-muted-foreground">{isTh ? "ยังไม่มีหลักฐาน" : "No evidence logged"}</p></CardContent></Card>
          ) : evidence?.map((e: any) => (
            <Card key={e.id} className="hover:bg-muted/30 transition-colors"><CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="font-medium text-foreground">{isTh ? e.title_th : e.title_en || e.title_th || "Untitled"}</p>
                  <p className="text-xs text-muted-foreground mt-1 capitalize">
                    {format(new Date(e.evidence_date), "dd MMM yyyy")} · {e.evidence_type?.replace(/_/g, " ")} · {e.impact_level || "—"}
                    {e.verified && " · ✓ Verified"}
                  </p>
                  {e.source_url && <a href={e.source_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-1 block truncate">{e.source_url}</a>}
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditEvidence(e); setEvidDrawerOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget({ id: e.id, table: "policy_evidence_logs", label: isTh ? e.title_th : e.title_en })}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </CardContent></Card>
          ))}
        </TabsContent>
      </Tabs>

      <MeetingDrawer key={editMeeting?.id || "new-m"} open={meetDrawerOpen} onOpenChange={setMeetDrawerOpen} editItem={editMeeting} />
      <EvidenceDrawer key={editEvidence?.id || "new-e"} open={evidDrawerOpen} onOpenChange={setEvidDrawerOpen} editItem={editEvidence} />
      <MelDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        onConfirm={() => { if (deleteTarget) { deleteMutation.mutate({ id: deleteTarget.id, table: deleteTarget.table }); setDeleteTarget(null); } }}
        itemLabel={deleteTarget?.label}
      />
    </div>
  );
}
