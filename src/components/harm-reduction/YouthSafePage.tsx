import { openSupportChat } from "@/lib/openSupportChat";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  Heart, Brain, Phone, AlertTriangle, RotateCcw,
  MessageCircleHeart, Wind, Compass, Home, ShieldCheck,
} from "lucide-react";
import { useState } from "react";

interface Props {
  onReset: () => void;
}

export function YouthSafePage({ onReset }: Props) {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isEn = language === "en";
  const [showBreathing, setShowBreathing] = useState(false);

  const supportCards = [
    {
      icon: Heart,
      titleTh: "สุขภาพทั่วไป",
      titleEn: "General Health",
      descTh: "ข้อมูลพื้นฐานเกี่ยวกับการดูแลสุขภาพร่างกาย",
      descEn: "Basic information about taking care of your body",
      gradient: "from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30",
      iconBg: "bg-emerald-100 dark:bg-emerald-900/40",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      borderColor: "border-emerald-200/60 dark:border-emerald-800/30",
      action: () => navigate("/info"),
    },
    {
      icon: Brain,
      titleTh: "สุขภาพจิต",
      titleEn: "Mental Health",
      descTh: "คำแนะนำเกี่ยวกับความเครียด ความกังวล และการดูแลใจ",
      descEn: "Tips for stress, anxiety, and caring for your mind",
      gradient: "from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30",
      iconBg: "bg-violet-100 dark:bg-violet-900/40",
      iconColor: "text-violet-600 dark:text-violet-400",
      borderColor: "border-violet-200/60 dark:border-violet-800/30",
      action: () => navigate("/self-care"),
    },
    {
      icon: MessageCircleHeart,
      titleTh: "อยากคุยกับใครสักคน",
      titleEn: "Talk to Someone",
      descTh: "ขอคำปรึกษาแบบไม่เปิดเผยตัวตน",
      descEn: "Get anonymous counseling support",
      gradient: "from-blue-50 to-sky-50 dark:from-blue-950/30 dark:to-sky-950/30",
      iconBg: "bg-blue-100 dark:bg-blue-900/40",
      iconColor: "text-blue-600 dark:text-blue-400",
      borderColor: "border-blue-200/60 dark:border-blue-800/30",
      action: () => openSupportChat(),
    },
    {
      icon: AlertTriangle,
      titleTh: "เหตุฉุกเฉิน",
      titleEn: "Emergency",
      descTh: "ติดต่อสายด่วนหรือขอความช่วยเหลือทันที",
      descEn: "Contact a hotline or get help immediately",
      gradient: "from-rose-50 to-red-50 dark:from-rose-950/30 dark:to-red-950/30",
      iconBg: "bg-rose-100 dark:bg-rose-900/40",
      iconColor: "text-rose-600 dark:text-rose-400",
      borderColor: "border-rose-200/60 dark:border-rose-800/30",
      action: () => window.open("tel:1323"),
    },
  ];

  return (
    <div className="space-y-6 pb-6">
      {/* Hero */}
      <div className="relative rounded-3xl bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/10 p-6 text-center space-y-3 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(circle_at_30%_50%,hsl(var(--primary)),transparent_70%)]" />
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">
            {isEn ? "Youth Support Space" : "พื้นที่ช่วยเหลือสำหรับเยาวชน"}
          </h1>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
            {isEn
              ? "If you're under 18, you can still access health information and get support here."
              : "หากคุณอายุต่ำกว่า 18 ปี คุณยังสามารถดูข้อมูลสุขภาพและขอความช่วยเหลือได้ที่นี่"}
          </p>
        </div>
      </div>

      {/* How can we help */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground px-1">
          {isEn ? "How can we help you today?" : "วันนี้เราช่วยอะไรคุณได้บ้าง?"}
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {supportCards.map((card, i) => {
            const Icon = card.icon;
            return (
              <Card
                key={i}
                className={`border ${card.borderColor} bg-gradient-to-br ${card.gradient} cursor-pointer hover:shadow-lg transition-all active:scale-[0.97] overflow-hidden`}
                onClick={card.action}
              >
                <CardContent className="p-4 flex flex-col items-start gap-3 min-h-[140px]">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${card.iconBg}`}>
                    <Icon className={`h-5 w-5 ${card.iconColor}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-foreground leading-tight">
                      {isEn ? card.titleEn : card.titleTh}
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                      {isEn ? card.descEn : card.descTh}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Quick Help */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground px-1">
          {isEn ? "If you're not feeling okay" : "หากคุณกำลังรู้สึกไม่โอเค"}
        </h2>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setShowBreathing(!showBreathing)}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/20 border border-sky-200/50 dark:border-sky-800/30 hover:shadow-md transition-all active:scale-[0.97]"
          >
            <Wind className="h-5 w-5 text-sky-500" />
            <span className="text-[11px] font-medium text-foreground text-center leading-tight">
              {isEn ? "Breathing" : "หายใจ"}
            </span>
          </button>
          <button
            onClick={() => navigate("/self-care")}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30 hover:shadow-md transition-all active:scale-[0.97]"
          >
            <Compass className="h-5 w-5 text-amber-500" />
            <span className="text-[11px] font-medium text-foreground text-center leading-tight">
              {isEn ? "Grounding" : "สงบใจ"}
            </span>
          </button>
          <button
            onClick={() => openSupportChat()}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-800/30 hover:shadow-md transition-all active:scale-[0.97]"
          >
            <Phone className="h-5 w-5 text-rose-500" />
            <span className="text-[11px] font-medium text-foreground text-center leading-tight">
              {isEn ? "Counselor" : "ปรึกษา"}
            </span>
          </button>
        </div>

        {/* Breathing exercise expand */}
        {showBreathing && (
          <Card className="border border-sky-200/50 dark:border-sky-800/30 bg-sky-50/50 dark:bg-sky-950/10 animate-in fade-in slide-in-from-top-2 duration-300">
            <CardContent className="p-4 text-center space-y-2">
              <p className="text-sm font-medium text-foreground">
                {isEn ? "4-7-8 Breathing" : "การหายใจ 4-7-8"}
              </p>
              <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-2xl font-bold text-sky-500">4</span>
                  <span>{isEn ? "Breathe in" : "หายใจเข้า"}</span>
                </div>
                <span className="text-muted-foreground/30">→</span>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-2xl font-bold text-sky-500">7</span>
                  <span>{isEn ? "Hold" : "กลั้น"}</span>
                </div>
                <span className="text-muted-foreground/30">→</span>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-2xl font-bold text-sky-500">8</span>
                  <span>{isEn ? "Breathe out" : "หายใจออก"}</span>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {isEn ? "Repeat 3–4 times. You're doing great." : "ทำซ้ำ 3–4 รอบ คุณทำได้ดีมาก"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Emergency shortcut */}
      <Card className="border border-red-200/50 dark:border-red-800/30">
        <CardContent className="p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
            <Phone className="h-4 w-4 text-red-600 dark:text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground">
              {isEn ? "Emergency? Call 1669" : "เหตุฉุกเฉิน? โทร 1669"}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {isEn ? "Mental health hotline: 1323" : "สายด่วนสุขภาพจิต: 1323"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Safety notice */}
      <div className="rounded-2xl bg-muted/40 p-4 space-y-1">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-[11px] font-medium text-muted-foreground">
            {isEn ? "Designed for Youth Safety" : "ออกแบบเพื่อความปลอดภัยของเยาวชน"}
          </p>
        </div>
        <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
          {isEn
            ? "This service is designed to help youth access health information and support safely."
            : "บริการนี้ออกแบบเพื่อช่วยให้เยาวชนเข้าถึงข้อมูลสุขภาพและการสนับสนุนอย่างปลอดภัย"}
        </p>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-center gap-3">
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => navigate("/")}>
          <Home className="h-3.5 w-3.5 mr-1" />
          {isEn ? "Home" : "หน้าหลัก"}
        </Button>
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={onReset}>
          <RotateCcw className="h-3.5 w-3.5 mr-1" />
          {isEn ? "Change age selection" : "เปลี่ยนช่วงอายุ"}
        </Button>
      </div>
    </div>
  );
}
