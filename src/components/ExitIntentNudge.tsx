import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageCircle, Calendar } from "lucide-react";
import { trackEvent } from "@/hooks/useAnalytics";
import { openSupportChat } from "@/lib/openSupportChat";

const SESSION_KEY = "testd_exit_nudge_shown";
const IDLE_MS = 25000;

export function ExitIntentNudge() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const shownRef = useRef(false);

  const show = useCallback(() => {
    if (shownRef.current || sessionStorage.getItem(SESSION_KEY)) return;
    shownRef.current = true;
    sessionStorage.setItem(SESSION_KEY, "1");
    setOpen(true);
    trackEvent("exit_intent_nudge_shown", { page: "/" });
  }, []);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return;

    const resetTimer = () => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(show, IDLE_MS);
    };

    const onMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) show();
    };

    const events = ["click", "scroll", "mousemove", "touchstart", "keydown"] as const;
    events.forEach(ev => document.addEventListener(ev, resetTimer, { passive: true }));
    document.documentElement.addEventListener("mouseleave", onMouseLeave);
    timerRef.current = setTimeout(show, IDLE_MS);

    return () => {
      clearTimeout(timerRef.current);
      events.forEach(ev => document.removeEventListener(ev, resetTimer));
      document.documentElement.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [show]);

  const handleClick = (target: string) => {
    trackEvent("exit_intent_nudge_click", { target, page: "/" });
    setOpen(false);
    if (target === "/support-chat") {
      openSupportChat();
      return;
    }
    navigate(target);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm mx-auto rounded-2xl">
        <DialogHeader className="text-center">
          <DialogTitle className="text-xl">ยังไม่แน่ใจใช่ไหม?</DialogTitle>
          <DialogDescription className="text-base mt-2">
            คุยกับเจ้าหน้าที่ได้ฟรี ไม่ต้องบอกชื่อก็ได้นะ
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-2">
          <Button size="lg" className="w-full gap-2" onClick={() => handleClick("/support-chat")}>
            <MessageCircle className="h-5 w-5" /> คุยกับเจ้าหน้าที่
          </Button>
          <Button size="lg" variant="outline" className="w-full gap-2" onClick={() => handleClick("/booking")}>
            <Calendar className="h-5 w-5" /> จองตรวจเลย
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
