import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/lib/i18n";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TestTube, Heart, Gift, ArrowRight, X } from "lucide-react";

const POPUP_SHOWN_KEY = "testd-hiv-popup-shown";

export function HIVTestPopup() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Check if popup was already shown in this session
    const shown = sessionStorage.getItem(POPUP_SHOWN_KEY);
    if (!shown) {
      // Delay popup slightly for better UX
      const timer = setTimeout(() => {
        setOpen(true);
        sessionStorage.setItem(POPUP_SHOWN_KEY, "true");
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleGetKit = () => {
    setOpen(false);
    navigate("/hiv-selftest");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm mx-auto rounded-3xl border-2 border-accent/30 bg-gradient-to-b from-card to-accent/5 p-0 overflow-hidden">
        {/* Decorative header */}
        <div className="relative bg-gradient-to-br from-accent/20 to-primary/20 py-8 px-6">
          <div className="absolute top-2 right-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent/20 animate-bounce-gentle">
                <TestTube className="h-10 w-10 text-accent" />
              </div>
              <div className="absolute -top-1 -right-1">
                <Gift className="h-8 w-8 text-xp animate-pulse" />
              </div>
            </div>
          </div>
          
          <DialogHeader className="text-center space-y-1">
            <DialogTitle className="text-xl font-bold text-foreground">
              {language === 'th' ? '🎁 ของขวัญสำหรับคุณ!' : '🎁 A Gift for You!'}
            </DialogTitle>
          </DialogHeader>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <DialogDescription className="text-center text-base text-foreground">
            {language === 'th' 
              ? 'รับชุดตรวจ HIV ฟรี! ส่งถึงบ้านคุณโดย SWING Thailand 🏠'
              : 'Get a FREE HIV Self-Test Kit! Delivered to your home by SWING Thailand 🏠'
            }
          </DialogDescription>

          {/* Benefits */}
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-success/10">
              <Heart className="h-5 w-5 text-success shrink-0" />
              <span className="text-sm text-foreground">
                {language === 'th' ? 'ตรวจที่บ้าน ไม่ต้องไปคลินิก' : 'Test at home, no clinic visit needed'}
              </span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/10">
              <Gift className="h-5 w-5 text-primary shrink-0" />
              <span className="text-sm text-foreground">
                {language === 'th' ? 'ฟรี 100% พร้อมวิดีโอสอนใช้งาน' : '100% Free with video tutorial'}
              </span>
            </div>
          </div>

          {/* CTA */}
          <Button
            className="w-full h-12 text-base font-bold gap-2 rounded-xl"
            onClick={handleGetKit}
          >
            {language === 'th' ? 'รับชุดตรวจฟรี' : 'Get My Free Kit'}
            <ArrowRight className="h-5 w-5" />
          </Button>

          <button
            onClick={() => setOpen(false)}
            className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {language === 'th' ? 'ไว้ทีหลัง' : 'Maybe later'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
