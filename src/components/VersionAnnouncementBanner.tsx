import { useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { useNavigate } from "react-router-dom";
import { X, Sparkles, MapPin } from "lucide-react";

const DISMISS_KEY = "testd-v5-banner-dismissed";

export function VersionAnnouncementBanner() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(() => {
    return localStorage.getItem(DISMISS_KEY) !== "1";
  });

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  return (
    <div className="relative z-40 w-full bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(180,60%,40%)] text-white px-3 py-1.5 text-center text-xs font-medium">
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <Sparkles className="h-3 w-3 shrink-0" />
        <span>
          {language === "th"
            ? "testD v5 — หน้าใหม่ล่าสุดพร้อมใช้งาน"
            : "testD v5 — Latest home experience is live"}
        </span>
        <button
          onClick={() => navigate("/virtual")}
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-white/20 hover:bg-white/30 transition-colors"
        >
          <MapPin className="h-2.5 w-2.5" />
          {language === "th" ? "ลองเลย" : "Try it"}
        </button>
      </div>
      <button
        onClick={dismiss}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-white/20 transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
