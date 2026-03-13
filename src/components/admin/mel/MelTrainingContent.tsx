import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, GraduationCap, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export default function MelTrainingContent() {
  const { language } = useLanguage();
  const isTh = language === "th";

  const { data: sessions, isLoading } = useQuery({
    queryKey: ["mel-training-sessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_sessions")
        .select("*, training_curricula(title_th, title_en)")
        .order("session_date", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{isTh ? "การฝึกอบรม" : "Training"}</h2>
          <p className="text-muted-foreground text-sm">{isTh ? "หลักสูตร การอบรม และผู้เข้าร่วม" : "Curricula, sessions & attendance"}</p>
        </div>
        <Button size="sm" className="gap-2"><Plus className="h-4 w-4" />{isTh ? "เพิ่มการอบรม" : "Add Session"}</Button>
      </div>

      {(!sessions || sessions.length === 0) ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <GraduationCap className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">{isTh ? "ยังไม่มีการอบรม" : "No training sessions yet"}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {sessions.map((s: any) => (
            <Card key={s.id} className="hover:bg-muted/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">
                      {isTh ? (s.session_title_th || s.training_curricula?.title_th) : (s.session_title_en || s.training_curricula?.title_en) || "Untitled"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(s.session_date), "dd MMM yyyy")} · {s.total_participants} {isTh ? "คน" : "participants"}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${s.status === "completed" ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"}`}>
                    {s.status}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
