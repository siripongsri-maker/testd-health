import { openSupportChat } from "@/lib/openSupportChat";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { trackEvent } from "@/hooks/useAnalytics";
import { supabase } from "@/integrations/supabase/client";
import {
  Building2, CalendarDays, Phone, MessageCircle, MapPin, Clock,
} from "lucide-react";

interface Props {
  userId?: string;
  sourceContext?: string;
  compact?: boolean;
}

export function SwingClinicCard({ userId, sourceContext, compact }: Props) {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isEn = language === "en";

  const trackReferral = async (type: string) => {
    trackEvent("hr_swing_referral", { type, source: sourceContext });
    try {
      await supabase.from("hr_referral_events").insert({
        user_id: userId || null,
        anonymous_token: userId ? null : `anon-${Date.now()}`,
        referral_type: type,
        referral_target: "swing_clinic",
        source_context: sourceContext || "swing_card",
      });
    } catch {}
  };

  if (compact) {
    return (
      <Card className="border border-primary/20 bg-primary/5">
        <CardContent className="p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">SWING Clinic</p>
            <p className="text-[10px] text-muted-foreground">
              {isEn ? "HIV/STI testing, PrEP, counseling" : "ตรวจ HIV/STI, PrEP, ให้คำปรึกษา"}
            </p>
          </div>
          <Button size="sm" className="rounded-xl h-8 text-xs" onClick={() => { trackReferral("booking"); navigate("/booking"); }}>
            {isEn ? "Book" : "จอง"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">SWING Clinic</h3>
            <p className="text-xs text-muted-foreground">
              {isEn ? "Community-based health services" : "บริการสุขภาพชุมชน"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            <span>{isEn ? "Mon–Fri 10:00–18:00" : "จ–ศ 10:00–18:00"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3 w-3" />
            <span>{isEn ? "Multiple branches" : "หลายสาขา"}</span>
          </div>
        </div>

        <div className="space-y-1.5 text-xs text-muted-foreground">
          <p>• {isEn ? "HIV / STI testing (free for eligible)" : "ตรวจ HIV/STI (ฟรีสำหรับผู้มีสิทธิ์)"}</p>
          <p>• {isEn ? "PrEP / PEP support" : "สนับสนุน PrEP / PEP"}</p>
          <p>• {isEn ? "Counseling & mental health" : "ให้คำปรึกษาและสุขภาพจิต"}</p>
          <p>• {isEn ? "Harm reduction support" : "สนับสนุนการลดอันตราย"}</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button className="rounded-xl text-xs h-9" onClick={() => { trackReferral("booking"); navigate("/booking"); }}>
            <CalendarDays className="h-3.5 w-3.5 mr-1.5" />
            {isEn ? "Book Visit" : "จองนัด"}
          </Button>
          <Button variant="outline" className="rounded-xl text-xs h-9" onClick={() => { trackReferral("chat"); openSupportChat(); }}>
            <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
            {isEn ? "Chat" : "แชท"}
          </Button>
        </div>
        <Button variant="ghost" className="w-full rounded-xl text-xs h-8 text-muted-foreground" onClick={() => { trackReferral("phone"); window.open("tel:+6626329501"); }}>
          <Phone className="h-3.5 w-3.5 mr-1.5" />
          {isEn ? "Call +66 2 632 9501" : "โทร 02 632 9501"}
        </Button>
      </CardContent>
    </Card>
  );
}
