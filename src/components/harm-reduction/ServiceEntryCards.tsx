import { useLanguage } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { trackEvent } from "@/hooks/useAnalytics";
import {
  BookOpen, ClipboardCheck, Shield, HeartHandshake, Building2,
  Brain, TestTube, Pill, Phone, Sunrise, ChevronRight,
} from "lucide-react";

interface Props {
  onSelect: (reason: string) => void;
}

const REASONS = [
  {
    id: "safer_info",
    icon: BookOpen,
    thLabel: "ต้องการข้อมูลการใช้สารอย่างปลอดภัย",
    enLabel: "Safer substance use information",
    color: "bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400",
  },
  {
    id: "health_check",
    icon: ClipboardCheck,
    thLabel: "ประเมินสถานการณ์สุขภาพ",
    enLabel: "Health situation assessment",
    color: "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400",
  },
  {
    id: "talk_someone",
    icon: HeartHandshake,
    thLabel: "อยากพูดคุยกับผู้เชี่ยวชาญ",
    enLabel: "Talk to a counselor",
    color: "bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400",
  },
  {
    id: "clinic_support",
    icon: Building2,
    thLabel: "ต้องการบริการจากคลินิก",
    enLabel: "Clinic services",
    color: "bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-400",
  },
  {
    id: "after_use",
    icon: Sunrise,
    thLabel: "ต้องการดูแลตัวเองหลังใช้สาร",
    enLabel: "Recovery after substance use",
    color: "bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400",
  },
  {
    id: "testing_prep_pep",
    icon: TestTube,
    thLabel: "ต้องการตรวจ HIV / STI หรือ PrEP / PEP",
    enLabel: "HIV/STI testing or PrEP/PEP",
    color: "bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400",
  },
  {
    id: "mental_health",
    icon: Brain,
    thLabel: "เช็กสุขภาพจิตเบื้องต้น",
    enLabel: "Mental health check-in",
    color: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400",
  },
];

export default function ServiceEntryCards({ onSelect }: Props) {
  const { language } = useLanguage();
  const isEn = language === "en";

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <h2 className="text-lg font-semibold text-foreground">
          {isEn ? "What do you need today?" : "วันนี้คุณต้องการอะไร"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {isEn
            ? "Choose what fits your situation — you can select more than one"
            : "เลือกสิ่งที่ตรงกับสถานการณ์ของคุณ — เลือกได้มากกว่าหนึ่ง"}
        </p>
      </div>

      <div className="grid gap-2.5">
        {REASONS.map((reason) => {
          const Icon = reason.icon;
          return (
            <Card
              key={reason.id}
              className="cursor-pointer hover:shadow-md transition-all border-border/60 hover:border-primary/30"
              onClick={() => {
                trackEvent("service_entry_selected", { reason: reason.id });
                onSelect(reason.id);
              }}
            >
              <CardContent className="flex items-center gap-3.5 p-3.5">
                <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${reason.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium text-foreground flex-1">
                  {isEn ? reason.enLabel : reason.thLabel}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
