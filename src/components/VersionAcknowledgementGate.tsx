import { useState, useEffect, useCallback } from "react";
import { APP_VERSION } from "@/config/appVersion";
import { Button } from "@/components/ui/button";
import { Rocket, Heart, Stethoscope, Zap } from "lucide-react";

const ACK_KEY = "testd_acknowledged_version";

function dispatchAnalytics(event: string) {
  try {
    window.dispatchEvent(new CustomEvent("testd-analytics", { detail: { event, version: APP_VERSION } }));
  } catch {}
}

const highlights = [
  {
    icon: Heart,
    color: "text-rose-500",
    bg: "bg-rose-500/10",
    th: "การสนับสนุน Harm Reduction ที่ดีขึ้น",
    en: "Better harm reduction support",
  },
  {
    icon: Stethoscope,
    color: "text-primary",
    bg: "bg-primary/10",
    th: "เข้าถึง SWING Clinic ได้ง่ายขึ้น",
    en: "Improved SWING Clinic access",
  },
  {
    icon: Zap,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    th: "ระบบที่เร็วและเสถียรกว่าเดิม",
    en: "Faster and more reliable system",
  },
];

interface Props {
  onOpenWhatsNew: () => void;
}

export function VersionAcknowledgementGate({ onOpenWhatsNew }: Props) {
  const [show, setShow] = useState(false);
  const [lang, setLang] = useState<string>("th");

  useEffect(() => {
    setLang(localStorage.getItem("testd-language") || "th");
    const acked = localStorage.getItem(ACK_KEY);
    if (acked !== APP_VERSION) {
      setShow(true);
      dispatchAnalytics("version_acknowledgement_shown");
    }
  }, []);

  const handleContinue = useCallback(() => {
    localStorage.setItem(ACK_KEY, APP_VERSION);
    dispatchAnalytics("version_acknowledgement_completed");
    setShow(false);
  }, []);

  const handleWhatsNew = useCallback(() => {
    dispatchAnalytics("release_cta_clicked");
    onOpenWhatsNew();
  }, [onOpenWhatsNew]);

  if (!show) return null;

  const t = (th: string, en: string) => (lang === "th" ? th : en);

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-background p-4">
      <div className="max-w-sm w-full text-center space-y-6">
        {/* Icon */}
        <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/30 flex items-center justify-center">
          <Rocket className="h-8 w-8 text-primary" />
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            {t("ยินดีต้อนรับสู่ testD เวอร์ชัน 3", "Welcome to testD Version 3")}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed px-2">
            {t(
              "เราได้ปรับปรุงระบบเพื่อให้ใช้งานได้ปลอดภัยขึ้น ใช้ง่ายขึ้น และเชื่อมต่อบริการได้ดีขึ้น",
              "We've improved the platform to make it safer, easier to use, and better connected to care and support."
            )}
          </p>
        </div>

        {/* Highlights */}
        <div className="space-y-2">
          {highlights.map((h, i) => {
            const Icon = h.icon;
            return (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border/30 bg-card/60 text-left"
              >
                <div className={`shrink-0 p-2 rounded-lg ${h.bg}`}>
                  <Icon className={`h-4 w-4 ${h.color}`} />
                </div>
                <p className="text-sm font-medium text-foreground">
                  {t(h.th, h.en)}
                </p>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-2">
          <Button
            variant="outline"
            className="w-full rounded-xl"
            onClick={handleWhatsNew}
          >
            {t("ดูว่ามีอะไรใหม่", "View What's New")}
          </Button>
          <Button
            className="w-full rounded-xl font-semibold h-12 text-base"
            onClick={handleContinue}
          >
            {t("เข้าใจแล้ว ดำเนินการต่อ", "I Understand, Continue")}
          </Button>
        </div>
      </div>
    </div>
  );
}
