import { useLanguage } from "@/lib/i18n";
import { useNavigate } from "react-router-dom";
import { APP_VERSION } from "@/config/appVersion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Rocket, Heart, Stethoscope, Zap, ShieldCheck, ArrowRight,
} from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const cards = [
  {
    icon: Heart,
    color: "text-rose-500",
    bg: "bg-rose-500/10",
    titleTh: "Harm Reduction ที่ดีขึ้น",
    titleEn: "Harm Reduction Redesign",
    descTh: "เส้นทางใหม่สำหรับการเรียนรู้ ตรวจสอบ วางแผน และรับการสนับสนุนอย่างปลอดภัย",
    descEn: "New pathways for learning, checking, planning, and getting support safely.",
  },
  {
    icon: Stethoscope,
    color: "text-primary",
    bg: "bg-primary/10",
    titleTh: "SWING Clinic เข้าถึงง่ายขึ้น",
    titleEn: "Better SWING Clinic Access",
    descTh: "หน้าบริการคลินิกที่ชัดเจนขึ้น พร้อมการจองและการส่งต่อที่ดีกว่าเดิม",
    descEn: "Clearer clinic services, improved booking, and better referral pathways.",
  },
  {
    icon: ShieldCheck,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    titleTh: "การสนับสนุนที่ฉลาดขึ้น",
    titleEn: "Smarter Support & Follow-up",
    descTh: "ระบบติดตามผลและคำแนะนำที่เหมาะกับคุณมากขึ้น",
    descEn: "Better follow-up tracking and personalised recommendations.",
  },
  {
    icon: Zap,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    titleTh: "ระบบเร็วและเสถียรขึ้น",
    titleEn: "Faster & More Reliable",
    descTh: "ประสิทธิภาพที่ดีขึ้น ข้อมูลที่แม่นยำขึ้น ความเป็นส่วนตัวที่แข็งแกร่งขึ้น",
    descEn: "Better performance, stronger data integrity, and improved privacy.",
  },
];

export function WhatsNewModal({ open, onOpenChange }: Props) {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const t = (th: string, en: string) => (language === "th" ? th : en);

  const handleViewFull = () => {
    onOpenChange(false);
    navigate("/whats-new");
    try {
      window.dispatchEvent(new CustomEvent("testd-analytics", { detail: { event: "release_cta_clicked", action: "view_full_notes" } }));
    } catch {}
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto p-0">
        {/* Header */}
        <div className="px-6 pt-6 pb-2">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold tracking-wide uppercase">
                v{APP_VERSION}
              </span>
            </div>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Rocket className="h-5 w-5 text-primary" />
              {t("มีอะไรใหม่ใน Version 3", "What's New in Version 3")}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mt-1">
            {t(
              "เราปรับปรุงระบบเพื่อให้คุณเข้าถึงบริการได้ง่ายและปลอดภัยยิ่งขึ้น",
              "We've improved the platform to make accessing care easier and safer."
            )}
          </p>
        </div>

        {/* Cards */}
        <div className="px-6 py-4 space-y-3">
          {cards.map((card, i) => {
            const Icon = card.icon;
            return (
              <div
                key={i}
                className="flex gap-3 p-3 rounded-xl border border-border/30 bg-muted/30"
              >
                <div className={`shrink-0 p-2 rounded-lg ${card.bg} self-start`}>
                  <Icon className={`h-4 w-4 ${card.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {t(card.titleTh, card.titleEn)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {t(card.descTh, card.descEn)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full rounded-xl justify-between"
            onClick={handleViewFull}
          >
            {t("ดู Release Notes ทั้งหมด", "Read Full Release Notes")}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
          <Button
            className="w-full rounded-xl font-semibold"
            onClick={() => onOpenChange(false)}
          >
            {t("เข้าใจแล้ว ดำเนินการต่อ", "Got it, Continue")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
