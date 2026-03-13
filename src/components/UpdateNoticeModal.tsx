import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/lib/i18n";
import { APP_VERSION } from "@/config/appVersion";
import { Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORED_VERSION_KEY = "testd_app_version";

export function UpdateNoticeModal() {
  const { language } = useLanguage();
  const [show, setShow] = useState(false);
  const [deferred, setDeferred] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORED_VERSION_KEY);
    if (stored && stored !== APP_VERSION) {
      setShow(true);
      // Track analytics
      try {
        window.dispatchEvent(new CustomEvent("testd-analytics", { detail: { event: "version_update_shown", version: APP_VERSION } }));
      } catch {}
    }
    // Always stamp current version for new users
    if (!stored) {
      localStorage.setItem(STORED_VERSION_KEY, APP_VERSION);
    }
  }, []);

  const handleUpdate = useCallback(() => {
    try {
      window.dispatchEvent(new CustomEvent("testd-analytics", { detail: { event: "version_update_clicked", version: APP_VERSION } }));
    } catch {}
    localStorage.setItem(STORED_VERSION_KEY, APP_VERSION);
    window.location.reload();
  }, []);

  const handleDefer = useCallback(() => {
    setDeferred(true);
    setShow(false);
    // Re-show after 5 minutes
    setTimeout(() => {
      setDeferred(false);
      setShow(true);
    }, 5 * 60 * 1000);
  }, []);

  if (!show || deferred) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-background rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center space-y-4 animate-in fade-in zoom-in-95 duration-300">
        <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
          <Rocket className="h-7 w-7 text-primary" />
        </div>

        <h2 className="text-xl font-bold text-foreground">
          🚀 testD Version 3 is here
        </h2>

        <div className="text-sm text-muted-foreground space-y-2">
          {language === "th" ? (
            <>
              <p>เราได้อัปเดตระบบ testD เป็นเวอร์ชันใหม่เพื่อเพิ่มความปลอดภัย ความเร็ว และฟีเจอร์ใหม่สำหรับการดูแลสุขภาพของคุณ</p>
              <p>กรุณาอัปเดตหน้าเว็บไซต์เพื่อใช้งานเวอร์ชันล่าสุด</p>
            </>
          ) : (
            <>
              <p>testD has been updated to Version 3 with improvements in safety, performance, and new health support features.</p>
              <p>Please refresh the website to continue using the latest version.</p>
            </>
          )}
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <Button onClick={handleUpdate} className="w-full rounded-full font-semibold">
            {language === "th" ? "อัปเดตเลย" : "Update Now"}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDefer} className="text-xs text-muted-foreground">
            {language === "th" ? "เตือนฉันทีหลัง" : "Remind me later"}
          </Button>
        </div>
      </div>
    </div>
  );
}
