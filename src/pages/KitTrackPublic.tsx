import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Package, Truck, Check, CheckCircle2, ExternalLink, Search, ArrowLeft, ShieldCheck } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { toast } from "sonner";
import { AutoSEO } from "@/components/seo/AutoSEO";

type OrderStatus =
  | "requested" | "packed" | "shipped" | "out_for_delivery" | "delivered_unconfirmed" | "received_confirmed";

interface PublicOrder {
  order_code: string;
  recipient_name_masked: string;
  status: OrderStatus;
  shipping_carrier: string | null;
  tracking_number: string | null;
  carrier_tracking_url: string | null;
  created_at: string;
  packed_at: string | null;
  shipped_at: string | null;
  out_for_delivery_at: string | null;
  delivered_at: string | null;
  received_at: string | null;
}

const STATUS_STEPS: Array<{ key: OrderStatus; labelTh: string; labelEn: string; icon: any; tsField: keyof PublicOrder }> = [
  { key: "requested", labelTh: "รับคำขอแล้ว", labelEn: "Requested", icon: Package, tsField: "created_at" },
  { key: "packed", labelTh: "จัดเตรียมแล้ว", labelEn: "Packed", icon: Package, tsField: "packed_at" },
  { key: "shipped", labelTh: "จัดส่งแล้ว", labelEn: "Shipped", icon: Truck, tsField: "shipped_at" },
  { key: "out_for_delivery", labelTh: "กำลังจัดส่ง", labelEn: "Out for delivery", icon: Truck, tsField: "out_for_delivery_at" },
  { key: "delivered_unconfirmed", labelTh: "ถึงปลายทางแล้ว", labelEn: "Delivered", icon: Check, tsField: "delivered_at" },
  { key: "received_confirmed", labelTh: "ผู้รับยืนยันแล้ว", labelEn: "Received", icon: CheckCircle2, tsField: "received_at" },
];

