import { useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { X, Rocket, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "testd-v3-banner-dismissed";

interface Props {
  onOpenChangelog: () => void;
}

export function VersionAnnouncementBanner({ onOpenChangelog }: Props) {
  const { language } = useLanguage();
  const [visible, setVisible] = useState(() => {
    return localStorage.getItem(DISMISS_KEY) !== "1";
  });

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  return (
    <div className="relative z-50 w-full bg-gradient-to-r from-[hsl(var(--primary))] via-[hsl(333,80%,55%)] to-[hsl(var(--accent-foreground))] text-white px-3 py-2.5 text-center text-sm font-medium shadow-lg">
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <Rocket className="h-4 w-4 shrink-0" />
        <span>
          {language === "th"
            ? "testD Version 3 เปิดตัวแล้ว — เครื่องมือความปลอดภัยใหม่ บริการคลินิกที่ดีขึ้น และระบบ Harm Reduction ที่ฉลาดกว่าเดิม"
            : "testD Version 3 launched — New safety tools, improved clinic services, and smarter harm reduction support."}
        </span>
        <Button
          variant="secondary"
          size="sm"
          className="h-6 text-xs rounded-full px-3 bg-white/20 hover:bg-white/30 text-white border-0"
          onClick={onOpenChangelog}
        >
          <Sparkles className="h-3 w-3 mr-1" />
          {language === "th" ? "มีอะไรใหม่" : "What's New"}
        </Button>
      </div>
      <button
        onClick={dismiss}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/20 transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
