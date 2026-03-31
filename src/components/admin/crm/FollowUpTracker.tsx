
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle, Loader2 } from "lucide-react";
import { format, isPast, isToday } from "date-fns";

interface FollowUpTrackerProps {
  clientId: string;
}

export default function FollowUpTracker({ clientId }: FollowUpTrackerProps) {
  const { language } = useLanguage();

  const { data: followups, isLoading } = useQuery({
    queryKey: ["crm-followups", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("followup_events")
        .select("id, scheduled_at, status, followup_type, notes")
        .eq("user_id", clientId)
        .order("scheduled_at", { ascending: true });
      return data || [];
    },
  });

  const pending = followups?.filter((f) => f.status === "pending") || [];
  const completed = followups?.filter((f) => f.status !== "pending") || [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="h-4 w-4" />
          {language === "th" ? "การติดตาม" : "Follow-ups"}
          {pending.length > 0 && (
            <Badge variant="destructive" className="text-xs">{pending.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : (
          <div className="space-y-3">
            {pending.length === 0 && completed.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                {language === "th" ? "ไม่มีรายการติดตาม" : "No follow-ups"}
              </p>
            )}

            {pending.map((f) => {
              const overdue = f.scheduled_at && isPast(new Date(f.scheduled_at)) && !isToday(new Date(f.scheduled_at));
              return (
                <div
                  key={f.id}
                  className={`p-3 rounded-lg border text-sm ${overdue ? "border-destructive/50 bg-destructive/5" : "border-border"}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {overdue && <AlertTriangle className="h-3 w-3 text-destructive" />}
                    <span className="font-medium">{f.followup_type || (language === "th" ? "ติดตาม" : "Follow-up")}</span>
                    {overdue && (
                      <Badge variant="destructive" className="text-[10px]">
                        {language === "th" ? "เลยกำหนด" : "Overdue"}
                      </Badge>
                    )}
                  </div>
                  {f.scheduled_at && (
                    <p className="text-xs text-muted-foreground">
                      {language === "th" ? "กำหนด" : "Due"}: {format(new Date(f.scheduled_at), "dd/MM/yyyy")}
                    </p>
                  )}
                  {f.notes && <p className="text-xs mt-1 text-muted-foreground">{f.notes}</p>}
                </div>
              );
            })}

            {completed.length > 0 && (
              <div className="pt-2 border-t">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  {language === "th" ? "เสร็จสิ้นแล้ว" : "Completed"} ({completed.length})
                </p>
                {completed.slice(0, 3).map((f) => (
                  <div key={f.id} className="text-xs text-muted-foreground py-1">
                    {f.followup_type} — {f.scheduled_at ? format(new Date(f.scheduled_at), "dd/MM/yyyy") : ""} ✓
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
