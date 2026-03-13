import { useLanguage } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { trackEvent } from "@/hooks/useAnalytics";
import { recordServiceEvent } from "@/lib/servicePathway";
import {
  TestTube, Pill, Shield, Brain, HeartHandshake,
  Building2, Stethoscope, Package, ChevronRight,
} from "lucide-react";

interface Props {
  userId?: string;
  pathwayId?: string | null;
}

const CLINIC_SERVICES = [
  {
    id: "hiv_test",
    icon: TestTube,
    titleTh: "ตรวจ HIV",
    titleEn: "HIV Testing",
    descTh: "ตรวจ HIV ฟรี ผลเร็ว ปลอดภัย เป็นความลับ",
    descEn: "Free, fast, safe, and confidential HIV testing",
    color: "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400",
  },
  {
    id: "sti_test",
    icon: Stethoscope,
    titleTh: "ตรวจ STI",
    titleEn: "STI Screening",
    descTh: "ตรวจโรคติดต่อทางเพศสัมพันธ์",
    descEn: "Screening for sexually transmitted infections",
    color: "bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400",
  },
  {
    id: "prep",
    icon: Pill,
    titleTh: "PrEP — ป้องกันก่อนสัมผัสเชื้อ",
    titleEn: "PrEP — Pre-exposure prophylaxis",
    descTh: "ยาป้องกัน HIV สำหรับผู้ที่อาจสัมผัสเชื้อ",
    descEn: "HIV prevention medicine for those who may be exposed",
    color: "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400",
  },
  {
    id: "pep",
    icon: Shield,
    titleTh: "PEP — ป้องกันหลังสัมผัสเชื้อ",
    titleEn: "PEP — Post-exposure prophylaxis",
    descTh: "ยาป้องกัน HIV หลังสัมผัสเชื้อ ต้องเริ่มภายใน 72 ชม.",
    descEn: "HIV prevention after exposure — must start within 72 hours",
    color: "bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400",
  },
  {
    id: "hr_counseling",
    icon: HeartHandshake,
    titleTh: "คำปรึกษาการลดอันตรายจากสาร",
    titleEn: "Harm Reduction Counseling",
    descTh: "พูดคุยแบบไม่ตัดสิน เพื่อช่วยวางแผนดูแลตัวเอง",
    descEn: "Non-judgmental support for safer practices and well-being",
    color: "bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400",
  },
  {
    id: "mental_health",
    icon: Brain,
    titleTh: "สนับสนุนสุขภาพจิต",
    titleEn: "Mental Health Support",
    descTh: "ประเมินและปรึกษาเบื้องต้น ส่งต่อเมื่อจำเป็น",
    descEn: "Initial assessment and counseling, referral when needed",
    color: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400",
  },
  {
    id: "self_test",
    icon: Package,
    titleTh: "ชุดตรวจ HIV ด้วยตัวเอง",
    titleEn: "HIV Self-test Kit",
    descTh: "สั่งชุดตรวจส่งถึงบ้าน",
    descEn: "Order a test kit delivered to your home",
    color: "bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-400",
  },
];

export default function ClinicServiceDoor({ userId, pathwayId }: Props) {
  const { language } = useLanguage();
  const isEn = language === "en";
  const navigate = useNavigate();

  const handleServiceClick = (serviceId: string) => {
    trackEvent("clinic_service_selected", { service: serviceId });

    if (pathwayId) {
      recordServiceEvent(pathwayId, "swing_clinic_booking_started", userId, {
        service_category: serviceId as any,
      });
    }

    if (serviceId === "self_test") {
      navigate("/hiv-selftest");
    } else {
      navigate("/booking");
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">
            {isEn ? "SWING Clinic Services" : "บริการ SWING Clinic"}
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {isEn
            ? "All services are confidential and non-judgmental"
            : "ทุกบริการเป็นความลับและไม่ตัดสิน"}
        </p>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        {CLINIC_SERVICES.map((svc) => {
          const Icon = svc.icon;
          return (
            <Card
              key={svc.id}
              className="cursor-pointer hover:shadow-md transition-all border-border/60 hover:border-primary/30"
              onClick={() => handleServiceClick(svc.id)}
            >
              <CardContent className="p-3.5 space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${svc.color}`}>
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground flex-1">
                    {isEn ? svc.titleEn : svc.titleTh}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {isEn ? svc.descEn : svc.descTh}
                </p>
                <div className="flex justify-end">
                  <Button variant="ghost" size="sm" className="text-xs gap-1 text-primary h-7 px-2">
                    {isEn ? "Book" : "นัดหมาย"}
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
