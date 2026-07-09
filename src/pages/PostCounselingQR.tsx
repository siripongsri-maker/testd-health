import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, HeartHandshake, ShieldCheck, ExternalLink, Copy, CheckCircle2 } from "lucide-react";

export default function PostCounselingQR() {
  const { token } = useParams<{ token: string }>();
  const { language } = useLanguage();
  const tx = (th: string, en: string) => (language === "th" ? th : en);

  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(false);
  const [copied, setCopied] = useState(false);

  const formUrl = token ? `${window.location.origin}/post-counseling/${token}` : "";

  useEffect(() => {
    (async () => {
      if (!token) { setValid(false); setLoading(false); return; }
      const { data, error } = await supabase.rpc("get_post_eval_context", { _token: token });
      const row = (data as any[])?.[0];
      setValid(!error && !!row);
      setLoading(false);
    })();
  }, [token]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(formUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* noop */ }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!valid) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="max-w-md w-full p-8 text-center space-y-3">
          <p className="text-lg font-bold">
            {tx("ลิงก์ประเมินนี้ไม่พร้อมใช้งาน", "This evaluation link is not available")}
          </p>
          <p className="text-sm text-muted-foreground">
            {tx("กรุณาติดต่อเจ้าหน้าที่ SWING", "Please contact SWING staff.")}
          </p>
          <Button asChild variant="outline"><Link to="/">{tx("กลับหน้าหลัก", "Back to home")}</Link></Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-rose-50 dark:from-teal-950/30 dark:via-background dark:to-rose-950/20 flex items-center justify-center p-6">
      <Card className="max-w-lg w-full p-8 rounded-3xl border-2 border-teal-200 shadow-xl text-center space-y-6">
        <div className="flex items-center justify-center gap-2">
          <div className="h-10 w-10 rounded-full bg-teal-500/15 flex items-center justify-center">
            <HeartHandshake className="h-5 w-5 text-teal-600" />
          </div>
          <div className="text-left">
            <div className="text-[11px] uppercase tracking-wider font-bold text-teal-600">
              testD × SWING
            </div>
            <div className="text-xs text-muted-foreground">
              {tx("บริการโดย SWING Thailand", "Provided by SWING Thailand")}
            </div>
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-bold">
            {tx("แบบประเมินหลังรับคำปรึกษา", "Post-Counseling Evaluation")}
          </h1>
          <p className="text-sm text-muted-foreground mt-2 flex items-center justify-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />
            {tx("สแกน QR เพื่อให้ความคิดเห็นแบบไม่ระบุตัวตน · ใช้เวลา 1 นาที",
                "Scan the QR to share anonymous feedback · takes 1 minute")}
          </p>
        </div>

        <div className="mx-auto bg-white p-4 rounded-2xl shadow-inner border w-fit">
          <QRCodeSVG value={formUrl} size={240} level="M" bgColor="#ffffff" fgColor="#0f766e" />
        </div>

        <p className="text-xs text-muted-foreground">
          {tx("หรือแตะปุ่มด้านล่างเพื่อเปิดแบบประเมิน",
              "Or tap the button below to open the evaluation form")}
        </p>

        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button asChild size="lg" className="bg-teal-600 hover:bg-teal-700">
            <a href={formUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              {tx("เปิดแบบประเมิน", "Open evaluation form")}
            </a>
          </Button>
          <Button variant="outline" size="lg" onClick={copy}>
            {copied ? <CheckCircle2 className="h-4 w-4 mr-2 text-teal-600" /> : <Copy className="h-4 w-4 mr-2" />}
            {copied ? tx("คัดลอกแล้ว", "Copied") : tx("คัดลอกลิงก์", "Copy link")}
          </Button>
        </div>

        <p className="text-[11px] text-muted-foreground pt-2 border-t">
          {tx("🔒 ข้อมูลของคุณจะถูกเก็บเป็นความลับ · ไม่มีการเก็บชื่อหรือข้อมูลติดต่อ",
              "🔒 Your responses are confidential · no name or contact info collected")}
        </p>
      </Card>
    </div>
  );
}
