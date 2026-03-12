import { useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { trackEvent } from "@/hooks/useAnalytics";
import { useNavigate } from "react-router-dom";
import {
  MessageCircle, Phone, CalendarDays, Send, Shield,
  CheckCircle2, Clock, UserCheck, HeartHandshake,
} from "lucide-react";

interface Props {
  userId?: string;
}

const STATUS_COLORS: Record<string, string> = {
  requested: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  contacted: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  scheduled: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
};

export function CounselingReferral({ userId }: Props) {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isEn = language === "en";
  const [referralType, setReferralType] = useState("chat");
  const [contactMethod, setContactMethod] = useState("line");
  const [contactValue, setContactValue] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const anonToken = userId ? undefined : `anon-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const { error } = await supabase.from("hr_referrals").insert({
        user_id: userId || null,
        anonymous_token: anonToken || null,
        referral_type: referralType,
        contact_method: contactMethod,
        contact_value: contactValue || null,
        notes: notes || null,
        status: "requested",
        priority: "normal",
      });
      if (error) throw error;
      setSubmitted(true);
      trackEvent("hr_referral_requested", { type: referralType });
      toast.success(isEn ? "Request submitted!" : "ส่งคำขอเรียบร้อย!");
    } catch (err) {
      toast.error(isEn ? "Failed to submit" : "ส่งไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Card className="border border-border/40">
        <CardContent className="p-8 text-center space-y-4">
          <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
          <h2 className="text-xl font-bold text-foreground">
            {isEn ? "Request Received" : "ได้รับคำขอแล้ว"}
          </h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {isEn
              ? "Our team will reach out to you soon. You can also chat with us directly."
              : "ทีมงานจะติดต่อกลับโดยเร็ว คุณสามารถแชทกับเราได้โดยตรง"}
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <Button onClick={() => navigate("/support-chat")} className="rounded-2xl">
              <MessageCircle className="h-4 w-4 mr-2" />
              {isEn ? "Open Chat" : "เปิดแชท"}
            </Button>
            <Button variant="outline" onClick={() => { setSubmitted(false); setNotes(""); setContactValue(""); }} className="rounded-2xl">
              {isEn ? "Submit Another Request" : "ส่งคำขอใหม่"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Support options */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { type: "chat", icon: MessageCircle, labelTh: "แชทปรึกษา", labelEn: "Chat" },
          { type: "callback", icon: Phone, labelTh: "โทรกลับ", labelEn: "Callback" },
          { type: "appointment", icon: CalendarDays, labelTh: "นัดพบ", labelEn: "Book" },
        ].map(opt => (
          <Card key={opt.type} className={`cursor-pointer transition-all border ${referralType === opt.type ? "border-primary bg-primary/5" : "border-border/40"}`}
            onClick={() => setReferralType(opt.type)}>
            <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
              <opt.icon className={`h-6 w-6 ${referralType === opt.type ? "text-primary" : "text-muted-foreground"}`} />
              <span className="text-xs font-medium">{isEn ? opt.labelEn : opt.labelTh}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Contact info */}
      <Card className="border border-border/40">
        <CardContent className="p-5 space-y-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <HeartHandshake className="h-4 w-4 text-primary" />
            {isEn ? "How can we reach you?" : "เราจะติดต่อคุณได้อย่างไร?"}
          </h3>
          <p className="text-xs text-muted-foreground">
            {isEn ? "Optional — you can stay anonymous" : "ไม่จำเป็น — คุณสามารถไม่ระบุตัวตนได้"}
          </p>

          <RadioGroup value={contactMethod} onValueChange={setContactMethod} className="grid grid-cols-3 gap-2">
            {[
              { value: "line", label: "LINE" },
              { value: "phone", label: isEn ? "Phone" : "โทรศัพท์" },
              { value: "email", label: isEn ? "Email" : "อีเมล" },
            ].map(opt => (
              <div key={opt.value} className="flex items-center gap-1.5">
                <RadioGroupItem value={opt.value} id={`contact-${opt.value}`} />
                <Label htmlFor={`contact-${opt.value}`} className="text-sm">{opt.label}</Label>
              </div>
            ))}
          </RadioGroup>

          <Input
            placeholder={contactMethod === "line" ? "LINE ID" : contactMethod === "phone" ? "08x-xxx-xxxx" : "email@example.com"}
            value={contactValue}
            onChange={e => setContactValue(e.target.value)}
            className="rounded-xl"
          />

          <Textarea
            placeholder={isEn ? "Tell us briefly what you need help with (optional)..." : "บอกเราสั้นๆ ว่าต้องการความช่วยเหลือเรื่องอะไร (ไม่จำเป็น)..."}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="rounded-xl min-h-[80px]"
          />

          <Button onClick={handleSubmit} className="w-full rounded-2xl" disabled={submitting}>
            <Send className="h-4 w-4 mr-2" />
            {submitting ? (isEn ? "Submitting..." : "กำลังส่ง...") : (isEn ? "Submit Request" : "ส่งคำขอ")}
          </Button>
        </CardContent>
      </Card>

      {/* Privacy note */}
      <div className="flex items-start gap-2 p-3 rounded-xl bg-muted/30">
        <Shield className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          {isEn
            ? "Your information is confidential and protected. We will not share any details without your consent."
            : "ข้อมูลของคุณเป็นความลับและได้รับการปกป้อง เราจะไม่แชร์รายละเอียดใดๆ โดยไม่ได้รับความยินยอมจากคุณ"}
        </p>
      </div>
    </div>
  );
}
