import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getServiceTimeline } from "@/lib/servicePathway";
import {
  ClipboardCheck, Shield, HeartHandshake, Building2, Brain,
  Sunrise, Phone, Calendar, CheckCircle2, Clock, AlertCircle,
} from "lucide-react";
import { format } from "date-fns";

interface Props {
  userId: string;
}

const EVENT_ICONS: Record<string, React.ElementType> = {
  hr_screening_started: ClipboardCheck,
  hr_screening_completed: CheckCircle2,
  hr_counseling_requested: HeartHandshake,
  swing_clinic_booking_started: Building2,
  swing_clinic_booking_completed: Building2,
  mental_health_screen_completed: Brain,
  callback_requested: Phone,
  recovery_mode_activated: Sunrise,
  followup_completed: Calendar,
  safer_plan_created: Shield,
  referral_accepted: CheckCircle2,
  referral_declined: AlertCircle,
};

const EVENT_LABELS: Record<string, { en: string; th: string }> = {
  hr_screening_started: { en: "Health screening started", th: "เริ่มการประเมินสุขภาพ" },
  hr_screening_completed: { en: "Health screening completed", th: "ประเมินสุขภาพเสร็จสิ้น" },
  hr_counseling_requested: { en: "Counseling requested", th: "ขอคำปรึกษา" },
  swing_clinic_booking_started: { en: "Clinic booking started", th: "เริ่มจองบริการคลินิก" },
  swing_clinic_booking_completed: { en: "Clinic booking confirmed", th: "จองบริการคลินิกสำเร็จ" },
  mental_health_screen_completed: { en: "Mental health check-in done", th: "เช็กสุขภาพจิตเสร็จสิ้น" },
  callback_requested: { en: "Callback requested", th: "ขอให้ติดต่อกลับ" },
  recovery_mode_activated: { en: "Recovery mode activated", th: "เปิดโหมดฟื้นตัว" },
  followup_completed: { en: "Follow-up completed", th: "ติดตามผลเสร็จสิ้น" },
  safer_plan_created: { en: "Safer plan created", th: "สร้างแผนดูแลตัวเอง" },
  referral_accepted: { en: "Referral accepted", th: "รับการส่งต่อ" },
  referral_declined: { en: "Referral declined", th: "ปฏิเสธการส่งต่อ" },
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  overdue: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  missed: "bg-muted text-muted-foreground",
};

export default function ServiceTimeline({ userId }: Props) {
  const { language } = useLanguage();
  const isEn = language === "en";
  const [timeline, setTimeline] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getServiceTimeline(userId).then((data) => {
      setTimeline(data);
      setLoading(false);
    });
  }, [userId]);

  if (loading) return null;

  const events = timeline?.events || [];
  const followups = timeline?.followups || [];
  const hasData = events.length > 0 || followups.length > 0;

  if (!hasData) return null;

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          {isEn ? "Your service timeline" : "ไทม์ไลน์บริการของคุณ"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 pb-4">
        {/* Follow-ups due */}
        {followups.filter((f: any) => f.status === "pending").map((f: any) => (
          <div key={f.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-800/30">
            <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground">
                {isEn ? `Follow-up: ${f.followup_type?.replace(/_/g, " ")}` : `ติดตามผล: ${f.followup_type?.replace(/_/g, " ")}`}
              </p>
              <p className="text-xs text-muted-foreground">
                {isEn ? `Due: ${format(new Date(f.due_date), "dd MMM yyyy")}` : `กำหนด: ${format(new Date(f.due_date), "dd MMM yyyy")}`}
              </p>
            </div>
            <Badge className={STATUS_COLORS.pending} variant="secondary">
              {isEn ? "Pending" : "รอดำเนินการ"}
            </Badge>
          </div>
        ))}

        {/* Service events */}
        <div className="relative ml-3 border-l-2 border-muted pl-4 space-y-3 pt-2">
          {events.slice(0, 8).map((ev: any) => {
            const Icon = EVENT_ICONS[ev.event_type] || ClipboardCheck;
            const labels = EVENT_LABELS[ev.event_type] || { en: ev.event_type?.replace(/_/g, " "), th: ev.event_type?.replace(/_/g, " ") };
            return (
              <div key={ev.id} className="relative flex items-start gap-2.5">
                <div className="absolute -left-[1.35rem] w-3 h-3 rounded-full bg-primary/20 border-2 border-primary" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    {isEn ? labels.en : labels.th}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {format(new Date(ev.service_date || ev.created_at), "dd MMM yyyy")}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
