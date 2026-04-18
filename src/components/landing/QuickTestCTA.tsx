import { Button } from "@/components/ui/button";
import { TestTube, ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/lib/i18n";

export function QuickTestCTA() {
  const { language } = useLanguage();

  return (
    <div className="w-full max-w-sm mx-auto space-y-3">
      <Button
        asChild
        size="lg"
        className="w-full h-16 text-lg font-bold rounded-2xl bg-gradient-to-r from-accent via-accent to-primary shadow-lg shadow-accent/30 hover:shadow-xl hover:shadow-accent/40 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] group"
      >
        <Link to="/hiv-selftest" className="gap-3">
          <div className="p-2 bg-white/20 rounded-xl group-hover:bg-white/30 transition-colors">
            <TestTube className="h-5 w-5" />
          </div>
          <span className="flex-1 text-left">
            {language === "th" ? "ขอชุดตรวจ HIV ฟรี" : "Get a free HIV test kit"}
          </span>
          <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
        </Link>
      </Button>

      <Button
        asChild
        variant="outline"
        size="lg"
        className="w-full h-14 text-base rounded-xl border-2 border-primary/30 hover:border-primary/50 hover:bg-primary/5 transition-all"
      >
        <Link to="/onboarding" className="gap-3">
          <Sparkles className="h-5 w-5 text-primary" />
          {language === "th" ? "เริ่มต้นใช้งาน" : "Get started"}
        </Link>
      </Button>

      <p className="text-center text-xs text-muted-foreground pt-1">
        {language === "th"
          ? "ไม่ต้องสมัครสมาชิก • ส่งฟรีทั่วไทย • เก็บเป็นความลับ"
          : "No signup needed • Free delivery in Thailand • Fully confidential"}
      </p>
    </div>
  );
}
