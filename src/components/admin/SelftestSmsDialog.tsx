import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageSquare, Send, Bell, Phone, Stethoscope, Calendar, HelpCircle, Heart, Shield, Edit3, FileText, Layers } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";

export interface SmsRecipient {
  id: string;
  name: string;
  phone: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  recipients: SmsRecipient[];
  onSent?: () => void;
}

const TEMPLATE_CATEGORIES = [
  { key: "all", labelTh: "ทั้งหมด", labelEn: "All", icon: Layers },
  { key: "followup", labelTh: "ติดตาม", labelEn: "Follow-up", icon: Bell },
  { key: "clinic", labelTh: "คลินิก", labelEn: "Clinic", icon: Stethoscope },
  { key: "retention", labelTh: "ดูแลต่อเนื่อง", labelEn: "Retention", icon: Heart },
  { key: "custom", labelTh: "กำหนดเอง", labelEn: "Custom", icon: Edit3 },
];

const TEMPLATES = [
  {
    key: "first_reactive",
    category: "followup",
    labelTh: "ติดตามผล Reactive",
    labelEn: "Reactive result follow-up",
    icon: Bell,
    bodyTh: "testD: ทีมงานติดต่อเพื่อดูแลคุณต่อ หากต้องการคำปรึกษา โทร 02-632-9501 หรือนัดคลินิก: https://testd.website/clinic/book",
    bodyEn: "testD: Our team is reaching out to support you. For advice, call 02-632-9501 or book a clinic: https://testd.website/clinic/book",
  },
  {
    key: "remind_report",
    category: "followup",
    labelTh: "เตือนรายงานผล",
    labelEn: "Remind to report",
    icon: FileText,
    bodyTh: "testD: ถึงเวลารายงานผลของคุณแล้ว เปิดลิงก์เพื่อบันทึก: https://testd.website/selftest หากต้องการความช่วยเหลือ โทร 02-632-9501",
    bodyEn: "testD: It's time to report your result. Open: https://testd.website/selftest or call 02-632-9501",
  },
  {
    key: "request_callback",
    category: "followup",
    labelTh: "ขอติดต่อกลับ",
    labelEn: "Request callback",
    icon: Phone,
    bodyTh: "testD: ทีมเจ้าหน้าที่อยากติดต่อคุณเพื่อช่วยดูแลต่อ กรุณาโทรกลับ 02-632-9501 ขอบคุณค่ะ",
    bodyEn: "testD: Our care team would like to support you. Please call back 02-632-9501. Thank you.",
  },
  {
    key: "invite_clinic",
    category: "clinic",
    labelTh: "นัดเข้าคลินิก",
    labelEn: "Invite to clinic",
    icon: Stethoscope,
    bodyTh: "testD: เชิญคุณเข้ารับบริการที่คลินิกฟรี นัดเวลาที่สะดวก: https://testd.website/clinic/book โทร 02-632-9501",
    bodyEn: "testD: We invite you to a free clinic visit. Book: https://testd.website/clinic/book or call 02-632-9501",
  },
  {
    key: "clinic_reminder",
    category: "clinic",
    labelTh: "เตือนนัดคลินิก",
    labelEn: "Clinic appointment reminder",
    icon: Calendar,
    bodyTh: "testD: อย่าลืมนัดหมายของคุณ กรุณามาตามเวลานัด หรือติดต่อ 02-632-9501 หากต้องการเปลี่ยนเวลา",
    bodyEn: "testD: Please remember your appointment. Come on time or call 02-632-9501 to reschedule.",
  },
  {
    key: "missed_appointment",
    category: "clinic",
    labelTh: "นัดสาย / ไม่มานัด",
    labelEn: "Missed appointment",
    icon: HelpCircle,
    bodyTh: "testD: เราสังเกตว่าคุณยังไม่ได้มาตามนัด หากต้องการนัดใหม่ โทร 02-632-9501 หรือจองออนไลน์: https://testd.website/clinic/book",
    bodyEn: "testD: We noticed you missed your appointment. To reschedule, call 02-632-9501 or book online: https://testd.website/clinic/book",
  },
  {
    key: "retention_checkin",
    category: "retention",
    labelTh: "เช็คอินดูแลต่อเนื่อง",
    labelEn: "Retention check-in",
    icon: Heart,
    bodyTh: "testD: สวัสดี อยากเช็คว่าคุณสบายดีไหม หากต้องการความช่วยเหลือ โทร 02-632-9501 หรือทักมาได้ตลอด",
    bodyEn: "testD: Hi, we hope you're doing well. If you need support, call 02-632-9501 or reach out anytime.",
  },
  {
    key: "emotional_support",
    category: "retention",
    labelTh: "ให้กำลังใจ",
    labelEn: "Emotional support",
    icon: Heart,
    bodyTh: "testD: เราอยู่เคียงข้างคุณ หากต้องการคุยกับเจ้าหน้าที่ โทร 02-632-9501 คุณไม่ต้องเผชิญเรื่องนี้คนเดียว",
    bodyEn: "testD: We are here for you. If you need to talk to a staff member, call 02-632-9501. You are not alone.",
  },
  {
    key: "prep_info",
    category: "retention",
    labelTh: "ข้อมูล PrEP",
    labelEn: "PrEP info",
    icon: Shield,
    bodyTh: "testD: สนใจเรียนรู้เพิ่มเติมเกี่ยวกับ PrEP หรือการป้องกัน? คลิก: https://testd.website/prep หรือโทร 02-632-9501",
    bodyEn: "testD: Want to learn more about PrEP or prevention? Visit: https://testd.website/prep or call 02-632-9501",
  },
  {
    key: "custom",
    category: "custom",
    labelTh: "กำหนดเอง",
    labelEn: "Custom",
    icon: Edit3,
    bodyTh: "",
    bodyEn: "",
  },
];

