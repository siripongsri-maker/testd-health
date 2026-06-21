import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageSquare, Send, Bell, Phone, Stethoscope, Calendar, HelpCircle, Heart, Shield, Edit3, FileText, Layers, Eye, ChevronLeft, ChevronRight, Package, Truck } from "lucide-react";
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
  initialTemplateKey?: string;
  /** "selftest" (default) sends via hiv_selftest_requests.id; "kit_orders" sends to kit_orders.id recipients. */
  source?: "selftest" | "kit_orders";
}

const TEMPLATE_CATEGORIES = [
  { key: "all", labelTh: "ทั้งหมด", labelEn: "All", icon: Layers },
  { key: "followup", labelTh: "ติดตาม", labelEn: "Follow-up", icon: Bell },
  { key: "shipping", labelTh: "ส่งชุดตรวจ", labelEn: "Shipping", icon: Truck },
  { key: "clinic", labelTh: "คลินิก", labelEn: "Clinic", icon: Stethoscope },
  { key: "retention", labelTh: "ดูแลต่อเนื่อง", labelEn: "Retention", icon: Heart },
  { key: "custom", labelTh: "กำหนดเอง", labelEn: "Custom", icon: Edit3 },
];

const TEMPLATES = [
  {
    key: "kit_shipped_check_arrival",
    category: "shipping",
    labelTh: "จัดส่งแล้ว: เช็คพัสดุ",
    labelEn: "Shipped: confirm arrival",
    icon: Truck,
    bodyTh: "testD: คุณ {{name}} ชุดตรวจของคุณถูกจัดส่งแล้ว เมื่อได้รับพัสดุกรุณาเข้าระบบเพื่อยืนยันการรับ: https://testd.website/selftest หากมีปัญหา โทร 02-632-9501",
    bodyEn: "testD: Hi {{name}}, your test kit has been shipped. Once it arrives, please confirm receipt in the app: https://testd.website/selftest — questions? Call 02-632-9501",
  },
  {
    key: "kit_delivered_remind_test",
    category: "shipping",
    labelTh: "ถึงแล้ว: เตือนตรวจ + รายงานผล",
    labelEn: "Delivered: test & report reminder",
    icon: Package,
    bodyTh: "testD: คุณ {{name}} ชุดตรวจของคุณถึงแล้ว อย่าลืมทำตามคู่มือและรายงานผลในระบบ: https://testd.website/selftest หากต้องการคำปรึกษา โทร 02-632-9501",
    bodyEn: "testD: Hi {{name}}, your test kit has arrived. Please follow the guide and report your result in the app: https://testd.website/selftest — need support? Call 02-632-9501",
  },
  {
    key: "first_reactive",
    category: "followup",
    labelTh: "ติดตามผล Reactive",
    labelEn: "Reactive result follow-up",
    icon: Bell,
    bodyTh: "testD: สวัสดีคุณ {{name}} ทีมงานติดต่อเพื่อดูแลคุณต่อ หากต้องการคำปรึกษา โทร 02-632-9501 หรือนัดคลินิก: https://testd.website/clinic/book",
    bodyEn: "testD: Hi {{name}}, our team is reaching out to support you. For advice, call 02-632-9501 or book a clinic: https://testd.website/clinic/book",
  },
  {
    key: "remind_report",
    category: "followup",
    labelTh: "เตือนรายงานผล",
    labelEn: "Remind to report",
    icon: FileText,
    bodyTh: "testD: คุณ {{name}} ถึงเวลารายงานผลของคุณแล้ว เปิดลิงก์เพื่อบันทึก: https://testd.website/selftest หากต้องการความช่วยเหลือ โทร 02-632-9501",
    bodyEn: "testD: Hi {{name}}, it's time to report your result. Open: https://testd.website/selftest or call 02-632-9501",
  },
  {
    key: "request_callback",
    category: "followup",
    labelTh: "ขอติดต่อกลับ",
    labelEn: "Request callback",
    icon: Phone,
    bodyTh: "testD: สวัสดีคุณ {{name}} ทีมเจ้าหน้าที่อยากติดต่อคุณเพื่อช่วยดูแลต่อ กรุณาโทรกลับ 02-632-9501 ขอบคุณค่ะ",
    bodyEn: "testD: Hi {{name}}, our care team would like to support you. Please call back 02-632-9501. Thank you.",
  },
  {
    key: "invite_clinic",
    category: "clinic",
    labelTh: "นัดเข้าคลินิก",
    labelEn: "Invite to clinic",
    icon: Stethoscope,
    bodyTh: "testD: คุณ {{name}} เชิญคุณเข้ารับบริการที่คลินิกฟรี นัดเวลาที่สะดวก: https://testd.website/clinic/book โทร 02-632-9501",
    bodyEn: "testD: Hi {{name}}, we invite you to a free clinic visit. Book: https://testd.website/clinic/book or call 02-632-9501",
  },
  {
    key: "clinic_reminder",
    category: "clinic",
    labelTh: "เตือนนัดคลินิก",
    labelEn: "Clinic appointment reminder",
    icon: Calendar,
    bodyTh: "testD: คุณ {{name}} อย่าลืมนัดหมายของคุณ กรุณามาตามเวลานัด หรือติดต่อ 02-632-9501 หากต้องการเปลี่ยนเวลา",
    bodyEn: "testD: Hi {{name}}, please remember your appointment. Come on time or call 02-632-9501 to reschedule.",
  },
  {
    key: "missed_appointment",
    category: "clinic",
    labelTh: "นัดสาย / ไม่มานัด",
    labelEn: "Missed appointment",
    icon: HelpCircle,
    bodyTh: "testD: คุณ {{name}} เราสังเกตว่าคุณยังไม่ได้มาตามนัด หากต้องการนัดใหม่ โทร 02-632-9501 หรือจองออนไลน์: https://testd.website/clinic/book",
    bodyEn: "testD: Hi {{name}}, we noticed you missed your appointment. To reschedule, call 02-632-9501 or book online: https://testd.website/clinic/book",
  },
  {
    key: "retention_checkin",
    category: "retention",
    labelTh: "เช็คอินดูแลต่อเนื่อง",
    labelEn: "Retention check-in",
    icon: Heart,
    bodyTh: "testD: สวัสดีคุณ {{name}} อยากเช็คว่าคุณสบายดีไหม หากต้องการความช่วยเหลือ โทร 02-632-9501 หรือทักมาได้ตลอด",
    bodyEn: "testD: Hi {{name}}, we hope you're doing well. If you need support, call 02-632-9501 or reach out anytime.",
  },
  {
    key: "emotional_support",
    category: "retention",
    labelTh: "ให้กำลังใจ",
    labelEn: "Emotional support",
    icon: Heart,
    bodyTh: "testD: คุณ {{name}} เราอยู่เคียงข้างคุณ หากต้องการคุยกับเจ้าหน้าที่ โทร 02-632-9501 คุณไม่ต้องเผชิญเรื่องนี้คนเดียว",
    bodyEn: "testD: Hi {{name}}, we are here for you. If you need to talk to a staff member, call 02-632-9501. You are not alone.",
  },
  {
    key: "prep_info",
    category: "retention",
    labelTh: "ข้อมูล PrEP",
    labelEn: "PrEP info",
    icon: Shield,
    bodyTh: "testD: คุณ {{name}} สนใจข้อมูล PrEP หรือการป้องกัน? นัดคลินิก: https://testd.website/clinic/book หรือโทร 02-632-9501",
    bodyEn: "testD: Hi {{name}}, interested in PrEP or prevention? Book a clinic visit: https://testd.website/clinic/book or call 02-632-9501",
  },
  {
    key: "negative_prep_invite",
    category: "retention",
    labelTh: "เชิญรับ PrEP (ผล Negative)",
    labelEn: "Invite for PrEP (Negative)",
    icon: Shield,
    bodyTh: "testD: คุณ {{name}} ผลล่าสุดเป็นลบ ขอแนะนำให้รับยา PrEP เพื่อป้องกันต่อเนื่อง ฟรี! นัดคลินิก: https://testd.website/clinic/book หรือโทร 02-632-9501",
    bodyEn: "testD: Hi {{name}}, your recent result is negative. We recommend starting PrEP for ongoing protection — free! Book: https://testd.website/clinic/book or call 02-632-9501",
  },
  {
    key: "negative_prep_pickup",
    category: "retention",
    labelTh: "ติดต่อรับยา PrEP",
    labelEn: "Contact to pick up PrEP",
    icon: Shield,
    bodyTh: "testD: คุณ {{name}} กรุณาติดต่อรับยา PrEP ที่คลินิก โทร 02-632-9501 หรือจองเวลา: https://testd.website/clinic/book",
    bodyEn: "testD: Hi {{name}}, please contact the clinic to pick up your PrEP. Call 02-632-9501 or book: https://testd.website/clinic/book",
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

// Variables available for substitution in templates
const TEMPLATE_VARIABLES = [
  { token: "{{name}}", labelTh: "ชื่อผู้รับ", labelEn: "Recipient name" },
  { token: "{{phone}}", labelTh: "เบอร์โทร", labelEn: "Phone number" },
];

function renderMessage(template: string, recipient: { name?: string; phone?: string } | null, fallbackName: string) {
  const name = (recipient?.name || "").trim() || fallbackName;
  const phone = (recipient?.phone || "").trim();
  return template
    .replace(/\{\{\s*name\s*\}\}/gi, name)
    .replace(/\{\{\s*phone\s*\}\}/gi, phone);
}

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

export default function SelftestSmsDialog({ open, onOpenChange, recipients, onSent, initialTemplateKey, source = "selftest" }: Props) {
  const { language } = useLanguage();
  const t = (th: string, en: string) => (language === "th" ? th : en);
  const [tplKey, setTplKey] = useState<string>(initialTemplateKey || TEMPLATES[0].key);
  const [category, setCategory] = useState<string>("all");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [previewIdx, setPreviewIdx] = useState(0);
  const [showAllPreviews, setShowAllPreviews] = useState(false);

  // When dialog opens, sync to the requested initial template (if provided)
  useEffect(() => {
    if (open && initialTemplateKey && TEMPLATES.some((x) => x.key === initialTemplateKey)) {
      setTplKey(initialTemplateKey);
    }
  }, [open, initialTemplateKey]);

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

  const fallbackName = t("คุณ", "there");
  const previewRecipient = validRecipients[Math.min(previewIdx, Math.max(validRecipients.length - 1, 0))] || null;
  const previewMessage = renderMessage(message, previewRecipient, fallbackName);
  const previewInfo = segmentInfo(previewMessage);
  const hasUnresolvedVars = /\{\{\s*\w+\s*\}\}/.test(previewMessage);

  // Reset preview index when recipient list changes or dialog reopens
  useEffect(() => {
    setPreviewIdx(0);
    setShowAllPreviews(false);
  }, [open, recipients.length]);

  const insertVariable = (token: string) => {
    setMessage((prev) => (prev ? `${prev} ${token}` : token));
  };

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
      const invokeBody: Record<string, any> = {
        message: message.trim(),
        template_key: selectedTpl.key,
        template_label: selectedTpl.labelEn,
        track_links: true,
      };
      if (source === "kit_orders") {
        invokeBody.kit_recipients = validRecipients.map((r) => ({ id: r.id, name: r.name, phone: r.phone }));
      } else {
        invokeBody.request_ids = validRecipients.map((r) => r.id);
      }
      const { data, error } = await supabase.functions.invoke("selftest-send-sms", { body: invokeBody });
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
                  : `${t("เทมเพลต", "Template")}: ${language === "th" ? selectedTpl.labelTh : selectedTpl.labelEn}`}
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
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="text-[11px] text-muted-foreground mr-1">
                {t("ใส่ตัวแปร:", "Insert variable:")}
              </span>
              {TEMPLATE_VARIABLES.map((v) => (
                <Button
                  key={v.token}
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 text-[11px] font-mono"
                  onClick={() => insertVariable(v.token)}
                  title={language === "th" ? v.labelTh : v.labelEn}
                >
                  {v.token}
                </Button>
              ))}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              {t(
                "หลายส่วน = หลายเครดิต (Unicode 67 ตัว/ส่วน, GSM 153 ตัว/ส่วน) • ตัวแปรจะถูกแทนค่าตอนส่งโดยอัตโนมัติ",
                "Multi-segment = multi-credit (Unicode 67/seg, GSM 153/seg) • Variables are replaced at send time",
              )}
            </div>
          </div>

          {/* Preview panel */}
          <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <Eye className="h-3.5 w-3.5" />
                {t("ตัวอย่างข้อความ", "Message preview")}
                {validRecipients.length > 1 && (
                  <Badge variant="secondary" className="text-[10px] ml-1">
                    {validRecipients.length} {t("ผู้รับ", "recipients")}
                  </Badge>
                )}
              </div>
              {validRecipients.length > 1 && (
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-[11px]"
                    onClick={() => setShowAllPreviews((v) => !v)}
                  >
                    {showAllPreviews
                      ? t("ดูทีละราย", "One at a time")
                      : t(`ดูทั้งหมด (${Math.min(validRecipients.length, 10)})`, `View all (${Math.min(validRecipients.length, 10)})`)}
                  </Button>
                  {!showAllPreviews && (
                    <>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-7 w-7"
                        disabled={previewIdx <= 0}
                        onClick={() => setPreviewIdx((i) => Math.max(0, i - 1))}
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </Button>
                      <span className="text-[11px] text-muted-foreground tabular-nums">
                        {previewIdx + 1}/{validRecipients.length}
                      </span>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-7 w-7"
                        disabled={previewIdx >= validRecipients.length - 1}
                        onClick={() => setPreviewIdx((i) => Math.min(validRecipients.length - 1, i + 1))}
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>

            {validRecipients.length === 0 ? (
              <div className="text-xs text-muted-foreground italic py-3 text-center">
                {t("ไม่มีผู้รับที่มีเบอร์ถูกต้องสำหรับดูตัวอย่าง", "No valid recipient to preview")}
              </div>
            ) : showAllPreviews ? (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {validRecipients.slice(0, 10).map((r) => {
                  const msg = renderMessage(message, r, fallbackName);
                  const seg = segmentInfo(msg);
                  return (
                    <div key={r.id} className="rounded-md border bg-background p-2.5">
                      <div className="flex items-center justify-between mb-1 text-[11px] text-muted-foreground">
                        <span className="font-medium text-foreground">{r.name} · {r.phone}</span>
                        <span>{seg.len} · {seg.segments} {t("ส่วน", "seg")}</span>
                      </div>
                      <div className="text-xs whitespace-pre-wrap leading-relaxed">{msg || <span className="italic text-muted-foreground">{t("(ข้อความว่าง)", "(empty)")}</span>}</div>
                    </div>
                  );
                })}
                {validRecipients.length > 10 && (
                  <div className="text-[11px] text-muted-foreground text-center pt-1">
                    {t(`+ อีก ${validRecipients.length - 10} ราย`, `+ ${validRecipients.length - 10} more`)}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-md border bg-background p-3">
                {previewRecipient && (
                  <div className="flex items-center justify-between mb-2 text-[11px] text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {previewRecipient.name} · {previewRecipient.phone}
                    </span>
                    <span>
                      {previewInfo.len} · {previewInfo.segments} {t("ส่วน", "seg")}
                    </span>
                  </div>
                )}
                <div className="text-sm whitespace-pre-wrap leading-relaxed">
                  {previewMessage || (
                    <span className="italic text-muted-foreground">
                      {t("(ข้อความว่าง)", "(empty message)")}
                    </span>
                  )}
                </div>
              </div>
            )}

            {hasUnresolvedVars && (
              <div className="text-[11px] text-destructive flex items-center gap-1">
                <HelpCircle className="h-3 w-3" />
                {t(
                  "พบตัวแปรที่ไม่รู้จัก — ตรวจสอบการสะกด {{name}} / {{phone}}",
                  "Unknown variable found — check spelling of {{name}} / {{phone}}",
                )}
              </div>
            )}
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
