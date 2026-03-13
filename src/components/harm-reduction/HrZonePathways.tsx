import { useLanguage } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { trackEvent } from "@/hooks/useAnalytics";
import {
  BookOpen, ClipboardCheck, Shield, HeartHandshake, Building2,
  ChevronRight,
} from "lucide-react";

interface Props {
  onNavigate: (section: string) => void;
}

export default function HrZonePathways({ onNavigate }: Props) {
  const { language } = useLanguage();
  const isEn = language === "en";

  const pathways = [
    {
      id: "learn",
      icon: BookOpen,
      titleTh: "เรียนรู้",
      titleEn: "Learn",
      descTh: "ข้อมูลสาร ปฏิกิริยาข้ามสาร เคล็ดลับความปลอดภัย",
      descEn: "Substance info, mix risk checker, safety tips",
      gradient: "from-sky-500/10 to-blue-500/5",
      iconColor: "bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400",
    },
    {
      id: "check",
      icon: ClipboardCheck,
      titleTh: "ประเมินสุขภาพ",
      titleEn: "Health self-check",
      descTh: "ประเมินสถานการณ์สุขภาพและสุขภาพจิต ใช้เวลาแค่ 3 นาที",
      descEn: "Health & mental wellness self-check — only 3 min",
      gradient: "from-amber-500/10 to-orange-500/5",
      iconColor: "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400",
    },
    {
      id: "plan",
      icon: Shield,
      titleTh: "วางแผนให้ปลอดภัย",
      titleEn: "Build a safer plan",
      descTh: "แผนปฏิบัติ การตั้งเตือน โหมดฟื้นตัว",
      descEn: "Action plans, reminders, recovery mode",
      gradient: "from-emerald-500/10 to-teal-500/5",
      iconColor: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400",
    },
    {
      id: "support",
      icon: HeartHandshake,
      titleTh: "ขอคำปรึกษา หรือการสนับสนุน",
      titleEn: "Get counseling or support",
      descTh: "ปรึกษาผู้เชี่ยวชาญ ขอ callback หรือการสนับสนุนเร่งด่วน",
      descEn: "Counseling, callback, or urgent support",
      gradient: "from-rose-500/10 to-pink-500/5",
      iconColor: "bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400",
    },
    {
      id: "clinic",
      icon: Building2,
      titleTh: "SWING Clinic",
      titleEn: "SWING Clinic",
      descTh: "ตรวจ HIV/STI, PrEP, PEP, ให้คำปรึกษา, จองนัด",
      descEn: "HIV/STI testing, PrEP, PEP, counseling, booking",
      gradient: "from-violet-500/10 to-purple-500/5",
      iconColor: "bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400",
    },
  ];

  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-foreground px-0.5">
        {isEn ? "What do you need today?" : "วันนี้ต้องการอะไร?"}
      </h2>

      <div className="space-y-2.5">
        {pathways.map((path) => {
          const Icon = path.icon;
          return (
            <Card
              key={path.id}
              className="overflow-hidden cursor-pointer hover:shadow-lg transition-all active:scale-[0.98] border border-border/40"
              onClick={() => {
                trackEvent("hr_pathway_click", { pathway: path.id });
                onNavigate(path.id);
              }}
            >
              <CardContent className={`p-0`}>
                <div className={`bg-gradient-to-r ${path.gradient} p-4 flex items-center gap-4`}>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${path.iconColor}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-[15px]">
                      {isEn ? path.titleEn : path.titleTh}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {isEn ? path.descEn : path.descTh}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground/40 shrink-0" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