// Thai SMS encoding: GSM-7 = 160 chars/segment; Unicode (Thai) = 70 chars/segment
function isUnicode(text: string): boolean {
  return /[^\x00-\x7F]/.test(text);
}
function segmentInfo(text: string) {
  const len = text.length;
  const unicode = isUnicode(text);
  const perSegment = unicode ? 70 : 160;
  const multi = unicode ? 67 : 153;
  let segments = 1;
  if (len > perSegment) segments = Math.ceil(len / multi);
  return { len, segments, unicode };
}

export default function SelftestSmsDialog({ open, onOpenChange, recipients, onSent }: Props) {
  const { language } = useLanguage();
  const t = (th: string, en: string) => (language === "th" ? th : en);
  const [tplKey, setTplKey] = useState<string>(TEMPLATES[0].key);
  const [category, setCategory] = useState<string>("all");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    const tpl = TEMPLATES.find((x) => x.key === tplKey) || TEMPLATES[0];
    const body = language === "th" ? tpl.bodyTh : tpl.bodyEn;
    // When selecting custom, keep existing user text if they have already edited; otherwise start blank.
    if (tpl.key === "custom") {
      setMessage((prev) => prev || body);
    } else {
      setMessage(body);
    }
  }, [open, tplKey, language]);

  const validRecipients = useMemo(
    () => recipients.filter((r) => !!r.phone && r.phone.replace(/\D/g, "").length >= 9),
    [recipients],
  );
  const invalidCount = recipients.length - validRecipients.length;

  const info = segmentInfo(message);

  const filteredTemplates = useMemo(() => {
    if (category === "all") return TEMPLATES;
    return TEMPLATES.filter((t) => t.category === category);
  }, [category]);

  const selectedTpl = TEMPLATES.find((t) => t.key === tplKey) || TEMPLATES[0];
  const isCustom = selectedTpl.key === "custom";

  const send = async () => {
    if (validRecipients.length === 0) {
      toast.error(t("ไม่มีผู้รับที่มีเบอร์ถูกต้อง", "No valid phone numbers"));
      return;
    }
    if (message.trim().length < 2) {
      toast.error(t("ข้อความสั้นเกินไป", "Message too short"));
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("selftest-send-sms", {
        body: {
          request_ids: validRecipients.map((r) => r.id),
          message: message.trim(),
        },
      });
      if (error) throw error;
      const sent = (data as any)?.sent ?? 0;
      const total = (data as any)?.total ?? validRecipients.length;
      if (sent === total) {
        toast.success(t(`ส่ง SMS สำเร็จ ${sent}/${total}`, `Sent ${sent}/${total} SMS`));
      } else {
        toast.warning(t(`ส่งสำเร็จ ${sent}/${total} — ดูประวัติเพื่อตรวจสอบ`, `Sent ${sent}/${total} — check history`));
      }
      onOpenChange(false);
      onSent?.();
    } catch (e: any) {
      toast.error(e?.message || t("ส่งไม่สำเร็จ", "Failed to send"));
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" /> {t("ส่ง SMS", "Send SMS")}
          </DialogTitle>
          <DialogDescription>
            {t(
              "ข้อความจะส่งผ่าน SMSMKT • หลีกเลี่ยงการระบุคำที่ละเอียดอ่อน (เช่น HIV/ผลตรวจ) ใน SMS",
              "Sent via SMSMKT • Avoid sensitive words (e.g. HIV/result) in SMS",
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1">
              {t("ผู้รับ", "Recipients")}
            </div>
            <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto p-2 border rounded">
              {recipients.length === 0 && (
                <span className="text-xs text-muted-foreground">{t("ไม่มีผู้รับ", "No recipients")}</span>
              )}
              {recipients.slice(0, 30).map((r) => {
                const ok = !!r.phone && r.phone.replace(/\D/g, "").length >= 9;
                return (
                  <Badge key={r.id} variant={ok ? "secondary" : "destructive"} className="text-[11px]">
                    {r.name} {ok ? `· ${r.phone}` : `· ${t("เบอร์ไม่ถูกต้อง", "invalid")}`}
                  </Badge>
                );
              })}
              {recipients.length > 30 && (
                <Badge variant="outline">+{recipients.length - 30}</Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {t(`พร้อมส่ง ${validRecipients.length} รายการ`, `${validRecipients.length} ready`)}
              {invalidCount > 0 && (
                <span className="text-destructive ml-2">
                  · {t(`ข้าม ${invalidCount} (เบอร์ไม่ถูกต้อง)`, `skipping ${invalidCount} invalid`)}
                </span>
              )}
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-muted-foreground mb-2">
              {t("เลือกเทมเพลต", "Choose a template")}
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {TEMPLATE_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const active = category === cat.key;
                return (
                  <Button
                    key={cat.key}
                    size="sm"
                    variant={active ? "default" : "outline"}
                    className="h-8 gap-1.5 text-xs"
                    onClick={() => setCategory(cat.key)}
                    type="button"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {language === "th" ? cat.labelTh : cat.labelEn}
                  </Button>
                );
              })}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 border rounded">
              {filteredTemplates.map((tpl) => {
                const Icon = tpl.icon;
                const active = tplKey === tpl.key;
                const seg = segmentInfo(language === "th" ? tpl.bodyTh : tpl.bodyEn);
                return (
                  <button
                    key={tpl.key}
                    type="button"
                    onClick={() => setTplKey(tpl.key)}
                    className={[
                      "flex flex-col items-start gap-1 p-2.5 rounded-md border text-left transition-colors",
                      "hover:bg-accent hover:text-accent-foreground",
                      active ? "border-primary bg-primary/10 text-primary" : "bg-card",
                    ].join(" ")}
                  >
                    <div className="flex items-center gap-1.5">
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="text-xs font-medium line-clamp-1">
                        {language === "th" ? tpl.labelTh : tpl.labelEn}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {seg.len} {t("ตัวอักษร", "chars")} · {seg.segments} {t("ส่วน", "seg")}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              {t("คลิกเทมเพลตเพื่อใส่ข้อความ จากนั้นสามารถแก้ไขได้ก่อนส่ง", "Click a template to fill the message, then edit before sending")}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground">
                {isCustom
                  ? t("ข้อความกำหนดเอง", "Custom message")
                  : t(`เทมเพลต: ${language === "th" ? selectedTpl.labelTh : selectedTpl.labelEn}`, `Template: ${language === "en" ? selectedTpl.labelEn : selectedTpl.labelTh}`)}
              </span>
              <span className="text-xs text-muted-foreground">
                {info.len} {t("ตัวอักษร", "chars")} · {info.segments} {t("ส่วน", "seg")} ·{" "}
                {info.unicode ? "Unicode" : "GSM-7"}
              </span>
            </div>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              maxLength={459}
              placeholder={t("พิมพ์ข้อความ...", "Type your message...")}
            />
            <div className="text-[11px] text-muted-foreground mt-1">
              {t(
                "หลายส่วน = หลายเครดิต (Unicode 67 ตัว/ส่วน, GSM 153 ตัว/ส่วน)",
                "Multi-segment = multi-credit (Unicode 67/seg, GSM 153/seg)",
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            {t("ยกเลิก", "Cancel")}
          </Button>
          <Button onClick={send} disabled={sending || validRecipients.length === 0}>
            {sending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
            {t(`ส่ง ${validRecipients.length} ราย`, `Send ${validRecipients.length}`)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
