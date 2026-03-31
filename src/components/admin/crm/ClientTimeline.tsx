
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Calendar, Stethoscope, MessageSquare, ClipboardList, Package, StickyNote, Loader2 } from "lucide-react";
import { format } from "date-fns";
import CaseNoteForm from "./CaseNoteForm";
import FollowUpTracker from "./FollowUpTracker";

interface TimelineEntry {
  date: string;
  type: "appointment" | "service_event" | "counseling" | "followup" | "feedback" | "case_note" | "selftest";
  icon: React.ElementType;
  title: string;
  detail: string;
  status?: string;
}

interface ClientTimelineProps {
  clientId: string;
  onBack: () => void;
}

export default function ClientTimeline({ clientId, onBack }: ClientTimelineProps) {
  const { language } = useLanguage();

  const { data: profile } = useQuery({
    queryKey: ["crm-profile", clientId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, display_name, created_at").eq("id", clientId).single();
      return data;
    },
  });

  const { data: timeline, isLoading, refetch } = useQuery({
    queryKey: ["crm-timeline", clientId],
    queryFn: async () => {
      const entries: TimelineEntry[] = [];

      // Appointments
      const { data: appts } = await supabase
        .from("appointments")
        .select("id, appointment_date, status, branch_id, service_id, notes")
        .eq("user_id", clientId)
        .order("appointment_date", { ascending: false })
        .limit(50);

      appts?.forEach((a) => {
        entries.push({
          date: a.appointment_date,
          type: "appointment",
          icon: Calendar,
          title: language === "th" ? "นัดหมาย" : "Appointment",
          detail: `${format(new Date(a.appointment_date), "dd/MM/yyyy")}${a.notes ? ` — ${a.notes}` : ""}`,
          status: a.status,
        });
      });

      // Service events (service_date, not event_date)
      const { data: events } = await supabase
        .from("service_events")
        .select("id, service_date, event_type, outcome, description_en")
        .eq("user_id", clientId)
        .order("service_date", { ascending: false })
        .limit(50);

      events?.forEach((e) => {
        entries.push({
          date: e.service_date,
          type: "service_event",
          icon: Stethoscope,
          title: e.event_type || (language === "th" ? "บริการ" : "Service"),
          detail: e.outcome || e.description_en || "",
          status: e.outcome,
        });
      });

      // Counseling sessions (created_at as date, guidance_notes as summary)
      const { data: sessions } = await supabase
        .from("counseling_sessions")
        .select("id, created_at, session_type, session_outcome, guidance_notes")
        .eq("user_id", clientId)
        .order("created_at", { ascending: false })
        .limit(50);

      sessions?.forEach((s) => {
        entries.push({
          date: s.created_at,
          type: "counseling",
          icon: MessageSquare,
          title: language === "th" ? "ให้คำปรึกษา" : "Counseling",
          detail: s.guidance_notes || s.session_outcome || s.session_type || "",
        });
      });

      // Feedback
      const { data: feedback } = await supabase
        .from("client_feedback_responses")
        .select("id, service_date, satisfaction_score, status")
        .eq("user_id", clientId)
        .order("service_date", { ascending: false })
        .limit(50);

      feedback?.forEach((f) => {
        entries.push({
          date: f.service_date,
          type: "feedback",
          icon: ClipboardList,
          title: language === "th" ? "แบบประเมิน" : "Feedback",
          detail: f.satisfaction_score ? `Score: ${f.satisfaction_score}/5` : f.status,
        });
      });

      // HIV self-test requests (hiv_selftest_requests, delivery_mode)
      const { data: selftests } = await supabase
        .from("hiv_selftest_requests")
        .select("id, created_at, delivery_mode, status")
        .eq("user_id", clientId)
        .order("created_at", { ascending: false })
        .limit(50);

      selftests?.forEach((s) => {
        entries.push({
          date: s.created_at,
          type: "selftest",
          icon: Package,
          title: language === "th" ? "ชุดตรวจ" : "Self-test Kit",
          detail: `${s.delivery_mode || "—"} — ${s.status}`,
          status: s.status,
        });
      });

      // Case notes (table may not be in generated types yet, use any)
      try {
        const { data: notes } = await (supabase as any)
          .from("case_notes")
          .select("id, created_at, note_type, content, is_sensitive")
          .eq("client_id", clientId)
          .order("created_at", { ascending: false })
          .limit(50);

        (notes || []).forEach((n: any) => {
          entries.push({
            date: n.created_at,
            type: "case_note",
            icon: StickyNote,
            title: `${language === "th" ? "บันทึก" : "Note"}: ${n.note_type}`,
            detail: n.is_sensitive ? (language === "th" ? "[ข้อมูลอ่อนไหว]" : "[Sensitive]") : n.content,
          });
        });
      } catch {}

      entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return entries;
    },
  });

  const typeColors: Record<string, string> = {
    appointment: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    service_event: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    counseling: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    followup: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    feedback: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    case_note: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
    selftest: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-xl font-semibold">{profile?.display_name || "Client"}</h2>
          <p className="text-sm text-muted-foreground">
            {language === "th" ? "ลงทะเบียนเมื่อ" : "Registered"}{" "}
            {profile?.created_at ? format(new Date(profile.created_at), "dd/MM/yyyy") : "—"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <CaseNoteForm clientId={clientId} onSaved={refetch} />

          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-3">
              {timeline?.map((entry, i) => (
                <Card key={i} className="border-l-4 border-l-primary/30">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <entry.icon className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{entry.title}</span>
                          <Badge className={`text-[10px] ${typeColors[entry.type]}`} variant="secondary">
                            {entry.type.replace("_", " ")}
                          </Badge>
                          {entry.status && (
                            <Badge variant="outline" className="text-[10px]">{entry.status}</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 break-words">{entry.detail}</p>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          {format(new Date(entry.date), "dd/MM/yyyy HH:mm")}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {timeline?.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  {language === "th" ? "ไม่มีข้อมูลกิจกรรม" : "No activity found"}
                </p>
              )}
            </div>
          )}
        </div>

        <div>
          <FollowUpTracker clientId={clientId} />
        </div>
      </div>
    </div>
  );
}
