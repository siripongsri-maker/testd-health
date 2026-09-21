import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";
import { Loader2, QrCode, Copy, CheckCircle2, ExternalLink, Printer } from "lucide-react";

/**
 * QR + link for the post-counseling evaluation of ONE case.
 *
 * The link is minted from `ensure_post_eval_link`, which guarantees the case has
 * a counseling note + token, and returns the linkage shown to staff
 * (UIC · branch · counselor · date). The submitted evaluation is stored with the
 * same linkage, so it lands in the "ประเมินหลังคำปรึกษา" tab already matched.
 */
interface LinkContext {
  note_id: string;
  token: string;
  uic_display: string | null;
  branch_name_th: string | null;
  branch_name_en: string | null;
  counselor_name: string | null;
  counseling_date: string | null;
  status: string | null;
  has_evaluation: boolean;
}

export default function PostEvalQrDialog({
  surveyId,
  caseCode,
}: {
  surveyId: string;
  caseCode?: string | null;
}) {
  const { language } = useLanguage();
  const tx = (th: string, en: string) => (language === "th" ? th : en);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ctx, setCtx] = useState<LinkContext | null>(null);
  const [copied, setCopied] = useState(false);

  const formUrl = ctx ? `${window.location.origin}/post-counseling/${ctx.token}` : "";
  const posterUrl = ctx ? `${window.location.origin}/post-counseling-qr/${ctx.token}` : "";

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("ensure_post_eval_link", { _survey_id: surveyId } as any);
    setLoading(false);
    if (error) {
      toast({
        title: tx("สร้างลิงก์ประเมินไม่สำเร็จ", "Could not create evaluation link"),
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    const row = (data as any[])?.[0];
    if (!row) {
      toast({ title: tx("ไม่พบข้อมูลเคสนี้", "Case not found"), variant: "destructive" });
      return;
    }
    setCtx(row as LinkContext);
    setOpen(true);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(formUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* noop */ }
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="h-8 gap-1.5 text-xs no-print"
        onClick={load}
        disabled={loading}
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <QrCode className="h-3.5 w-3.5" />}
        {tx("QR ประเมินหลังคำปรึกษา", "Post-counseling QR")}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{tx("แบบประเมินหลังรับการปรึกษา", "Post-counseling evaluation")}</DialogTitle>
            <DialogDescription>
              {tx("ให้ผู้รับบริการสแกน QR หรือเปิดลิงก์นี้ ใช้เวลาประมาณ 1 นาที",
                  "Ask the client to scan this QR or open the link — about 1 minute.")}
            </DialogDescription>
          </DialogHeader>

          {ctx && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-3 text-xs space-y-1">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{tx("รหัสเคส (UIC)", "Case code (UIC)")}</span>
                  <span className="font-mono font-medium">{ctx.uic_display || caseCode || "—"}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{tx("สาขา", "Branch")}</span>
                  <span>{(language === "th" ? ctx.branch_name_th : ctx.branch_name_en) || "—"}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{tx("ผู้ให้คำปรึกษา", "Counselor")}</span>
                  <span>{ctx.counselor_name || tx("ยังไม่ระบุ", "Unassigned")}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{tx("วันที่", "Date")}</span>
                  <span>{ctx.counseling_date || "—"}</span>
                </div>
              </div>

              {ctx.has_evaluation && (
                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                  {tx("เคสนี้ประเมินแล้ว", "Already evaluated")}
                </Badge>
              )}

              <div className="mx-auto w-fit rounded-2xl border bg-white p-4 shadow-inner">
                <QRCodeSVG value={formUrl} size={200} level="M" bgColor="#ffffff" fgColor="#0f766e" />
              </div>

              <p className="break-all rounded-md bg-muted px-2 py-1.5 text-[11px] text-muted-foreground">
                {formUrl}
              </p>

              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={copy}>
                  {copied ? <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-teal-600" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
                  {copied ? tx("คัดลอกแล้ว", "Copied") : tx("คัดลอกลิงก์", "Copy link")}
                </Button>
                <Button asChild size="sm" variant="outline">
                  <a href={formUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                    {tx("เปิดแบบประเมิน", "Open form")}
                  </a>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <a href={posterUrl} target="_blank" rel="noopener noreferrer">
                    <Printer className="mr-1.5 h-3.5 w-3.5" />
                    {tx("หน้า QR เต็มจอ", "Full-screen QR")}
                  </a>
                </Button>
              </div>

              <p className="text-[11px] text-muted-foreground">
                {tx("ผลการประเมินจะไปแสดงที่ แบบสำรวจก่อนรับบริการ › แท็บ ประเมินหลังคำปรึกษา โดยผูก UIC สาขา ผู้ให้คำปรึกษา และวันที่ ให้อัตโนมัติ",
                    "Responses appear under Pre-Service Survey › Post-Counseling tab, linked to UIC, branch, counselor and date.")}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
