import { useEffect, useState } from "react";
import { RefreshCw, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
import { APP_VERSION } from "@/config/appVersion";

const PWA_UPDATE_KEY = "testd-pwa-icon-update-seen-v1";
const PWA_ICON_SET_NAME = "Square Icons · 2026-08-08";
const PWA_ICON_VERSION = `${APP_VERSION}:square-icons-2026-08-08`;

function isStandaloneDisplayMode() {
  return window.matchMedia?.("(display-mode: standalone)").matches ||
    ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
}

export function PwaUpdatePrompt() {
  const { language } = useLanguage();
  const [visible, setVisible] = useState(false);
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(PWA_UPDATE_KEY) !== PWA_ICON_VERSION) {
        setVisible(true);
        setStandalone(isStandaloneDisplayMode());
      }
    } catch {
      // Private browsing can block storage; the prompt remains non-blocking.
    }
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(PWA_UPDATE_KEY, PWA_ICON_VERSION);
    } catch {
      // The prompt can still be dismissed for this render.
    }
    setVisible(false);
  };

  const refresh = () => {
    dismiss();
    window.location.reload();
  };

  if (!visible) return null;

  return (
    <aside
      className="fixed inset-x-3 bottom-20 z-50 mx-auto max-w-lg rounded-lg border border-primary/30 bg-card/95 p-4 text-card-foreground shadow-lg backdrop-blur-xl sm:bottom-5"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          {standalone ? <Smartphone className="h-5 w-5" aria-hidden="true" /> : <RefreshCw className="h-5 w-5" aria-hidden="true" />}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-semibold">
            {language === "th" ? "อัปเดตไอคอน testD แล้ว" : "testD icons have been updated"}
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {language === "th"
              ? standalone
                ? "รีเฟรชหน้านี้ แล้วติดตั้งแอปใหม่หากไอคอนบนหน้าจอยังเป็นอันเดิม"
                : "กดรีเฟรชเพื่อรับ favicon และไอคอนล่าสุด หากติดตั้งเป็นแอปแล้ว ให้ถอนการติดตั้งและติดตั้งใหม่"
              : standalone
                ? "Refresh this page, then reinstall the app if the home-screen icon is still unchanged."
                : "Refresh to get the latest favicon and app icons. If installed as an app, reinstall it to update the home-screen icon."}
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Button type="button" size="sm" onClick={refresh} className="h-8 gap-1.5 text-xs">
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              {language === "th" ? "รีเฟรชเพื่ออัปเดต" : "Refresh to update"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={dismiss} className="h-8 text-xs">
              {language === "th" ? "ไว้ทีหลัง" : "Later"}
            </Button>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={dismiss}
          className="-mr-2 -mt-2 h-8 w-8 shrink-0"
          aria-label={language === "th" ? "ปิดการแจ้งเตือน" : "Dismiss update notification"}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </aside>
  );
}
