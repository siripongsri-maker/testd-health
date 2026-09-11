import { useState } from "react";
import { PageContainer } from "@/components/PageContainer";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { SEOHead } from "@/components/seo";
import { Loader2, PackageSearch, ExternalLink, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

interface TrackingRow {
  status: string;
  tracking_number: string | null;
  tracking_carrier: string | null;
  masked_name: string | null;
  requested_at: string;
  updated_at: string;
}

const STATUS_TH: Record<string, string> = {
  pending: "กำลังเตรียมจัดส่ง",
  approved: "อนุมัติแล้ว รอจัดส่ง",
  confirmed: "ยืนยันคำขอแล้ว",
  shipped: "จัดส่งแล้ว",
  delivered: "ส่งถึงแล้ว",
  received: "ผู้รับยืนยันรับแล้ว",
  result_submitted: "ส่งผลตรวจแล้ว",
  rejected: "คำขอไม่ผ่าน",
};

const STATUS_EN: Record<string, string> = {
  pending: "Preparing shipment",
  approved: "Approved, awaiting shipment",
  confirmed: "Request confirmed",
  shipped: "Shipped",
  delivered: "Delivered",
  received: "Confirmed received",
  result_submitted: "Result submitted",
  rejected: "Request rejected",
};

const THAILAND_POST_URL = "https://track.thailandpost.co.th/";

export default function KitDeliveryStatus() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const [thaiId, setThaiId] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TrackingRow | null>(null);
  const [notFound, setNotFound] = useState(false);

  const lookup = async () => {
    const id = thaiId.replace(/\D/g, "");
    const tel = phone.replace(/\D/g, "");
    if (id.length < 8 || tel.length < 9) {
      toast.error(isEn ? "Please fill in both fields correctly" : "กรุณากรอกเลขบัตรและเบอร์โทรให้ครบถ้วน");
      return;
    }

    setLoading(true);
    setResult(null);
    setNotFound(false);
    const { data, error } = await supabase.rpc("lookup_selftest_tracking", {
      p_thai_id: id,
      p_phone: tel,
    });
    setLoading(false);

    if (error) {
      console.error(error);
      toast.error(isEn ? "Lookup failed, please try again" : "ค้นหาไม่สำเร็จ กรุณาลองใหม่");
      return;
    }

    const row = (data as TrackingRow[] | null)?.[0];
    if (!row) {
      setNotFound(true);
      return;
    }
    setResult(row);
  };

  return (
    <>
      <PageContainer className="pb-24">
        <SEOHead
          title={isEn ? "Check kit delivery status" : "สอบถามสถานะการส่งชุดตรวจ"}
          description={
            isEn
              ? "Check the delivery status and tracking number of your HIV self-test kit."
              : "ตรวจสอบสถานะการจัดส่งและเลขพัสดุของชุดตรวจ HIV ด้วยตนเอง"
          }
          canonicalPath="/kit-status"
          lang={language}
        />

        <h1 className="text-xl font-bold mb-1">
          {isEn ? "Check delivery status" : "สอบถามสถานะการส่ง"}
        </h1>
        <p className="text-sm text-muted-foreground mb-4">
          {isEn
            ? "Enter the ID number and phone number you used when requesting the kit."
            : "กรอกเลขบัตรประชาชนและเบอร์โทรที่ใช้ตอนขอชุดตรวจ เพื่อดูเลขพัสดุของคุณ"}
        </p>

        <Card className="mb-4">
          <CardContent className="pt-5 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="thaiId">
                {isEn ? "ID / passport number" : "เลขบัตรประชาชน"}
              </Label>
              <Input
                id="thaiId"
                inputMode="numeric"
                autoComplete="off"
                value={thaiId}
                onChange={(e) => setThaiId(e.target.value)}
                placeholder="1234567890123"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">{isEn ? "Phone number" : "เบอร์โทรศัพท์"}</Label>
              <Input
                id="phone"
                inputMode="tel"
                autoComplete="off"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0812345678"
              />
            </div>
            <Button className="w-full" onClick={lookup} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <PackageSearch className="h-4 w-4 mr-2" />
              )}
              {isEn ? "Check status" : "ตรวจสอบสถานะ"}
            </Button>
            <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              {isEn
                ? "Your information is confidential and used only to find your shipment."
                : "🔒 ข้อมูลของคุณจะถูกเก็บเป็นความลับ ใช้เพื่อค้นหาพัสดุของคุณเท่านั้น"}
            </p>
          </CardContent>
        </Card>

        {notFound && (
          <Card className="border-amber-500/40">
            <CardContent className="pt-5 text-sm">
              {isEn
                ? "No request found with this ID and phone number. Please check the details you entered."
                : "ไม่พบคำขอที่ตรงกับเลขบัตรและเบอร์โทรนี้ กรุณาตรวจสอบข้อมูลอีกครั้ง"}
            </CardContent>
          </Card>
        )}

        {result && (
          <Card>
            <CardContent className="pt-5 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">{isEn ? "Status" : "สถานะ"}</p>
                <p className="text-base font-bold">
                  {(isEn ? STATUS_EN : STATUS_TH)[result.status] ?? result.status}
                </p>
                {result.masked_name && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isEn ? "Recipient" : "ผู้รับ"}: {result.masked_name}
                  </p>
                )}
              </div>

              {result.tracking_number ? (
                <>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {isEn ? "Tracking number" : "เลขพัสดุ"}
                    </p>
                    <p className="font-mono text-lg font-bold tracking-wide">
                      {result.tracking_number}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {isEn
                      ? "Use this number on the Thailand Post website to see where your parcel is."
                      : "นำเลขพัสดุนี้ไปตรวจสอบสถานะการจัดส่งที่เว็บไซต์ไปรษณีย์ไทย"}
                  </p>
                  <Button asChild className="w-full" variant="outline">
                    <a
                      href={THAILAND_POST_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      {isEn ? "Open Thailand Post tracking" : "เปิดเว็บไซต์ไปรษณีย์ไทย"}
                    </a>
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {isEn
                    ? "Your kit has not been shipped yet. The tracking number will appear here once it is sent."
                    : "ยังไม่มีเลขพัสดุ เจ้าหน้าที่กำลังเตรียมจัดส่ง เมื่อส่งแล้วเลขพัสดุจะแสดงที่หน้านี้"}
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </PageContainer>
      <BottomNav />
    </>
  );
}
