import { openSupportChat } from "@/lib/openSupportChat";
import { useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Phone, Wind, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/hooks/useAnalytics";
import { useNavigate } from "react-router-dom";

interface Props {
  userId?: string;
  onNavigateSupport?: () => void;
}

export function DistressCard({ userId, onNavigateSupport }: Props) {
  const { language } = useLanguage();
  const isEn = language === "en";
  const navigate = useNavigate();
  const [showBreathing, setShowBreathing] = useState(false);
  const [breathPhase, setBreathPhase] = useState<"in" | "hold" | "out">("in");
  const [breathCount, setBreathCount] = useState(0);

  const logAction = (action: string) => {
    trackEvent("hr_distress_action", { action });
    supabase.from("hr_distress_alerts").insert({
      user_id: userId || null,
      trigger_type: "high_mental_score",
      action_taken: action,
    }).then();
  };

  const startBreathing = () => {
    setShowBreathing(true);
    setBreathCount(0);
    logAction("breathing_exercise");
    runBreathCycle(0);
  };

  const runBreathCycle = (cycle: number) => {
    if (cycle >= 4) return;
    setBreathPhase("in");
    setTimeout(() => {
      setBreathPhase("hold");
      setTimeout(() => {
        setBreathPhase("out");
        setTimeout(() => {
          setBreathCount(cycle + 1);
          runBreathCycle(cycle + 1);
        }, 8000);
      }, 7000);
    }, 4000);
  };

  return (
    <Card className="border-2 border-primary/30 bg-primary/5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <CardContent className="p-5 space-y-4 text-center">
        <Heart className="h-10 w-10 text-primary mx-auto" />
        <h3 className="text-lg font-bold text-foreground">
          {isEn ? "You don't have to go through this alone" : "คุณไม่จำเป็นต้องเผชิญสิ่งนี้คนเดียว"}
        </h3>
        <p className="text-sm text-muted-foreground">
          {isEn
            ? "Your responses suggest you may be going through a tough time. We're here to help."
            : "จากคำตอบของคุณ คุณอาจกำลังผ่านช่วงเวลาที่ยากลำบาก เราพร้อมช่วยเหลือ"}
        </p>

        <div className="grid grid-cols-1 gap-2">
          <Button
            variant="default"
            className="rounded-xl"
            onClick={() => {
              logAction("talk_counselor");
              if (onNavigateSupport) onNavigateSupport();
              else openSupportChat();
            }}
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            {isEn ? "Talk to a Counselor" : "พูดคุยกับผู้ให้คำปรึกษา"}
          </Button>
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => {
              logAction("call_hotline");
              window.open("tel:1323");
            }}
          >
            <Phone className="h-4 w-4 mr-2" />
            {isEn ? "Mental Health Hotline: 1323" : "สายด่วนสุขภาพจิต: 1323"}
          </Button>
          <Button variant="outline" className="rounded-xl" onClick={startBreathing}>
            <Wind className="h-4 w-4 mr-2" />
            {isEn ? "Breathing Exercise (4-7-8)" : "ฝึกหายใจ (4-7-8)"}
          </Button>
        </div>

        {showBreathing && (
          <div className="mt-4 p-4 rounded-2xl bg-sky-50/50 dark:bg-sky-900/10 border border-sky-200/50 dark:border-sky-800/30 animate-in fade-in duration-300">
            <div className="flex items-center justify-center gap-4 text-sm mb-2">
              <div className={`flex flex-col items-center transition-all ${breathPhase === "in" ? "scale-125 text-sky-600" : "text-muted-foreground"}`}>
                <span className="text-2xl font-bold">4</span>
                <span className="text-[10px]">{isEn ? "Breathe in" : "หายใจเข้า"}</span>
              </div>
              <span className="text-muted-foreground/30">→</span>
              <div className={`flex flex-col items-center transition-all ${breathPhase === "hold" ? "scale-125 text-sky-600" : "text-muted-foreground"}`}>
                <span className="text-2xl font-bold">7</span>
                <span className="text-[10px]">{isEn ? "Hold" : "กลั้น"}</span>
              </div>
              <span className="text-muted-foreground/30">→</span>
              <div className={`flex flex-col items-center transition-all ${breathPhase === "out" ? "scale-125 text-sky-600" : "text-muted-foreground"}`}>
                <span className="text-2xl font-bold">8</span>
                <span className="text-[10px]">{isEn ? "Breathe out" : "หายใจออก"}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {isEn ? `Round ${breathCount + 1} of 4` : `รอบ ${breathCount + 1} จาก 4`}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
