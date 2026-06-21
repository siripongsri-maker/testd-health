import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageSquare, Send } from "lucide-react";
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

const TEMPLATES = [
  {
    key: "remind_report",
    labelTh: "เตือนรายงานผล",
    labelEn: "Remind to report",
    bodyTh: "testD: ถึงเวลารายงานผลของคุณแล้ว เปิดลิงก์เพื่อบันทึก: https://testd.website/selftest หากต้องการความช่วยเหลือ โทร 02-632-9501",
    bodyEn: "testD: It's time to report your result. Open: https://testd.website/selftest or call 02-632-9501",
  },
  {
    key: "request_followup",
    labelTh: "ขอติดต่อกลับ",
    labelEn: "Request callback",
    bodyTh: "testD: ทีมเจ้าหน้าที่อยากติดต่อคุณเพื่อช่วยดูแลต่อ กรุณาโทรกลับ 02-632-9501 ขอบคุณค่ะ",
    bodyEn: "testD: Our care team would like to support you. Please call back 02-632-9501. Thank you.",
  },
  {
    key: "invite_clinic",
    labelTh: "นัดเข้าคลินิก",
    labelEn: "Invite to clinic",
    bodyTh: "testD: เชิญคุณเข้ารับบริการที่คลินิกฟรี นัดเวลาที่สะดวก: https://testd.website/clinic/book โทร 02-632-9501",
    bodyEn: "testD: We invite you to a free clinic visit. Book: https://testd.website/clinic/book or call 02-632-9501",
  },
] as const;

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
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    const tpl = TEMPLATES.find((x) => x.key === tplKey) || TEMPLATES[0];
    setMessage(language === "th" ? tpl.bodyTh : tpl.bodyEn);
  }, [open, tplKey, language]);

  const validRecipients = useMemo(
    () => recipients.filter((r) => !!r.phone && r.phone.replace(/\D/g, "").length >= 9),
    [recipients],
  );
  const invalidCount = recipients.length - validRecipients.length;

  const info = segmentInfo(message);

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
      <DialogContent className="max-w-lg">
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

        <div className="space-y-3">
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
            <div className="text-xs font-medium text-muted-foreground mb-1">
              {t("เทมเพลต", "Template")}
            </div>
            <div className="flex flex-wrap gap-2">
              {TEMPLATES.map((tpl) => (
                <Button
                  key={tpl.key}
                  size="sm"
                  variant={tplKey === tpl.key ? "default" : "outline"}
                  onClick={() => setTplKey(tpl.key)}
                  type="button"
                >
                  {language === "th" ? tpl.labelTh : tpl.labelEn}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground">
                {t("ข้อความ", "Message")}
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
