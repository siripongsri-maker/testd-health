import { useLanguage } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { trackHrCta, trackHrOutbound } from "@/hooks/useHarmReductionTracking";
import { supabase } from "@/integrations/supabase/client";
import {
  Building2, CalendarDays, Phone, MessageCircle,
  Shield, FileText, RotateCcw,
} from "lucide-react";

interface Props {
  userId?: string;
  onResetAge: () => void;
}

export default function HrZoneTrust({ userId, onResetAge }: Props) {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isEn = language === "en";

  const trackReferral = async (type: string) => {
    const ctaMap: Record<string, string> = { booking: 'booking', chat: 'support', phone: 'hotline' };
    trackHrCta(ctaMap[type] || type, { cta_position: 'trust_zone', target_path: type === 'booking' ? '/booking' : type === 'chat' ? '/support-chat' : 'tel:+6626329501' });
    try {
      await supabase.from("hr_referral_events").insert({
        user_id: userId || null,
        anonymous_token: userId ? null : `anon-${Date.now()}`,
        referral_type: type,
        referral_target: "swing_clinic",
        source_context: "trust_zone",
      });
    } catch {}
  };

  return (
    <section className="space-y-4">
      {/* SWING Clinic */}
      <Card className="border border-primary/15 overflow-hidden">
        <CardContent className="p-0">
          <div className="bg-gradient-to-r from-primary/8 to-transparent p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-base">SWING Clinic</h3>
                <p className="text-xs text-muted-foreground">
                  {isEn ? "Community-based health services" : "บริการสุขภาพชุมชน"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
              <p>• {isEn ? "HIV/STI testing" : "ตรวจ HIV/STI"}</p>
              <p>• {isEn ? "PrEP / PEP" : "PrEP / PEP"}</p>
              <p>• {isEn ? "Counseling" : "ให้คำปรึกษา"}</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                className="rounded-full text-xs h-9"
                onClick={() => { trackReferral("booking"); navigate("/booking"); }}
              >
                <CalendarDays className="h-3.5 w-3.5 mr-1.5" />
                {isEn ? "Book visit" : "จองนัด"}
              </Button>
              <Button
                variant="outline"
                className="rounded-full text-xs h-9"
                onClick={() => { trackReferral("chat"); navigate("/support-chat"); }}
              >
                <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
                {isEn ? "Chat" : "แชท"}
              </Button>
            </div>

            <Button
              variant="ghost"
              className="w-full rounded-full text-xs h-8 text-muted-foreground"
              onClick={() => { trackReferral("phone"); window.open("tel:+6626329501"); }}
            >
              <Phone className="h-3.5 w-3.5 mr-1.5" />
              {isEn ? "Call +66 2 632 9501" : "โทร 02 632 9501"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Emergency */}
      <Card className="border border-destructive/20">
        <CardContent className="p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
            <Phone className="h-4 w-4 text-destructive" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground">
              {isEn ? "Emergency? Call 1669" : "เหตุฉุกเฉิน? โทร 1669"}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {isEn ? "Mental health: 1323" : "สายด่วนสุขภาพจิต: 1323"}
            </p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            className="rounded-full h-8 text-xs shrink-0"
            onClick={() => window.open("tel:1669")}
          >
            {isEn ? "Call" : "โทร"}
          </Button>
        </CardContent>
      </Card>

      {/* Source / credibility */}
      <div className="rounded-2xl bg-muted/30 p-4 space-y-2">
        <div className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 text-muted-foreground/60" />
          <p className="text-[11px] font-medium text-muted-foreground/80">
            {isEn ? "Evidence-based content" : "เนื้อหาอ้างอิงตามหลักฐาน"}
          </p>
        </div>
        <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
          {isEn
            ? "Content reviewed by SWING Foundation health team. Last updated March 2026. Sources: WHO, Thai MOPH, UNAIDS guidelines."
            : "เนื้อหาตรวจสอบโดยทีมสุขภาพ SWING Foundation อัปเดตล่าสุด มีนาคม 2569 อ้างอิง: WHO, กระทรวงสาธารณสุข, UNAIDS"}
        </p>
        <p className="text-[10px] text-muted-foreground/50 leading-relaxed mt-1.5 border-t border-border/20 pt-1.5">
          {isEn
            ? "Information on this website is provided for health education and self-care. It is not a medical diagnosis. For further consultation, contact SWING Clinic."
            : "ข้อมูลในเว็บไซต์นี้จัดทำเพื่อให้ความรู้ด้านสุขภาพและการดูแลตนเอง ไม่ใช่การวินิจฉัยทางการแพทย์ หากต้องการคำปรึกษาเพิ่มเติมสามารถติดต่อคลินิก SWING"}
        </p>
      </div>

      {/* Safety + reset */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <Shield className="h-3 w-3 text-muted-foreground/50" />
          <p className="text-[10px] text-muted-foreground/60">
            {isEn ? "Safe & private" : "ปลอดภัยและเป็นส่วนตัว"}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-[10px] text-muted-foreground/40 h-6 px-2"
          onClick={onResetAge}
        >
          <RotateCcw className="h-2.5 w-2.5 mr-1" />
          {isEn ? "Change age" : "เปลี่ยนอายุ"}
        </Button>
      </div>
    </section>
  );
}
