import { useLanguage } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trackEvent } from "@/hooks/useAnalytics";
import { useNavigate } from "react-router-dom";
import {
  Shield, HeartHandshake, Building2, Brain, TestTube,
  Pill, Sunrise, Phone, CalendarDays, ArrowRight,
} from "lucide-react";

interface Props {
  reasons: string[];
  distressLevel?: string;
  onAction: (action: string) => void;
}

interface ServiceRec {
  id: string;
  icon: React.ElementType;
  titleTh: string;
  titleEn: string;
  descTh: string;
  descEn: string;
  ctaTh: string;
  ctaEn: string;
  action: string;
  priority: number;
  urgencyBadge?: boolean;
  color: string;
}

const ALL_RECS: ServiceRec[] = [
  {
    id: "hr_counseling",
    icon: HeartHandshake,
    titleTh: "คำปรึกษาการลดอันตรายจากสาร",
    titleEn: "Harm Reduction Counseling",
    descTh: "ข้อมูล การวางแผน และการพูดคุยแบบไม่ตัดสิน เพื่อช่วยให้ดูแลตัวเองได้ปลอดภัยขึ้น",
    descEn: "Non-judgmental support for safer substance use, planning, and well-being",
    ctaTh: "นัดรับบริการ",
    ctaEn: "Book session",
    action: "book_counseling",
    priority: 2,
    color: "bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400",
  },
  {
    id: "swing_clinic",
    icon: Building2,
    titleTh: "SWING Clinic — ตรวจ / PrEP / PEP",
    titleEn: "SWING Clinic — Testing / PrEP / PEP",
    descTh: "ตรวจ HIV / STI, PrEP, PEP, คำปรึกษาสุขภาพทางเพศ",
    descEn: "HIV/STI testing, PrEP, PEP, sexual health consultation",
    ctaTh: "จองบริการ",
    ctaEn: "Book appointment",
    action: "book_clinic",
    priority: 3,
    color: "bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-400",
  },
  {
    id: "mental_health",
    icon: Brain,
    titleTh: "เช็กใจเบื้องต้น",
    titleEn: "Mental health check-in",
    descTh: "ไม่ใช่การวินิจฉัย แต่ช่วยแนะนำบริการที่เหมาะกับคุณ",
    descEn: "Not a diagnosis — helps recommend the right support for you",
    ctaTh: "เริ่มประเมิน",
    ctaEn: "Start check-in",
    action: "mental_health_screen",
    priority: 4,
    color: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400",
  },
  {
    id: "recovery",
    icon: Sunrise,
    titleTh: "โหมดฟื้นตัว",
    titleEn: "Recovery Mode",
    descTh: "เช็กลิสต์ดูแลตัวเองหลังใช้สาร น้ำ อาหาร พักผ่อน",
    descEn: "Post-use self-care: hydration, food, rest, grounding",
    ctaTh: "เริ่มโหมดฟื้นตัว",
    ctaEn: "Start recovery mode",
    action: "recovery_mode",
    priority: 5,
    color: "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400",
  },
  {
    id: "safer_plan",
    icon: Shield,
    titleTh: "วางแผนดูแลตัวเอง",
    titleEn: "Build a safer plan",
    descTh: "สร้างแผนปฏิบัติตามสถานการณ์ของคุณ",
    descEn: "Create an action plan based on your situation",
    ctaTh: "สร้างแผน",
    ctaEn: "Create plan",
    action: "safer_plan",
    priority: 6,
    color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400",
  },
  {
    id: "urgent_support",
    icon: Phone,
    titleTh: "ขอคำปรึกษาเร่งด่วน",
    titleEn: "Urgent support",
    descTh: "ติดต่อเจ้าหน้าที่ทันที หรือโทร 1323 / 1669",
    descEn: "Contact staff immediately or call 1323 / 1669",
    ctaTh: "ขอความช่วยเหลือ",
    ctaEn: "Get help now",
    action: "urgent_support",
    priority: 0,
    urgencyBadge: true,
    color: "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400",
  },
  {
    id: "callback",
    icon: Phone,
    titleTh: "ขอให้ติดต่อกลับ",
    titleEn: "Request callback",
    descTh: "เจ้าหน้าที่จะติดต่อกลับภายใน 24 ชม.",
    descEn: "Staff will contact you within 24 hours",
    ctaTh: "ขอ callback",
    ctaEn: "Request callback",
    action: "callback",
    priority: 7,
    color: "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400",
  },
];

/** Map reason → recommended service IDs */
const REASON_MAP: Record<string, string[]> = {
  safer_info: ["hr_counseling", "safer_plan"],
  health_check: ["swing_clinic", "mental_health", "hr_counseling"],
  talk_someone: ["hr_counseling", "callback", "mental_health"],
  clinic_support: ["swing_clinic", "hr_counseling"],
  after_use: ["recovery", "hr_counseling", "callback"],
  testing_prep_pep: ["swing_clinic"],
  mental_health: ["mental_health", "hr_counseling", "callback"],
};

export default function ServiceRecommendations({ reasons, distressLevel, onAction }: Props) {
  const { language } = useLanguage();
  const isEn = language === "en";
  const navigate = useNavigate();

  // Determine which services to show
  const recIds = new Set<string>();
  reasons.forEach((r) => {
    (REASON_MAP[r] || []).forEach((id) => recIds.add(id));
  });

  // Always add urgent if distress is elevated
  if (distressLevel === "high" || distressLevel === "severe") {
    recIds.add("urgent_support");
    recIds.add("hr_counseling");
  }

  // If nothing matched, show defaults
  if (recIds.size === 0) {
    recIds.add("hr_counseling");
    recIds.add("swing_clinic");
    recIds.add("safer_plan");
  }

  const recs = ALL_RECS
    .filter((r) => recIds.has(r.id))
    .sort((a, b) => a.priority - b.priority);

  const handleAction = (rec: ServiceRec) => {
    trackEvent("service_recommendation_accepted", { service: rec.id });
    if (rec.action === "book_clinic" || rec.action === "book_counseling") {
      navigate("/booking");
    } else {
      onAction(rec.action);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <h2 className="text-lg font-semibold text-foreground">
          {isEn ? "Recommended for you" : "แนะนำสำหรับคุณ"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {isEn
            ? "Based on what you shared, these services may help"
            : "จากข้อมูลที่คุณแชร์ บริการเหล่านี้อาจเหมาะกับคุณ"}
        </p>
      </div>

      <div className="grid gap-3">
        {recs.map((rec) => {
          const Icon = rec.icon;
          return (
            <Card key={rec.id} className="overflow-hidden border-border/60">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${rec.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">
                        {isEn ? rec.titleEn : rec.titleTh}
                      </h3>
                      {rec.urgencyBadge && (
                        <Badge variant="destructive" className="text-xs">
                          {isEn ? "Urgent" : "เร่งด่วน"}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {isEn ? rec.descEn : rec.descTh}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="w-full gap-2"
                  variant={rec.urgencyBadge ? "destructive" : "default"}
                  onClick={() => handleAction(rec)}
                >
                  {isEn ? rec.ctaEn : rec.ctaTh}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
