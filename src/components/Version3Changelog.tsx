import { useLanguage } from "@/lib/i18n";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sparkles, Shield, Heart, Rocket } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const sections = [
  {
    icon: Sparkles,
    titleTh: "ฟีเจอร์ใหม่",
    titleEn: "New Features",
    items: [
      { th: "Harm Reduction Hub ที่ปรับปรุงใหม่", en: "Improved Harm Reduction Hub" },
      { th: "หน้าบริการคลินิกที่ครบถ้วน", en: "Clinic Service Front Door" },
      { th: "ระบบ Counseling Workflow", en: "Counseling Workflow" },
      { th: "รายงาน MEL ที่ดีขึ้น", en: "MEL reporting improvements" },
      { th: "คำแนะนำความปลอดภัยแบบเฉพาะบุคคล", en: "Personalised safety recommendations" },
    ],
  },
  {
    icon: Shield,
    titleTh: "การปรับปรุงระบบ",
    titleEn: "System Improvements",
    items: [
      { th: "ประสิทธิภาพที่เร็วขึ้น", en: "Faster performance" },
      { th: "ความถูกต้องของข้อมูลที่ดีขึ้น", en: "Better data integrity" },
      { th: "การปกป้องความเป็นส่วนตัวที่ดีขึ้น", en: "Improved privacy protections" },
    ],
  },
  {
    icon: Heart,
    titleTh: "ชุมชน",
    titleEn: "Community Focus",
    items: [
      { th: "อัปเดตภาษาที่ครอบคลุม", en: "Inclusive language updates" },
      { th: "การเชื่อมต่อ SWING Clinic ที่ดีขึ้น", en: "Expanded SWING clinic integration" },
      { th: "เส้นทางการสนับสนุนที่ดีขึ้น", en: "Better support pathways" },
    ],
  },
];

export function Version3Changelog({ open, onOpenChange }: Props) {
  const { language } = useLanguage();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Rocket className="h-5 w-5 text-primary" />
            testD Version 3
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {sections.map((section, i) => {
            const Icon = section.icon;
            return (
              <div key={i}>
                <h3 className="font-semibold text-sm flex items-center gap-1.5 text-foreground mb-2">
                  <Icon className="h-4 w-4 text-primary" />
                  {language === "th" ? section.titleTh : section.titleEn}
                </h3>
                <ul className="space-y-1.5 pl-6">
                  {section.items.map((item, j) => (
                    <li key={j} className="text-sm text-muted-foreground list-disc">
                      {language === "th" ? item.th : item.en}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