const STATUS_BADGE: Record<OrderStatus, { th: string; en: string; cls: string }> = {
  requested: { th: "รับคำขอแล้ว", en: "Requested", cls: "bg-muted text-muted-foreground" },
  packed: { th: "จัดเตรียมแล้ว", en: "Packed", cls: "bg-blue-500/15 text-blue-600 dark:text-blue-300" },
  shipped: { th: "จัดส่งแล้ว", en: "Shipped", cls: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300" },
  out_for_delivery: { th: "กำลังจัดส่ง", en: "Out for delivery", cls: "bg-violet-500/15 text-violet-600 dark:text-violet-300" },
  delivered_unconfirmed: { th: "ถึงปลายทางแล้ว", en: "Delivered", cls: "bg-orange-500/15 text-orange-600 dark:text-orange-300" },
  received_confirmed: { th: "ยืนยันรับแล้ว", en: "Received", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
};

const PROJECT_REF = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const FN_URL = `https://${PROJECT_REF}.supabase.co/functions/v1/kit-public-status`;

export default function KitTrackPublic() {
  const { code: codeFromUrl } = useParams<{ code: string }>();
  const [searchParams] = useSearchParams();
  const { language } = useLanguage();
  const t = (th: string, en: string) => (language === "th" ? th : en);

  const initialCode = (codeFromUrl || searchParams.get("code") || "").toUpperCase();
  const [code, setCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [justConfirmed, setJustConfirmed] = useState(false);

  const fetchStatus = async (lookupCode: string) => {
    const c = (lookupCode || "").trim().toUpperCase();
    if (!c) return;
    setLoading(true);
    setNotFound(false);
    setOrder(null);
    try {
      const res = await fetch(`${FN_URL}?code=${encodeURIComponent(c)}`, {
        headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
      });
      if (res.status === 404) {
        setNotFound(true);
      } else if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `http_${res.status}`);
      } else {
        const j = await res.json();
        setOrder(j.order as PublicOrder);
      }
    } catch (e: any) {
      toast.error(e?.message || t("เกิดข้อผิดพลาด", "Error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialCode) fetchStatus(initialCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode]);

  const confirmReceived = async () => {
    if (!order) return;
    setConfirming(true);
    try {
      const res = await fetch(FN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: ANON_KEY,
          Authorization: `Bearer ${ANON_KEY}`,
        },
        body: JSON.stringify({ code: order.order_code, action: "confirm_received" }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || `http_${res.status}`);
      setOrder(j.order as PublicOrder);
      setJustConfirmed(true);
      toast.success(t("ยืนยันรับพัสดุสำเร็จ ขอบคุณค่ะ", "Receipt confirmed. Thank you!"));
    } catch (e: any) {
      toast.error(e?.message || t("ยืนยันไม่สำเร็จ", "Failed to confirm"));
    } finally {
      setConfirming(false);
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return "-";
    return new Date(d).toLocaleString(language === "th" ? "th-TH" : "en-US", {
      timeZone: "Asia/Bangkok",
      year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };

  const currentIndex = order ? STATUS_STEPS.findIndex((s) => s.key === order.status) : -1;
  const badge = order ? STATUS_BADGE[order.status] : null;

  return (
    <div className="min-h-screen bg-background">
      <AutoSEO />
      <title>{t("ติดตามชุดตรวจ — testD", "Track your test kit — testD")}</title>
      <meta name="robots" content="noindex,nofollow" />
      <meta name="description" content={t("ตรวจสอบสถานะการจัดส่งชุดตรวจของคุณ", "Check your test kit shipment status")} />
      <div className="max-w-2xl mx-auto p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> testD
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold">{t("ติดตามชุดตรวจ", "Track your test kit")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t(
              "ดูสถานะการจัดส่งและยืนยันเมื่อได้รับพัสดุ — ไม่ต้องเข้าสู่ระบบ",
              "View shipment status and confirm receipt — no sign-in required",
            )}
          </p>
        </div>

        <Card className="p-4 mb-6">
          <div className="flex gap-2">
            <Input
              placeholder={t("ใส่รหัสติดตาม เช่น KIT-XXXXXX", "Enter order code, e.g. KIT-XXXXXX")}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="font-mono"
              onKeyDown={(e) => e.key === "Enter" && fetchStatus(code)}
            />
            <Button onClick={() => fetchStatus(code)} disabled={loading || !code.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
          {notFound && (
            <p className="text-sm text-destructive mt-3">
              {t("ไม่พบรหัสนี้ กรุณาตรวจสอบอีกครั้ง", "Order code not found. Please check and try again.")}
            </p>
          )}
        </Card>

        {order && badge && (
          <Card className="p-5 mb-4">
            <div className="flex items-start justify-between mb-4 gap-2 flex-wrap">
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t("รหัสติดตาม", "Order Code")}</p>
                <code className="text-lg font-mono font-bold">{order.order_code}</code>
                {order.recipient_name_masked && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("ผู้รับ", "Recipient")}: {order.recipient_name_masked}
                  </p>
                )}
              </div>
              <Badge className={`${badge.cls} border-0`}>
                {language === "th" ? badge.th : badge.en}
              </Badge>
            </div>

            <div className="space-y-3 mb-5">
              {STATUS_STEPS.map((step, index) => {
                const isCompleted = index <= currentIndex;
                const isCurrent = index === currentIndex;
                const StepIcon = step.icon;
                const ts = order[step.tsField] as string | null;
                return (
                  <div key={step.key} className="flex items-start gap-3">
                    <div className={[
                      "flex items-center justify-center w-8 h-8 rounded-full shrink-0",
                      isCompleted ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                      isCurrent ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "",
                    ].join(" ")}>
                      <StepIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 pt-1">
                      <p className={`text-sm font-medium ${isCompleted ? "text-foreground" : "text-muted-foreground"}`}>
                        {language === "th" ? step.labelTh : step.labelEn}
                      </p>
                      {ts && (
                        <p className="text-xs text-muted-foreground">{formatDate(ts)}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {(order.shipping_carrier || order.tracking_number) && (
              <div className="rounded-lg bg-muted/40 p-3 mb-4 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-primary" />
                  <span className="font-medium">{t("ข้อมูลขนส่ง", "Shipping info")}</span>
                </div>
                {order.shipping_carrier && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("ขนส่ง", "Carrier")}</span>
                    <span>{order.shipping_carrier}</span>
                  </div>
                )}
                {order.tracking_number && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("เลขพัสดุ", "Tracking #")}</span>
                    <code className="font-mono">{order.tracking_number}</code>
                  </div>
                )}
                {order.carrier_tracking_url && (
                  <Button
                    variant="outline" size="sm" className="w-full mt-2 gap-2"
                    onClick={() => window.open(order.carrier_tracking_url!, "_blank", "noopener")}
                  >
                    <ExternalLink className="h-4 w-4" />
                    {t("ติดตามกับขนส่ง", "Track with carrier")}
                  </Button>
                )}
              </div>
            )}

            {(order.status === "delivered_unconfirmed" || order.status === "out_for_delivery" || order.status === "shipped") && (
              <Button
                className="w-full gap-2" size="lg"
                onClick={confirmReceived} disabled={confirming}
              >
                {confirming ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                {t("ฉันได้รับพัสดุแล้ว", "I received my kit")}
              </Button>
            )}

            {order.status === "received_confirmed" && (
              <div className="rounded-lg bg-emerald-500/10 p-4 text-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto mb-2" />
                <p className="font-medium">{justConfirmed ? t("ขอบคุณที่ยืนยัน!", "Thank you for confirming!") : t("ยืนยันรับแล้ว", "Already confirmed")}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("เมื่อพร้อม สามารถรายงานผลในแอปได้เลย", "When ready, you can report your result in the app.")}
                </p>
                <Button asChild variant="outline" size="sm" className="mt-3">
                  <Link to="/selftest">{t("รายงานผลตรวจ", "Report result")}</Link>
                </Button>
              </div>
            )}

            <div className="mt-4 flex items-start gap-2 text-[11px] text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>
                {t(
                  "หน้านี้แสดงเฉพาะสถานะการจัดส่ง ไม่มีข้อมูลผลตรวจ • หากมีคำถาม โทร 02-632-9501",
                  "This page only shows shipment status — no test results are displayed. Questions? Call 02-632-9501",
                )}
              </span>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
