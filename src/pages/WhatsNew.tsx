import { openSupportChat } from "@/lib/openSupportChat";
import { useLanguage } from "@/lib/i18n";
import { APP_VERSION } from "@/config/appVersion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SEOHead } from "@/components/seo/SEOHead";
import {
  Rocket, Shield, Heart, Zap, Stethoscope, BarChart3,
  ArrowRight, Phone, MessageCircle, ChevronRight,
} from "lucide-react";

const categories = [
  {
    icon: Heart,
    color: "text-rose-500",
    bg: "bg-rose-500/10",
    titleTh: "Harm Reduction ที่ดีขึ้น",
    titleEn: "Harm Reduction Improvements",
    items: [
      { th: "ปรับปรุงหน้า /harm-reduction ใหม่ทั้งหมด", en: "Redesigned Harm Reduction hub" },
      { th: "เส้นทาง เรียนรู้ / ตรวจสอบ / วางแผน / สนับสนุน ที่ดีขึ้น", en: "Better Learn / Check / Plan / Support journey" },
      { th: "ภาษาที่ครอบคลุมมากขึ้น", en: "More inclusive language" },
      { th: "ตัวตรวจสอบปฏิกิริยาระหว่างสารที่ปรับปรุงแล้ว", en: "Improved interaction checker" },
      { th: "การวางแผนความปลอดภัยตามสถานการณ์", en: "Scenario-based safer planning" },
    ],
  },
  {
    icon: Stethoscope,
    color: "text-primary",
    bg: "bg-primary/10",
    titleTh: "คลินิกและการสนับสนุน",
    titleEn: "Clinic & Support Improvements",
    items: [
      { th: "หน้าบริการ SWING Clinic ที่ชัดเจนขึ้น", en: "Clearer SWING Clinic service front door" },
      { th: "เส้นทางการให้คำปรึกษาที่ดีขึ้น", en: "Better counseling pathways" },
      { th: "ปรับปรุงการจองภายในคลินิก", en: "Internal booking improvements" },
      { th: "ระบบ Callback และ Referral ที่ดีขึ้น", en: "Callback and referral improvements" },
    ],
  },
  {
    icon: BarChart3,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    titleTh: "Admin และ MEL",
    titleEn: "Admin & MEL Improvements",
    items: [
      { th: "ปรับโครงสร้าง MEL backend", en: "MEL backend restructuring" },
      { th: "Front Desk / Intake / Counseling workflow", en: "Front desk, intake, and counseling workflows" },
      { th: "รายงานและ Diagnostics ที่ดีขึ้น", en: "Reporting and diagnostics improvements" },
    ],
  },
  {
    icon: Zap,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    titleTh: "ความปลอดภัยและประสิทธิภาพ",
    titleEn: "Safety & Performance",
    items: [
      { th: "ระบบอัปเดตเวอร์ชันที่ดีขึ้น", en: "Better version update system" },
      { th: "ปรับปรุง Cache และ Refresh", en: "Cache and refresh improvements" },
      { th: "การแจ้งเตือนที่สะอาดขึ้น", en: "Cleaner notifications" },
      { th: "ความสอดคล้องของข้อมูลที่แข็งแกร่งขึ้น", en: "Stronger data consistency" },
    ],
  },
];

const benefits = [
  { th: "ค้นหาความช่วยเหลือที่เหมาะสมได้ง่ายขึ้น", en: "Easier to find the right help" },
  { th: "การสนับสนุนด้านสุขภาพที่ดีขึ้น", en: "Better health support" },
  { th: "ประสบการณ์ที่ปลอดภัยและเร็วขึ้น", en: "Safer and faster experience" },
  { th: "เชื่อมต่อกับบริการ SWING ได้ดีขึ้น", en: "Better connection to SWING services" },
];

export default function WhatsNew() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const t = (th: string, en: string) => (language === "th" ? th : en);

  return (
    <>
      <SEOHead
        title="What's New — testD Version 3"
        description="See what's new in testD Version 3: improved harm reduction, better clinic access, and stronger system performance."
      />
      <div className="min-h-screen">
        {/* Hero */}
        <section className="relative overflow-hidden px-4 pt-10 pb-12 text-center">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
          <div className="relative max-w-lg mx-auto space-y-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
              <Rocket className="h-3.5 w-3.5" />
              Version {APP_VERSION}
            </span>
            <h1 className="text-3xl font-bold text-foreground leading-tight">
              {t("testD เวอร์ชัน 3", "testD Version 3")}
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-md mx-auto">
              {t(
                "เครื่องมือ Harm Reduction ใหม่ บริการคลินิกที่เข้าถึงง่ายขึ้น ระบบ MEL ที่แข็งแกร่งขึ้น",
                "New Harm Reduction tools, better clinic access, stronger MEL system"
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("เปิดตัว มีนาคม 2026", "Released March 2026")}
            </p>
          </div>
        </section>

        {/* Categories */}
        <section className="px-4 pb-10 max-w-lg mx-auto space-y-6">
          <h2 className="text-lg font-bold text-foreground">
            {t("มีอะไรใหม่", "What's New")}
          </h2>
          {categories.map((cat, i) => {
            const Icon = cat.icon;
            return (
              <div key={i} className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur-sm p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-xl ${cat.bg}`}>
                    <Icon className={`h-5 w-5 ${cat.color}`} />
                  </div>
                  <h3 className="font-semibold text-foreground text-sm">
                    {t(cat.titleTh, cat.titleEn)}
                  </h3>
                </div>
                <ul className="space-y-1.5 pl-1">
                  {cat.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <ChevronRight className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary/50" />
                      {t(item.th, item.en)}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </section>

        {/* Why this matters */}
        <section className="px-4 pb-10 max-w-lg mx-auto">
          <h2 className="text-lg font-bold text-foreground mb-4">
            {t("ทำไมถึงสำคัญ", "Why This Matters")}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {benefits.map((b, i) => (
              <div key={i} className="rounded-xl bg-primary/5 border border-primary/10 p-3 text-center">
                <p className="text-xs font-medium text-foreground">{t(b.th, b.en)}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Need help */}
        <section className="px-4 pb-16 max-w-lg mx-auto space-y-3">
          <h2 className="text-lg font-bold text-foreground">
            {t("ต้องการความช่วยเหลือ?", "Need Help?")}
          </h2>
          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-between rounded-xl h-12"
              onClick={() => navigate("/swing")}
            >
              <span className="flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-primary" />
                {t("SWING Clinic", "SWING Clinic")}
              </span>
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="w-full justify-between rounded-xl h-12"
              onClick={() => openSupportChat()}
            >
              <span className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-primary" />
                {t("ติดต่อทีมสนับสนุน", "Contact Support")}
              </span>
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              className="w-full rounded-xl h-12 font-semibold"
              onClick={() => navigate("/")}
            >
              {t("กลับสู่แอป", "Continue to App")}
            </Button>
          </div>
        </section>
      </div>
    </>
  );
}
