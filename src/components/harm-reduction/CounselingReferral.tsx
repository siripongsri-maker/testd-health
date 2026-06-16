import { openSupportChat } from "@/lib/openSupportChat";
import { useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { trackEvent } from "@/hooks/useAnalytics";
import { useNavigate } from "react-router-dom";
import { SwingClinicCard } from "./SwingClinicCard";
import { RecoveryMode } from "./RecoveryMode";
import { SafetyEscalation } from "./SafetyEscalation";
import {
  MessageCircle, Phone, CalendarDays, Send, Shield,
  CheckCircle2, HeartHandshake, AlertTriangle, Sunrise,
  Building2, Heart, ArrowLeft, Clock, Mail,
} from "lucide-react";

interface Props {
  userId?: string;
}

type Pathway = null | "urgent" | "talk" | "clinic" | "recovery" | "contact";

export function CounselingReferral({ userId }: Props) {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isEn = language === "en";
  const [pathway, setPathway] = useState<Pathway>(null);

  // Contact form state
  const [contactMethod, setContactMethod] = useState("line");
  const [contactValue, setContactValue] = useState("");
  const [notes, setNotes] = useState("");
  const [supportType, setSupportType] = useState("general");
  const [urgency, setUrgency] = useState("normal");
  const [preferredTime, setPreferredTime] = useState("");
  const [consentCall, setConsentCall] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Talk flow state
  const [feeling, setFeeling] = useState<string | null>(null);

  const selectPathway = (p: Pathway) => {
    setPathway(p);
    trackEvent("hr_support_pathway", { pathway: p });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const anonToken = userId ? undefined : `anon-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      // Insert referral
      const { error } = await supabase.from("hr_referrals").insert({
        user_id: userId || null,
        anonymous_token: anonToken || null,
        referral_type: supportType,
        contact_method: contactMethod,
        contact_value: contactValue || null,
        notes: notes || null,
        status: "requested",
        priority: urgency === "urgent" ? "high" : "normal",
      });
      if (error) throw error;

      // Also insert callback request if consent given
      if (consentCall && contactValue) {
        await supabase.from("hr_callback_requests").insert({
          user_id: userId || null,
          anonymous_token: anonToken || null,
          phone_number: contactMethod === "phone" ? contactValue : null,
          consent_to_call: true,
          preferred_language: language,
          preferred_time: preferredTime || null,
          callback_reason: supportType,
          callback_status: "pending",
          escalation_level: urgency,
        });
      }

      // Track referral event
      await supabase.from("hr_referral_events").insert({
        user_id: userId || null,
        anonymous_token: anonToken || null,
        referral_type: supportType,
        referral_target: "support_request",
        source_context: `support_hub_${pathway}`,
      });

      setSubmitted(true);
      trackEvent("hr_support_submitted", { type: supportType, method: contactMethod, urgency });
      toast.success(isEn ? "Request submitted!" : "ส่งคำขอเรียบร้อย!");
    } catch {
      toast.error(isEn ? "Failed to submit" : "ส่งไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  // ── After submission ──
  if (submitted) {
    return (
      <div className="space-y-4">
        <Card className="border border-primary/20 bg-primary/5">
          <CardContent className="p-6 text-center space-y-4">
            <CheckCircle2 className="h-12 w-12 text-primary mx-auto" />
            <h2 className="text-lg font-bold text-foreground">
              {isEn ? "We received your request" : "เราได้รับคำขอของคุณแล้ว"}
            </h2>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              {isEn
                ? "Our team will follow up with you. If this is urgent, you don't have to wait — use the options below."
                : "ทีมงานจะติดต่อกลับ หากเรื่องนี้เร่งด่วน คุณไม่จำเป็นต้องรอ — ใช้ตัวเลือกด้านล่าง"}
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{isEn ? "Usually responds within 24 hours" : "มักตอบกลับภายใน 24 ชั่วโมง"}</span>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => openSupportChat()} className="rounded-xl h-11">
            <MessageCircle className="h-4 w-4 mr-1.5" />
            {isEn ? "Chat Now" : "แชทเลย"}
          </Button>
          <Button variant="outline" onClick={() => navigate("/booking")} className="rounded-xl h-11">
            <CalendarDays className="h-4 w-4 mr-1.5" />
            {isEn ? "Book Clinic" : "จองคลินิก"}
          </Button>
        </div>

        <SwingClinicCard userId={userId} sourceContext="support_submitted" compact />

        <Button variant="ghost" className="w-full rounded-xl text-xs text-muted-foreground"
          onClick={() => { setSubmitted(false); setPathway(null); setNotes(""); setContactValue(""); }}>
          {isEn ? "← Back to Support Hub" : "← กลับหน้าช่วยเหลือ"}
        </Button>
      </div>
    );
  }

  // ── Urgent pathway ──
  if (pathway === "urgent") {
    return (
      <div className="space-y-4">
        <BackButton onBack={() => setPathway(null)} isEn={isEn} />
        <SafetyEscalation userId={userId} onNavigateSupport={() => openSupportChat()} />
      </div>
    );
  }

  // ── Recovery pathway ──
  if (pathway === "recovery") {
    return (
      <div className="space-y-4">
        <BackButton onBack={() => setPathway(null)} isEn={isEn} />
        <RecoveryMode userId={userId} onNavigateSupport={() => openSupportChat()} />
      </div>
    );
  }

  // ── Clinic pathway ──
  if (pathway === "clinic") {
    return (
      <div className="space-y-4">
        <BackButton onBack={() => setPathway(null)} isEn={isEn} />

        <div className="space-y-1 mb-2">
          <h2 className="text-lg font-bold text-foreground">
            {isEn ? "SWING Clinic Services" : "บริการ SWING Clinic"}
          </h2>
          <p className="text-xs text-muted-foreground">
            {isEn ? "Select a service or contact the clinic directly." : "เลือกบริการหรือติดต่อคลินิกโดยตรง"}
          </p>
        </div>

        {/* Quick service selection */}
        <Card className="border border-border/40">
          <CardContent className="p-4 space-y-2">
            <p className="text-sm font-semibold text-foreground">
              {isEn ? "What do you need?" : "คุณต้องการอะไร?"}
            </p>
            {[
              { id: "hiv-test", labelEn: "HIV Testing", labelTh: "ตรวจ HIV" },
              { id: "sti-test", labelEn: "STI Testing", labelTh: "ตรวจ STI" },
              { id: "prep", labelEn: "PrEP / PEP Support", labelTh: "PrEP / PEP" },
              { id: "selftest", labelEn: "Self-test Kit Support", labelTh: "ชุดตรวจด้วยตัวเอง" },
              { id: "counseling", labelEn: "Counseling", labelTh: "ให้คำปรึกษา" },
              { id: "harm-reduction", labelEn: "Harm Reduction Support", labelTh: "ลดอันตราย" },
            ].map(svc => (
              <div key={svc.id}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${supportType === svc.id ? "border-primary/40 bg-primary/5" : "border-border/40"}`}
                onClick={() => { setSupportType(svc.id); trackEvent("hr_clinic_service_select", { service: svc.id }); }}
              >
                <span className="text-sm text-foreground">{isEn ? svc.labelEn : svc.labelTh}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <SwingClinicCard userId={userId} sourceContext="support_clinic_pathway" />

        <Button className="w-full rounded-xl" onClick={() => { trackEvent("hr_clinic_book_click"); navigate("/booking"); }}>
          <CalendarDays className="h-4 w-4 mr-2" />
          {isEn ? "Book Appointment" : "จองนัดหมาย"}
        </Button>
      </div>
    );
  }

  // ── Talk to someone pathway ──
  if (pathway === "talk") {
    const feelings = [
      { id: "anxious", emoji: "😰", labelEn: "Feeling anxious", labelTh: "รู้สึกกังวล" },
      { id: "low", emoji: "😔", labelEn: "Feeling low after using", labelTh: "รู้สึกแย่หลังใช้สาร" },
      { id: "ashamed", emoji: "😞", labelEn: "Feeling ashamed or overwhelmed", labelTh: "รู้สึกอายหรือท่วมท้น" },
      { id: "unsure", emoji: "🤷", labelEn: "Not sure, but want support", labelTh: "ไม่แน่ใจ แต่อยากมีคนรับฟัง" },
    ];

    return (
      <div className="space-y-4">
        <BackButton onBack={() => setPathway(null)} isEn={isEn} />

        <div className="space-y-1">
          <h2 className="text-lg font-bold text-foreground">
            {isEn ? "What are you experiencing?" : "คุณกำลังรู้สึกอย่างไร?"}
          </h2>
          <p className="text-xs text-muted-foreground">
            {isEn ? "You don't have to explain everything. Just pick what feels closest." : "ไม่ต้องอธิบายทั้งหมด แค่เลือกอันที่ใกล้เคียงที่สุด"}
          </p>
        </div>

        <div className="space-y-2">
          {feelings.map(f => (
            <div key={f.id}
              className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${feeling === f.id ? "border-primary/40 bg-primary/5" : "border-border/40"}`}
              onClick={() => { setFeeling(f.id); setSupportType(`talk_${f.id}`); }}
            >
              <span className="text-lg">{f.emoji}</span>
              <span className="text-sm text-foreground">{isEn ? f.labelEn : f.labelTh}</span>
            </div>
          ))}
        </div>

        {feeling && (
          <div className="space-y-3 pt-1">
            <p className="text-sm font-semibold text-foreground">
              {isEn ? "How would you like to connect?" : "คุณอยากติดต่อทางไหน?"}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button className="rounded-xl h-11" onClick={() => { trackEvent("hr_talk_chat"); openSupportChat(); }}>
                <MessageCircle className="h-4 w-4 mr-1.5" />
                {isEn ? "Chat now" : "แชทเลย"}
              </Button>
              <Button variant="outline" className="rounded-xl h-11" onClick={() => setPathway("contact")}>
                <Phone className="h-4 w-4 mr-1.5" />
                {isEn ? "Callback" : "โทรกลับ"}
              </Button>
            </div>

            <Textarea
              placeholder={isEn ? "Anything else you want us to know? (optional)" : "อยากบอกอะไรเพิ่มเติมไหม? (ไม่จำเป็น)"}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="rounded-xl min-h-[60px]"
            />

            {notes && (
              <Button className="w-full rounded-xl" onClick={handleSubmit} disabled={submitting}>
                <Send className="h-4 w-4 mr-2" />
                {submitting ? (isEn ? "Sending..." : "กำลังส่ง...") : (isEn ? "Send message" : "ส่งข้อความ")}
              </Button>
            )}
          </div>
        )}

        <PrivacyNote isEn={isEn} />
      </div>
    );
  }

  // ── Contact / callback pathway ──
  if (pathway === "contact") {
    return (
      <div className="space-y-4">
        <BackButton onBack={() => setPathway(null)} isEn={isEn} />

        <div className="space-y-1">
          <h2 className="text-lg font-bold text-foreground">
            {isEn ? "How can we reach you?" : "เราจะติดต่อคุณได้อย่างไร?"}
          </h2>
          <p className="text-xs text-muted-foreground">
            {isEn ? "Choose your preferred method. You can stay anonymous." : "เลือกช่องทางที่สะดวก คุณไม่จำเป็นต้องเปิดเผยตัวตน"}
          </p>
        </div>

        <Card className="border border-border/40">
          <CardContent className="p-4 space-y-4">
            {/* Contact method */}
            <RadioGroup value={contactMethod} onValueChange={setContactMethod} className="grid grid-cols-3 gap-2">
              {[
                { value: "line", label: "LINE", icon: MessageCircle },
                { value: "phone", label: isEn ? "Phone" : "โทรศัพท์", icon: Phone },
                { value: "email", label: isEn ? "Email" : "อีเมล", icon: Mail },
              ].map(opt => (
                <div key={opt.value}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border cursor-pointer transition-all ${contactMethod === opt.value ? "border-primary/30 bg-primary/5" : "border-border/40"}`}
                  onClick={() => setContactMethod(opt.value)}
                >
                  <opt.icon className={`h-4 w-4 ${contactMethod === opt.value ? "text-primary" : "text-muted-foreground"}`} />
                  <Label className="text-xs cursor-pointer">{opt.label}</Label>
                  <RadioGroupItem value={opt.value} className="sr-only" />
                </div>
              ))}
            </RadioGroup>

            <Input
              placeholder={contactMethod === "line" ? "LINE ID" : contactMethod === "phone" ? "08x-xxx-xxxx" : "email@example.com"}
              value={contactValue}
              onChange={e => setContactValue(e.target.value)}
              className="rounded-xl"
            />

            {/* Support type */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">{isEn ? "What support do you need?" : "ต้องการความช่วยเหลือเรื่องอะไร?"}</Label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: "general", labelEn: "General", labelTh: "ทั่วไป" },
                  { id: "emotional", labelEn: "Emotional", labelTh: "อารมณ์" },
                  { id: "testing", labelEn: "Testing", labelTh: "ตรวจเชื้อ" },
                  { id: "clinic", labelEn: "Clinic", labelTh: "คลินิก" },
                  { id: "not-sure", labelEn: "Not sure", labelTh: "ไม่แน่ใจ" },
                ].map(t => (
                  <Button key={t.id} variant={supportType === t.id ? "default" : "outline"}
                    size="sm" className="rounded-xl text-xs h-7"
                    onClick={() => setSupportType(t.id)}>
                    {isEn ? t.labelEn : t.labelTh}
                  </Button>
                ))}
              </div>
            </div>

            {/* Urgency */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">{isEn ? "How urgent?" : "เร่งด่วนแค่ไหน?"}</Label>
              <div className="flex gap-2">
                {[
                  { id: "normal", labelEn: "When possible", labelTh: "เมื่อสะดวก" },
                  { id: "soon", labelEn: "Soon", labelTh: "เร็วๆ นี้" },
                  { id: "urgent", labelEn: "Urgent", labelTh: "เร่งด่วน" },
                ].map(u => (
                  <Button key={u.id}
                    variant={urgency === u.id ? "default" : "outline"}
                    size="sm"
                    className={`rounded-xl text-xs h-7 flex-1 ${urgency === u.id && u.id === "urgent" ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground" : ""}`}
                    onClick={() => setUrgency(u.id)}>
                    {isEn ? u.labelEn : u.labelTh}
                  </Button>
                ))}
              </div>
            </div>

            {/* Preferred time */}
            <Input
              placeholder={isEn ? "Best time to contact (optional)" : "เวลาที่สะดวก (ไม่จำเป็น)"}
              value={preferredTime}
              onChange={e => setPreferredTime(e.target.value)}
              className="rounded-xl"
            />

            {/* Consent */}
            {contactMethod === "phone" && (
              <div className="flex items-start gap-2">
                <Checkbox checked={consentCall} onCheckedChange={(v) => setConsentCall(!!v)} className="mt-0.5" />
                <Label className="text-xs text-muted-foreground leading-relaxed cursor-pointer"
                  onClick={() => setConsentCall(!consentCall)}>
                  {isEn
                    ? "I consent to receive a callback at this number"
                    : "ยินยอมให้โทรกลับที่เบอร์นี้"}
                </Label>
              </div>
            )}

            {/* Notes */}
            <Textarea
              placeholder={isEn ? "Tell us briefly what you need (optional)..." : "บอกเราสั้นๆ ว่าต้องการอะไร (ไม่จำเป็น)..."}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="rounded-xl min-h-[60px]"
            />

            <Button onClick={handleSubmit} className="w-full rounded-xl" disabled={submitting}>
              <Send className="h-4 w-4 mr-2" />
              {submitting ? (isEn ? "Submitting..." : "กำลังส่ง...") : (isEn ? "Submit Request" : "ส่งคำขอ")}
            </Button>
          </CardContent>
        </Card>

        <PrivacyNote isEn={isEn} />
      </div>
    );
  }

  // ── Main triage hub ──
  const pathways = [
    {
      id: "urgent" as Pathway,
      icon: AlertTriangle,
      titleEn: "Need help now",
      titleTh: "ต้องการช่วยเหลือเดี๋ยวนี้",
      descEn: "Breathing trouble, chest pain, collapse, panic, overdose signs",
      descTh: "หายใจลำบาก เจ็บหน้าอก หมดสติ ตื่นตระหนก สัญญาณ overdose",
      color: "border-destructive/30 bg-destructive/5",
      iconColor: "text-destructive",
    },
    {
      id: "talk" as Pathway,
      icon: Heart,
      titleEn: "Talk to someone",
      titleTh: "อยากคุยกับคน",
      descEn: "Anxiety, emotional distress, post-use crash, need non-judgmental support",
      descTh: "กังวล อารมณ์ตก หลังใช้สาร ต้องการคนรับฟังโดยไม่ตัดสิน",
      color: "border-primary/20",
      iconColor: "text-primary",
    },
    {
      id: "clinic" as Pathway,
      icon: Building2,
      titleEn: "SWING Clinic / Testing",
      titleTh: "คลินิก SWING / ตรวจเชื้อ",
      descEn: "HIV/STI testing, PrEP/PEP, sexual health, clinic visit",
      descTh: "ตรวจ HIV/STI, PrEP/PEP, สุขภาพทางเพศ, จองคลินิก",
      color: "border-primary/20",
      iconColor: "text-primary",
    },
    {
      id: "recovery" as Pathway,
      icon: Sunrise,
      titleEn: "Recovery support",
      titleTh: "ฟื้นตัวหลังใช้สาร",
      descEn: "Next-day support, hydration, sleep, grounding, emotional check-in",
      descTh: "ดูแลตัวเองวันถัดไป ดื่มน้ำ พักผ่อน ทำจิตใจให้สงบ",
      color: "border-amber-200/50 dark:border-amber-800/30",
      iconColor: "text-amber-600 dark:text-amber-400",
    },
    {
      id: "contact" as Pathway,
      icon: MessageCircle,
      titleEn: "Request callback / message us",
      titleTh: "ขอให้ติดต่อกลับ / ส่งข้อความ",
      descEn: "LINE, phone, email — follow up at your pace",
      descTh: "LINE, โทรศัพท์, อีเมล — ติดต่อตามจังหวะของคุณ",
      color: "border-border/40",
      iconColor: "text-muted-foreground",
    },
  ];

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="text-center space-y-2 py-2">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <HeartHandshake className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-lg font-bold text-foreground">
          {isEn ? "You don't have to handle everything alone" : "คุณไม่ต้องจัดการทุกอย่างคนเดียว"}
        </h2>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          {isEn
            ? "Choose the support that fits what you're going through right now."
            : "เลือกความช่วยเหลือที่เหมาะกับสิ่งที่คุณกำลังเจออยู่ตอนนี้"}
        </p>
      </div>

      {/* Pathway cards */}
      <div className="space-y-2.5">
        {pathways.map(p => {
          const Icon = p.icon;
          return (
            <Card key={p.id} className={`border cursor-pointer hover:shadow-md transition-all active:scale-[0.98] ${p.color}`}
              onClick={() => selectPathway(p.id)}>
              <CardContent className="p-4 flex items-center gap-3.5">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  p.id === "urgent" ? "bg-destructive/10" : "bg-primary/10"
                }`}>
                  <Icon className={`h-5 w-5 ${p.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm text-foreground">{isEn ? p.titleEn : p.titleTh}</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{isEn ? p.descEn : p.descTh}</p>
                </div>
                <ArrowLeft className="h-4 w-4 text-muted-foreground flex-shrink-0 rotate-180" />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Privacy */}
      <PrivacyNote isEn={isEn} />
    </div>
  );
}

function BackButton({ onBack, isEn }: { onBack: () => void; isEn: boolean }) {
  return (
    <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" onClick={onBack}>
      <ArrowLeft className="h-4 w-4 mr-1" />{isEn ? "Back" : "กลับ"}
    </Button>
  );
}

function PrivacyNote({ isEn }: { isEn: boolean }) {
  return (
    <div className="flex items-start gap-2 p-3 rounded-xl bg-muted/30">
      <Shield className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
      <div className="text-[10px] text-muted-foreground leading-relaxed space-y-0.5">
        <p>{isEn
          ? "Your information is confidential. We won't share details without your consent."
          : "ข้อมูลของคุณเป็นความลับ เราจะไม่แชร์รายละเอียดโดยไม่ได้รับความยินยอม"}</p>
        <p>{isEn
          ? "You can stay anonymous. Choose a contact method you're comfortable with."
          : "ไม่จำเป็นต้องเปิดเผยตัวตน เลือกช่องทางติดต่อที่สบายใจ"}</p>
      </div>
    </div>
  );
}
