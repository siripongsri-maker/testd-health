import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, GraduationCap, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import TrainingSessionDrawer from "./TrainingSessionDrawer";
import MelDeleteDialog from "./MelDeleteDialog";
import MelSOPCard, { MEL_SOPS } from "./MelSOPCard";

export default function MelTrainingContent() {
  const { language } = useLanguage();
  const isTh = language === "th";
  const qc = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editSession, setEditSession] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const { data: sessions, isLoading } = useQuery({
    queryKey: ["mel-training-sessions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("training_sessions").select("*, training_curricula(title_th, title_en)").order("session_date", { ascending: false }).limit(100);
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("training_sessions").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mel-training-sessions"] }); toast({ title: isTh ? "ลบสำเร็จ" : "Deleted" }); },
    onError: () => { toast({ title: isTh ? "ลบไม่สำเร็จ" : "Delete failed", variant: "destructive" }); },
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const totalParticipants = sessions?.reduce((sum: number, s: any) => sum + (s.total_participants || 0), 0) || 0;
  const completedCount = sessions?.filter((s: any) => s.status === "completed").length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{isTh ? "การฝึกอบรม" : "Training"}</h2>
          <p className="text-muted-foreground text-sm">{isTh ? "หลักสูตร การอบรม และผู้เข้าร่วม" : "Curricula, sessions & attendance"}</p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => { setEditSession(null); setDrawerOpen(true); }}><Plus className="h-4 w-4" />{isTh ? "เพิ่มการอบรม" : "Add Session"}</Button>
      </div>

      <MelSOPCard {...MEL_SOPS.training} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{isTh ? "การอบรมทั้งหมด" : "Total Sessions"}</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-foreground">{sessions?.length || 0}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{isTh ? "เสร็จสิ้น" : "Completed"}</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-foreground">{completedCount}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{isTh ? "ผู้เข้าร่วมรวม" : "Total Participants"}</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-foreground">{totalParticipants}</p></CardContent></Card>
      </div>

      {(!sessions || sessions.length === 0) ? (
        <Card className="border-dashed"><CardContent className="flex flex-col items-center justify-center py-12 text-center"><GraduationCap className="h-12 w-12 text-muted-foreground/40 mb-4" /><p className="text-muted-foreground">{isTh ? "ยังไม่มีการอบรม" : "No training sessions yet"}</p></CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {sessions.map((s: any) => (
            <Card key={s.id} className="hover:bg-muted/30 transition-colors"><CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-foreground">{isTh ? (s.session_title_th || s.training_curricula?.title_th) : (s.session_title_en || s.training_curricula?.title_en) || "Untitled"}</p>
                  <p className="text-xs text-muted-foreground mt-1">{format(new Date(s.session_date), "dd MMM yyyy")} · {s.total_participants || 0} {isTh ? "คน" : "participants"}{s.location && ` · ${s.location}`}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${s.status === "completed" ? "bg-green-500/10 text-green-600" : s.status === "in_progress" ? "bg-blue-500/10 text-blue-600" : "bg-muted text-muted-foreground"}`}>{s.status}</span>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditSession(s); setDrawerOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(s)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </CardContent></Card>
          ))}
        </div>
      )}

      <TrainingSessionDrawer key={editSession?.id || "new"} open={drawerOpen} onOpenChange={setDrawerOpen} editSession={editSession} />
      <MelDeleteDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }} onConfirm={() => { if (deleteTarget) { deleteMutation.mutate(deleteTarget.id); setDeleteTarget(null); } }} itemLabel={isTh ? deleteTarget?.session_title_th : deleteTarget?.session_title_en} />
    </div>
  );
}
