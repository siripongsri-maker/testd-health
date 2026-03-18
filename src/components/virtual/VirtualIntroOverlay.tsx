import { useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";

const SESSION_KEY = "virtual_intro_seen";

export function VirtualIntroOverlay() {
  const { language } = useLanguage();
  const [visible, setVisible] = useState(() => !sessionStorage.getItem(SESSION_KEY));

  if (!visible) return null;

  const dismiss = () => {
    sessionStorage.setItem(SESSION_KEY, "1");
    setVisible(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in p-4">
      <div className="max-w-sm w-full rounded-2xl border border-border/40 bg-card/95 backdrop-blur-xl p-6 text-center shadow-xl animate-scale-in">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <MapPin className="h-7 w-7 text-primary" />
        </div>

        <h2 className="text-lg font-bold text-foreground mb-1">
          {language === "th" ? "ยินดีต้อนรับสู่ Virtual Mode" : "Welcome to Virtual Mode"}
        </h2>
        <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
          {language === "th"
            ? "แตะที่โซนบริการเพื่อเข้าถึงฟีเจอร์ต่าง ๆ ของ testD ได้เลย!"
            : "Tap any service zone to access testD features in a new way!"}
        </p>

        <Button onClick={dismiss} className="w-full">
          {language === "th" ? "เริ่มสำรวจ" : "Start Exploring"}
        </Button>
      </div>
    </div>
  );
}
